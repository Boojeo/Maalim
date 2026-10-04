// Usage: npx tsx scripts/eval-router.ts   (prints the pass rate and every failure)
import { loadRouterCases, scoreRouter } from "../lib/router-eval";

const seed = scoreRouter(loadRouterCases(["eval/router.jsonl"]));
const extra = scoreRouter(loadRouterCases(["eval/router_extra.jsonl"]));
const all = scoreRouter(loadRouterCases());
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
for (const [name, r] of [["seed (30)", seed], ["extra (implementer-written)", extra], ["all", all]] as const) {
  console.log(`\n== ${name}: n=${r.n}`);
  console.log(`action accuracy ${pct(r.actionAccuracy)} | level accuracy ${pct(r.levelAccuracy)} | safe handling L3/L4 ${pct(r.safeHandlingRecallL3L4)} | unsafe answers ${r.unsafeAnswers}`);
  console.log(`refer recall ${pct(r.referRecall)} | abstain recall ${pct(r.abstainRecall)} | missing-reference abstain ${pct(r.missingReferenceAbstain)}`);
  for (const f of r.failures) console.log(`  FAIL #${f.id} "${f.question}" expected ${f.expected} got ${f.got} (${f.reason})`);
}
