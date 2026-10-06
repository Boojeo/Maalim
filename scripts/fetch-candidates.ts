// Lists candidate hadith for a concept from HadeethEnc, in the site's own order, with Arabic and English text copied
// verbatim. Output: content/intake/candidates/<concept>.json (a menu for the Sharia reviewer; NOT passages).
// Usage: npx tsx scripts/fetch-candidates.ts --list-categories "ablution|prayer"
//        npx tsx scripts/fetch-candidates.ts --concept wudu [--categories 444,441] [--limit 15]
//        npx tsx scripts/fetch-candidates.ts --all
import fs from "node:fs";
import path from "node:path";
import { enableEnvProxy, fetchCandidates, listCategories } from "../lib/sources";

const args = process.argv.slice(2);
const arg = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const dir = path.join(process.cwd(), "content", "intake");

async function one(concept: string, categories: string[], limit: number) {
  const c = await fetchCandidates(concept, categories, limit, undefined, 150);
  fs.mkdirSync(path.join(dir, "candidates"), { recursive: true });
  fs.writeFileSync(path.join(dir, "candidates", `${concept}.json`), JSON.stringify(c, null, 2) + "\n");
  console.log(`${concept}: ${c.length} candidates from categories ${categories.join(",")}`);
}

async function main() {
  await enableEnvProxy();
  if (args.includes("--list-categories")) {
    const re = new RegExp(arg("--list-categories") ?? ".", "i");
    for (const c of await listCategories()) if (re.test(c.title)) console.log(`${c.id}\t${c.hadeeths_count}\t${c.title}`);
    return;
  }
  const map = JSON.parse(fs.readFileSync(path.join(dir, "source-categories.json"), "utf8")) as Record<string, number[] | string>;
  const limit = Number(arg("--limit") ?? 15);
  if (args.includes("--all")) {
    for (const [concept, cats] of Object.entries(map)) if (Array.isArray(cats)) await one(concept, cats.map(String), limit);
    return;
  }
  const concept = arg("--concept");
  if (!concept) throw new Error("--concept <id> or --all or --list-categories <regex>");
  const cats = (arg("--categories")?.split(",") ?? (map[concept] as number[] | undefined)?.map(String)) ?? [];
  if (cats.length === 0) throw new Error(`no categories for ${concept}`);
  await one(concept, cats, limit);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
