// Run ONLY by (or on behalf of) the named Sharia reviewer, after checking the text against the source site.
// Usage: npx tsx scripts/verify-passages.ts --by "Reviewer Name" --ids wudu-001,wudu-002
//        npx tsx scripts/verify-passages.ts --by "Reviewer Name" --all
import fs from "node:fs";
import path from "node:path";
import { verifyPassages } from "../lib/passages-import";
import type { Passage } from "../lib/types";

const args = process.argv.slice(2);
const arg = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const by = arg("--by") ?? "";
const ids = args.includes("--all") ? "all" : (arg("--ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
if (ids !== "all" && ids.length === 0) {
  console.error('Usage: --by "Reviewer Name" (--ids a,b | --all)');
  process.exit(1);
}
const target = path.join(process.cwd(), "content", "passages.json");
const doc = JSON.parse(fs.readFileSync(target, "utf8")) as { passages: Passage[] };
const { passages, errors } = verifyPassages(doc.passages, ids, by, new Date().toISOString().slice(0, 10));
if (errors.length) {
  console.error("Not verified:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
doc.passages = passages;
fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n");
console.log(`Marked verified by ${by}: ${ids === "all" ? "all passages" : ids.join(", ")}.`);
