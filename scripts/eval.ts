// One command: npm run eval  ->  runs the router set and the explainer checks 3x at temperature 0 and writes EVAL.md.
// Usage: npx tsx scripts/eval.ts [--runs 3]
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createLocalStore } from "../lib/data/local";
import { getEmbedder } from "../lib/embeddings";
import { estimateCost, loadExplainCases, runExplainOnce, runGuardStress, summariseExplain, summariseRouter } from "../lib/eval-harness";
import { getLlm } from "../lib/llm";
import { renderEvalMarkdown } from "../lib/eval-report";

async function main() {
  const args = process.argv.slice(2);
  const runs = Number(args.includes("--runs") ? args[args.indexOf("--runs") + 1] : 3);
  const llm = getLlm();
  const embedder = getEmbedder();

  const router = summariseRouter(runs);

  // Explainer checks run against the SYNTHETIC fixture content: the real /content has no verified passages yet.
  const fixtureStore = createLocalStore(path.join(process.cwd(), "tests/fixtures/content"));
  const cases = loadExplainCases();
  const explainRuns = [];
  for (let i = 0; i < runs; i++) explainRuns.push(await runExplainOnce(cases, { store: fixtureStore, llm, embedder }));
  const explainSummary = summariseExplain(explainRuns);

  const stress = runGuardStress(await fixtureStore.getPassages({ conceptId: "wudu", learner: true }));

  const realStore = createLocalStore(path.join(process.cwd(), "content"));
  const curriculum = await realStore.getCurriculum();
  const realPassages = await realStore.getPassages({ learner: true });
  const coverage = curriculum.concepts.map((c) => ({ id: c.id, verified: realPassages.filter((p) => p.concept_id === c.id).length }));

  let commit = "unknown";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    /* not a git checkout */
  }

  const cost = estimateCost(explainSummary.tokens, llm.provider);
  const md = renderEvalMarkdown({
    date: new Date().toISOString(),
    commit,
    node: process.version,
    runs,
    llm: { provider: llm.provider, model: llm.model },
    embedder: embedder.provider,
    router,
    explain: explainSummary,
    cost,
    coverage,
    stress,
  });
  fs.writeFileSync(path.join(process.cwd(), "EVAL.md"), md);
  fs.mkdirSync(path.join(process.cwd(), "eval", "results"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "eval", "results", "latest.json"), JSON.stringify({ router, explain: explainSummary, stress, cost, llm: { provider: llm.provider, model: llm.model }, runs }, null, 2));
  console.log(md.split("\n").slice(0, 40).join("\n"));
  console.log("\nWrote EVAL.md and eval/results/latest.json");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
