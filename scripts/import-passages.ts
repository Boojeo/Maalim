// Imports passages a person copied verbatim from the source sites. Always stored as verified=false.
// Usage: npx tsx scripts/import-passages.ts content/intake/passages.csv
import fs from "node:fs";
import path from "node:path";
import { mergePassages, parseCsv, rowsToPassages } from "../lib/passages-import";
import type { Curriculum, Passage } from "../lib/types";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/import-passages.ts <file.csv>   (columns: id,concept_id,lang,source,source_id,source_url,text,level)");
  process.exit(1);
}
const dir = path.join(process.cwd(), "content");
const conceptIds = (JSON.parse(fs.readFileSync(path.join(dir, "curriculum.json"), "utf8")) as Curriculum).concepts.map((c) => c.id);
const { passages, errors } = rowsToPassages(parseCsv(fs.readFileSync(file, "utf8")), conceptIds);
if (errors.length) {
  console.error("Import refused:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
const target = path.join(dir, "passages.json");
const doc = JSON.parse(fs.readFileSync(target, "utf8")) as { passages: Passage[] };
doc.passages = mergePassages(doc.passages, passages);
fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n");
console.log(`Imported ${passages.length} passage(s) as UNVERIFIED. Next: the Sharia reviewer checks them against the source sites, then run scripts/verify-passages.ts.`);
