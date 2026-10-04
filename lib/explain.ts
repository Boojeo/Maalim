// F3: retrieve -> generate -> citation guard -> cache.
import fs from "node:fs";
import path from "node:path";
import { guard, type GuardedSentence } from "./citation-guard";
import { getStore, type DataStore } from "./data";
import { getLlm, type LlmClient } from "./llm";
import { retrieve, type RetrieveDeps } from "./retrieval";
import { sha } from "./text";
import type { Citation, Lang, Passage } from "./types";

export const EXPLAIN_PROMPT_VERSION = "explain.v1";
/** Bump when guard/splitter logic changes so stale cache entries are not reused. */
export const PIPELINE_VERSION = "guard.v2";

export type ExplainMode = "generated" | "verbatim" | "none";

export interface ExplainResult {
  mode: ExplainMode;
  conceptId: string;
  lang: Lang;
  /** Sentences with the passage ids they cite (mode "generated"). */
  sentences: GuardedSentence[];
  /** The passages cited or shown, verbatim, keyed by id. Always verified, learner-safe passages. */
  passages: Passage[];
  droppedCount: number;
  /** Sentences the model produced before the guard (0 on a cache hit or when the model was not called). */
  rawSentences: number;
  /** How many of those the guard kept (before the "fewer than 2 survive" fallback). */
  keptSentences: number;
  cached: boolean;
  llm: { provider: string; model: string; inputTokens: number; outputTokens: number; latencyMs: number } | null;
  latencyMs: number;
}

export interface ExplainDeps extends RetrieveDeps {
  store?: DataStore;
  llm?: LlmClient;
}

export function loadPrompt(version = EXPLAIN_PROMPT_VERSION): string {
  const raw = fs.readFileSync(path.join(process.cwd(), "prompts", `${version}.md`), "utf8");
  return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
}

export function buildUserPrompt(topic: string, passages: Passage[]): string {
  return `Topic: ${topic}\n\nPassages:\n${passages.map((p, i) => `[${i + 1}] (id: ${p.id}) ${p.text}`).join("\n")}\n`;
}

const toCitation = (p: Passage): Citation => ({
  passage_id: p.id,
  source: p.source,
  source_id: p.source_id,
  source_url: p.source_url,
});

export async function explain(
  input: { conceptId: string; lang: Lang; query?: string; fallbackToConcept?: boolean },
  deps: ExplainDeps = {},
): Promise<ExplainResult> {
  const t0 = performance.now();
  const store = deps.store ?? getStore();
  const query = (input.query ?? "").trim();
  const concept = await store.getConcept(input.conceptId);
  const empty = (): ExplainResult => ({
    mode: "none", conceptId: input.conceptId, lang: input.lang, sentences: [], passages: [], droppedCount: 0, rawSentences: 0, keptSentences: 0,
    cached: false, llm: null, latencyMs: performance.now() - t0,
  });
  if (!concept) return empty();

  let retrieved = await retrieve(input.conceptId, query, input.lang, { k: 4 }, { store, embedder: deps.embedder });
  // Ask flow: the router already matched this concept, so if the specific wording finds nothing,
  // fall back to the concept's own verified passages (still guarded, still cited).
  let topicQuery = query;
  if (retrieved.length === 0 && query && input.fallbackToConcept) {
    retrieved = await retrieve(input.conceptId, "", input.lang, { k: 4 }, { store, embedder: deps.embedder });
    topicQuery = "";
  }
  if (retrieved.length === 0) return empty(); // nothing verified to say: never call the model

  const passages = retrieved.map((r) => r.passage);
  const outLang = passages[0].lang;
  const topic = topicQuery || (outLang === "ar" ? concept.title_ar : concept.title_en);

  // Cache key covers prompt version + exact passage texts, so edits to sources invalidate it.
  const query_hash = sha([EXPLAIN_PROMPT_VERSION, PIPELINE_VERSION, topicQuery, ...passages.map((p) => `${p.id}:${sha(p.text)}`)].join("|"));
  const key = { concept_id: concept.id, level: concept.level, lang: outLang, query_hash };
  const hit = await store.getCachedExplanation(key);
  const byId = new Map(passages.map((p) => [p.id, p]));
  if (hit) {
    const cachedIds = hit.citations.map((c) => c.passage_id);
    const shown = cachedIds.map((id) => byId.get(id)).filter((p): p is Passage => !!p);
    if (hit.text === "") {
      return { mode: "verbatim", conceptId: concept.id, lang: outLang, sentences: [], passages, droppedCount: 0, rawSentences: 0, keptSentences: 0, cached: true, llm: null, latencyMs: performance.now() - t0 };
    }
    const sentences: GuardedSentence[] = JSON.parse(hit.text) as GuardedSentence[];
    if (sentences.every((s) => s.passageIds.every((id) => byId.has(id)))) {
      return { mode: "generated", conceptId: concept.id, lang: outLang, sentences, passages: shown.length ? shown : passages, droppedCount: 0, rawSentences: 0, keptSentences: 0, cached: true, llm: null, latencyMs: performance.now() - t0 };
    }
  }

  const llm = deps.llm ?? getLlm();
  const res = await llm.generate({ system: loadPrompt(), user: buildUserPrompt(topic, passages), maxTokens: 500 });
  const g = guard(res.text, passages.map((p, i) => ({ n: i + 1, id: p.id, text: p.text })));
  const llmInfo = { provider: res.provider, model: res.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: res.latencyMs };

  if (g.fallbackToVerbatim) {
    await store.putCachedExplanation({
      concept_id: concept.id, level: concept.level, lang: outLang, query_hash, text: "",
      citations: passages.map(toCitation), status: "pending", created_at: new Date().toISOString(),
    });
    return { mode: "verbatim", conceptId: concept.id, lang: outLang, sentences: [], passages, droppedCount: g.dropped.length, rawSentences: g.sentences.length + g.dropped.length, keptSentences: g.sentences.length, cached: false, llm: llmInfo, latencyMs: performance.now() - t0 };
  }

  const citedIds = [...new Set(g.sentences.flatMap((s) => s.passageIds))];
  const cited = citedIds.map((id) => byId.get(id)!).filter(Boolean);
  await store.putCachedExplanation({
    concept_id: concept.id, level: concept.level, lang: outLang, query_hash, text: JSON.stringify(g.sentences),
    citations: cited.map(toCitation), status: "pending", created_at: new Date().toISOString(),
  });
  return { mode: "generated", conceptId: concept.id, lang: outLang, sentences: g.sentences, passages: cited, droppedCount: g.dropped.length, rawSentences: g.sentences.length + g.dropped.length, keptSentences: g.sentences.length, cached: false, llm: llmInfo, latencyMs: performance.now() - t0 };
}
