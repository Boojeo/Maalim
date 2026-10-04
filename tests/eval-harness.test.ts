import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalStore } from "@/lib/data/local";
import { mockEmbedder } from "@/lib/embeddings";
import { estimateCost, loadExplainCases, runExplainOnce, runGuardStress, summariseExplain, summariseRouter } from "@/lib/eval-harness";
import { renderEvalMarkdown } from "@/lib/eval-report";
import { mockLlm } from "@/lib/llm";

const fixture = createLocalStore(path.join(process.cwd(), "tests/fixtures/content"));

describe("eval harness", () => {
  it("router summary is deterministic across runs and flags the first-version miss rate", () => {
    const r = summariseRouter(3);
    expect(r.decisionAgreement).toBe(1);
    expect(r.firstVersionMisses).toEqual({ wrong: 5, total: 25 });
    expect(r.subsets.find((s) => s.name === "all")!.runs).toHaveLength(3);
  });
  it("explainer summary: 3 runs, no unverified leaks, no model call without verified passages", async () => {
    const cases = loadExplainCases();
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await runExplainOnce(cases, { store: fixture, llm: mockLlm, embedder: mockEmbedder }));
    const s = summariseExplain(runs);
    expect(s.runs).toBe(3);
    expect(s.unverifiedLeaks).toBe(0);
    expect(s.modelCallsWhenNothingVerified).toBe(0);
    expect(s.citationCoverage).toBe(1);
    expect(s.textAgreement).toBe(1);
    expect(s.failures).toEqual([]);
  });
  it("guard stress: every injected bad sentence is dropped (tuned regression set)", async () => {
    const st = runGuardStress(await fixture.getPassages({ conceptId: "wudu", learner: true }));
    expect(st.falseAccepts).toEqual([]);
    expect(st.total).toBeGreaterThanOrEqual(13);
  });
  it("cost: zero for mock, null without prices for a real adapter", () => {
    expect(estimateCost({ input: 1000, output: 1000 }, "mock").usd).toBe(0);
    delete process.env.LLM_PRICE_IN_PER_MTOK;
    delete process.env.LLM_PRICE_OUT_PER_MTOK;
    expect(estimateCost({ input: 1000, output: 1000 }, "hosted").usd).toBeNull();
    process.env.LLM_PRICE_IN_PER_MTOK = "3";
    process.env.LLM_PRICE_OUT_PER_MTOK = "15";
    expect(estimateCost({ input: 1_000_000, output: 1_000_000 }, "hosted").usd).toBe(18);
    delete process.env.LLM_PRICE_IN_PER_MTOK;
    delete process.env.LLM_PRICE_OUT_PER_MTOK;
  });
  it("report states the adapters and the caveats", async () => {
    const runs = [await runExplainOnce(loadExplainCases(), { store: fixture, llm: mockLlm, embedder: mockEmbedder })];
    const md = renderEvalMarkdown({
      date: "d", commit: "c", node: "n", runs: 1, llm: { provider: "mock", model: "m" }, embedder: "mock",
      router: summariseRouter(1), explain: summariseExplain(runs), cost: { usd: 0, note: "x" },
      coverage: [{ id: "wudu", verified: 0 }], stress: runGuardStress(await fixture.getPassages({ conceptId: "wudu", learner: true })),
    });
    expect(md).toContain("mock adapters");
    expect(md).toContain("drafts without a Sharia reviewer");
    expect(md).toContain("No concept has verified content yet");
    expect(md).toContain("Citation coverage");
  });
});
