// Run ONLY by (or on behalf of) the named Sharia reviewer after reading the wording.
// Usage: npx tsx scripts/verify-content.ts units --by "Name" [--ids unit-wudu,unit-salah]   (default: all units)
//        npx tsx scripts/verify-content.ts referrals --by "Name"
import fs from "node:fs";
import path from "node:path";
import { isPlaceholder } from "../lib/types";

const [kind, ...rest] = process.argv.slice(2);
const arg = (n: string) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : undefined);
const by = (arg("--by") ?? "").trim();
const fail = (m: string): never => {
  console.error(m);
  process.exit(1);
};
if (by.length < 2) fail('--by "Reviewer Name" is required');
const dir = path.join(process.cwd(), "content");

if (kind === "units") {
  const file = path.join(dir, "units.json");
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { units: { id: string; hook_ar: string; hook_en: string; verified: boolean; reviewed_by: string | null }[] };
  const ids = arg("--ids")?.split(",").map((s) => s.trim());
  for (const u of doc.units) {
    if (ids && !ids.includes(u.id)) continue;
    if (isPlaceholder(u.hook_ar) || isPlaceholder(u.hook_en)) fail(`${u.id}: the hook is still a placeholder`);
    u.verified = true;
    u.reviewed_by = by;
  }
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Units verified by ${by}: ${ids?.join(", ") ?? "all"}. (Misconception/fix text that is still a placeholder stays hidden from learners.)`);
} else if (kind === "referrals") {
  const file = path.join(dir, "referrals.json");
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { verified: boolean; reviewed_by: string | null; referrals: Record<string, Record<string, string>> };
  for (const [k, v] of Object.entries(doc.referrals)) for (const lang of ["ar", "en"]) if (isPlaceholder(v[lang])) fail(`referrals.${k}.${lang} is still a placeholder`);
  doc.verified = true;
  doc.reviewed_by = by;
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Referral wording verified by ${by}.`);
} else fail("Usage: verify-content.ts <units|referrals> --by \"Name\" [--ids a,b]");
