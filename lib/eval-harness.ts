// F8 eval harness core: runs the router set and the explainer checks N times at temperature 0 and
// summarises accuracy, citation coverage, refer/abstain precision/recall, variance, latency and cost.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MIN_OVERLAP, overlap } from "./citation-guard";
import type { DataStore } from "./data";
import type { Embedder } from "./embeddings";
import { explain, type ExplainResult } from "./explain";
import type { LlmClient } from "./llm";
import { routeQuestion, type RouteDecision } from "./router";
import { loadRouterCases, scoreRouter, type RouterCase, type RouterReport } from "./router-eval";
import type { Lang } from "./types";

export interface ExplainCase {
  id: number;
  concept_id: string;
  lang: Lang;
  query?: string;
  fallbackToConcept?: boolean;
  expect_mode: ExplainResult["mode"];
  note: string;
}

export function loadExplainCases(file = "eval/explain.jsonl"): ExplainCase[] {
  return fs
    .readFileSync(path.join(process.cwd(), file), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ExplainCase);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const range = (xs: number[]) => (xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0]);

// ---- router ---------------------------------------------------------------------------------

export interface RouterRun {
  report: RouterReport;
  decisions: RouteDecision[];
  meanLatencyMs: number;
}

export function runRouterOnce(cases: RouterCase[]): RouterRun {
  const decisions: RouteDecision[] = [];
  const times: number[] = [];
  const report = scoreRouter(cases, (q) => {
    const t0 = performance.now();
    const d = routeQuestion(q);
    times.push(performance.now() - t0);
    decisions.push(d);
    return d;
  });
  return { report, decisions, meanLatencyMs: mean(times) };
}

export interface RouterSummary {
  subsets: { name: string; n: number; runs: RouterReport[] }[];
  /** Share of cases whose (action, level) was identical in every run. */
  decisionAgreement: number;
  meanLatencyMs: number;
  firstVersionMisses: { wrong: number; total: number };
  byCategory: { category: string; n: number; correct: number }[];
}

export function summariseRouter(runs: number): RouterSummary {
  const all = loadRouterCases();
  const subsetDefs: [string, (c: RouterCase & { first_version_wrong?: boolean }) => boolean][] = [
    ["seed (30, from the starter pack)", (c) => c.id <= 30],
    ["extra (implementer-written, ids 101-136)", (c) => c.id >= 101 && c.id < 200],
    ["unseen probes (implementer, ids 201+)", (c) => c.id >= 200],
    ["all", () => true],
  ];
  const runResults = Array.from({ length: runs }, () => runRouterOnce(all));
  const subsets = subsetDefs.map(([name, f]) => {
    const cs = all.filter(f);
    return { name, n: cs.length, runs: Array.from({ length: runs }, () => scoreRouter(cs)) };
  });
  const agreement =
    all.filter((_, i) => runResults.every((r) => r.decisions[i].action === runResults[0].decisions[i].action && r.decisions[i].level === runResults[0].decisions[i].level)).length / all.length;
  const probes = all.filter((c) => c.id >= 200) as (RouterCase & { first_version_wrong?: boolean })[];
  const cats = new Map<string, { n: number; correct: number }>();
  all.forEach((c, i) => {
    const e = cats.get(c.category) ?? { n: 0, correct: 0 };
    e.n++;
    if (runResults[0].decisions[i].action === c.expected_action) e.correct++;
    cats.set(c.category, e);
  });
  return {
    subsets,
    decisionAgreement: agreement,
    meanLatencyMs: mean(runResults.map((r) => r.meanLatencyMs)),
    firstVersionMisses: { wrong: probes.filter((p) => p.first_version_wrong).length, total: probes.length },
    byCategory: [...cats.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => a.category.localeCompare(b.category)),
  };
}

// ---- explainer ------------------------------------------------------------------------------

export interface ExplainRunCase {
  c: ExplainCase;
  result: ExplainResult;
  text: string; // final text shown (for variance)
  modeOk: boolean;
  /** Displayed sentences that carry >= 1 citation to a verified passage and are lexically supported. */
  sentencesCited: number;
  sentencesShown: number;
  unverifiedLeak: boolean;
}

export async function runExplainOnce(
  cases: ExplainCase[],
  deps: { store: DataStore; llm: LlmClient; embedder: Embedder },
): Promise<ExplainRunCase[]> {
  // A fresh runtime dir per run so the explanation cache cannot hide model calls (latency, cost, variance).
  process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-eval-"));
  const out: ExplainRunCase[] = [];
  for (const c of cases) {
    const result = await explain({ conceptId: c.concept_id, lang: c.lang, query: c.query, fallbackToConcept: c.fallbackToConcept }, deps);
    const byId = new Map(result.passages.map((p) => [p.id, p]));
    const cited = result.sentences.filter(
      (s) => s.passageIds.length > 0 && s.passageIds.every((id) => byId.has(id)) && overlap(s.text, s.passageIds.map((id) => byId.get(id)!.text)) >= MIN_OVERLAP,
    ).length;
    out.push({
      c,
      result,
      text: result.mode === "generated" ? result.sentences.map((s) => s.text).join(" ") : result.mode === "verbatim" ? result.passages.map((p) => p.text).join(" ") : "",
      modeOk: result.mode === c.expect_mode,
      sentencesCited: cited,
      sentencesShown: result.sentences.length,
      unverifiedLeak: result.passages.some((p) => !p.verified),
    });
  }
  return out;
}

export interface ExplainSummary {
  runs: number;
  n: number;
  modeAccuracy: { mean: number; min: number; max: number };
  /** Of sentences that reached the learner, the share with a valid, supported citation. */
  citationCoverage: number;
  /** Of sentences the model wrote, the share the guard kept (1 = the model never wrote an unsupported sentence). */
  rawSupportRate: number | null;
  verbatimFallbackRate: number;
  unverifiedLeaks: number;
  modelCallsWhenNothingVerified: number;
  textAgreement: number;
  modeAgreement: number;
  meanLatencyMs: number;
  meanLlmLatencyMs: number | null;
  tokens: { input: number; output: number };
  failures: { run: number; id: number; expected: string; got: string; note: string }[];
}

export function summariseExplain(runs: ExplainRunCase[][]): ExplainSummary {
  const first = runs[0];
  const flat = runs.flat();
  const accs = runs.map((r) => r.filter((x) => x.modeOk).length / r.length);
  const shown = flat.reduce((a, x) => a + x.sentencesShown, 0);
  const cited = flat.reduce((a, x) => a + x.sentencesCited, 0);
  const raw = flat.reduce((a, x) => a + x.result.rawSentences, 0);
  const kept = flat.reduce((a, x) => a + x.result.keptSentences, 0);
  const llmCalls = flat.filter((x) => x.result.llm);
  const [lo, hi] = range(accs);
  return {
    runs: runs.length,
    n: first.length,
    modeAccuracy: { mean: mean(accs), min: lo, max: hi },
    citationCoverage: shown === 0 ? 1 : cited / shown,
    rawSupportRate: raw === 0 ? null : kept / raw,
    verbatimFallbackRate: flat.filter((x) => x.result.mode === "verbatim").length / flat.length,
    unverifiedLeaks: flat.filter((x) => x.unverifiedLeak).length,
    modelCallsWhenNothingVerified: flat.filter((x) => x.result.mode === "none" && x.result.llm).length,
    textAgreement: first.filter((_, i) => runs.every((r) => r[i].text === first[i].text)).length / first.length,
    modeAgreement: first.filter((_, i) => runs.every((r) => r[i].result.mode === first[i].result.mode)).length / first.length,
    meanLatencyMs: mean(flat.map((x) => x.result.latencyMs)),
    meanLlmLatencyMs: llmCalls.length ? mean(llmCalls.map((x) => x.result.llm!.latencyMs)) : null,
    tokens: {
      input: llmCalls.reduce((a, x) => a + x.result.llm!.inputTokens, 0) / runs.length,
      output: llmCalls.reduce((a, x) => a + x.result.llm!.outputTokens, 0) / runs.length,
    },
    failures: runs.flatMap((r, ri) => r.filter((x) => !x.modeOk).map((x) => ({ run: ri + 1, id: x.c.id, expected: x.c.expect_mode, got: x.result.mode, note: x.c.note }))),
  };
}

// ---- cost -----------------------------------------------------------------------------------

export function estimateCost(tokens: { input: number; output: number }, provider: string): { usd: number | null; note: string } {
  const pin = Number(process.env.LLM_PRICE_IN_PER_MTOK);
  const pout = Number(process.env.LLM_PRICE_OUT_PER_MTOK);
  if (provider === "mock") return { usd: 0, note: "mock adapter: no model cost (token counts are character-based estimates)" };
  if (!Number.isFinite(pin) || !Number.isFinite(pout) || (!pin && !pout)) return { usd: null, note: "set LLM_PRICE_IN_PER_MTOK and LLM_PRICE_OUT_PER_MTOK to estimate cost" };
  return { usd: (tokens.input * pin + tokens.output * pout) / 1e6, note: "tokens x configured prices" };
}

// ---- guard stress test -----------------------------------------------------------------------
// Feeds the citation guard deliberately bad "model output" built from the synthetic fixture passages
// and counts how many bad sentences are (wrongly) accepted. Independent of any model.
import { guard, type GuardPassage } from "./citation-guard";

export interface StressCase {
  fault: "no-citation" | "invalid-citation" | "invented" | "wrong-passage" | "subtle-addition";
  text: string; // includes the [n] marker as a model would write it
}

export const STRESS_CASES: StressCase[] = [
  { fault: "no-citation", text: "The sample procedure has three parts." },
  { fault: "no-citation", text: "Each part of the sample procedure is repeated twice before moving on." },
  { fault: "invalid-citation", text: "The sample procedure has three parts [9]." },
  { fault: "invalid-citation", text: "Each part is repeated twice [0]." },
  { fault: "invented", text: "Purple elephants always dance during winter evenings [1]." },
  { fault: "invented", text: "The procedure must be performed exactly seven times each day [1]." },
  { fault: "invented", text: "Experts unanimously agree that the final stage is optional [2]." },
  { fault: "invented", text: "You should consult your neighbour before beginning [3]." },
  { fault: "wrong-passage", text: "Part A comes first and part B comes second [3]." },
  { fault: "wrong-passage", text: "The sample note applies only to the synthetic fixture [1]." },
  { fault: "subtle-addition", text: "The sample procedure has three parts and requires cold water [1]." },
  { fault: "subtle-addition", text: "The sample procedure has three parts, and part D comes fourth [1]." },
  { fault: "subtle-addition", text: "Each part of the sample procedure is repeated twice daily before moving on [2]." },
];

export interface StressSummary {
  total: number;
  dropped: number;
  falseAccepts: StressCase[];
  byFault: { fault: string; total: number; dropped: number }[];
}

export function runGuardStress(passages: { id: string; text: string }[]): StressSummary {
  const gp: GuardPassage[] = passages.map((p, i) => ({ n: i + 1, id: p.id, text: p.text }));
  const accepted = (c: StressCase) => guard(c.text, gp).sentences.length > 0;
  const falseAccepts = STRESS_CASES.filter(accepted);
  const faults = [...new Set(STRESS_CASES.map((c) => c.fault))];
  return {
    total: STRESS_CASES.length,
    dropped: STRESS_CASES.length - falseAccepts.length,
    falseAccepts,
    byFault: faults.map((f) => {
      const cs = STRESS_CASES.filter((c) => c.fault === f);
      return { fault: f, total: cs.length, dropped: cs.filter((c) => !accepted(c)).length };
    }),
  };
}
