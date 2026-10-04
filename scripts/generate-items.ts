// Offline: draft practice items from verified passages. Items are saved as status "draft" and must be
// approved in /admin/review. Every item is auto-checked to be answerable from its source span.
// Usage: npx tsx scripts/generate-items.ts [--concept wudu] [--limit 5]
import { getStore } from "../lib/data";
import { generateItems } from "../lib/item-gen";
import { getLlm } from "../lib/llm";

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const store = getStore();
  const llm = getLlm();
  const passages = (await store.getPassages({ conceptId: arg("--concept"), learner: true })).slice(0, Number(arg("--limit") ?? 50));
  if (passages.length === 0) {
    console.log("No verified passages available: nothing to generate from. (Verified content is required; see STATUS.md.)");
    return;
  }
  console.log(`LLM adapter: ${llm.provider}/${llm.model}${llm.provider === "mock" ? " (extractive mock: items are structural drafts)" : ""}`);
  let total = 0;
  let bad = 0;
  for (const p of passages) {
    const { accepted, rejected } = await generateItems(p, llm);
    await store.upsertItems(accepted);
    total += accepted.length;
    bad += rejected.length;
    console.log(`${p.id}: ${accepted.length} draft item(s) saved, ${rejected.length} rejected by the answerability check`);
    for (const r of rejected) console.log(`   rejected: ${r.reason.join("; ")}`);
  }
  console.log(`done: ${total} draft items, ${bad} rejected. Review them at /admin/review.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
