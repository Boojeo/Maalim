// Imports the passages a REVIEWER chose, fetched verbatim from the official source API, as UNVERIFIED.
// Usage: npx tsx scripts/import-from-source.ts --concept wudu --level L2 --hadeethenc 3313,8375 [--explanations]
//        npx tsx scripts/import-from-source.ts --concept quran --level L1 --quranenc english_saheeh --refs 1:1,2:2-3
import fs from "node:fs";
import path from "node:path";
import { mergePassages } from "../lib/passages-import";
import { enableEnvProxy, hadeethPassages, quranPassages } from "../lib/sources";
import type { Curriculum, Level, Passage } from "../lib/types";

const args = process.argv.slice(2);
const arg = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const dir = path.join(process.cwd(), "content");

async function main() {
  await enableEnvProxy();
  const concept = arg("--concept");
  const level = arg("--level") as Level | undefined;
  const concepts = (JSON.parse(fs.readFileSync(path.join(dir, "curriculum.json"), "utf8")) as Curriculum).concepts;
  if (!concept || !concepts.some((c) => c.id === concept)) throw new Error("--concept must be one of: " + concepts.map((c) => c.id).join(", "));
  if (!level || !["L1", "L2", "L3", "L4"].includes(level)) throw new Error("--level L1|L2|L3|L4 is required (see curriculum.json)");

  let passages: Passage[] = [];
  if (arg("--hadeethenc")) passages = await hadeethPassages(concept, level, arg("--hadeethenc")!.split(",").map((s) => s.trim()), { explanations: args.includes("--explanations") });
  else if (arg("--quranenc")) passages = await quranPassages(concept, level, arg("--quranenc")!, (arg("--refs") ?? "").split(",").filter(Boolean));
  else throw new Error("give --hadeethenc <ids> or --quranenc <translation_key> --refs <refs>");

  const file = path.join(dir, "passages.json");
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { passages: Passage[] };
  doc.passages = mergePassages(doc.passages, passages);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Imported ${passages.length} passage(s) for ${concept} as UNVERIFIED (verbatim from the source). Next: the reviewer checks them, then npm run verify:passages.`);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
