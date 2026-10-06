// Content integrity gate. Run before every production build (npm run build -> prebuild) so that
// nothing unverified can be shown by mistake (CLAUDE.md rules 2, 7, 9).
import fs from "node:fs";
import path from "node:path";
import { isPlaceholder, type Curriculum, type Item, type Passage, type ReferralFile, type Unit, type VideoEntry } from "./types";

export function checkContent(dir = path.join(process.cwd(), "content")): string[] {
  const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as T;
  const problems: string[] = [];
  const cur = read<Curriculum>("curriculum.json");
  const passages = read<{ passages: Passage[] }>("passages.json").passages;
  const items = read<{ items: Item[] }>("items.json").items;
  const units = read<{ units: Unit[] }>("units.json").units;
  const videos = read<{ videos: VideoEntry[] }>("videos.json").videos;
  const referrals = read<ReferralFile>("referrals.json");

  const ids = new Set(cur.concepts.map((c) => c.id));
  for (const c of cur.concepts) for (const r of c.prerequisites) if (!ids.has(r)) problems.push(`concept ${c.id}: unknown prerequisite ${r}`);
  // prerequisite graph must be acyclic
  const visiting = new Set<string>();
  const done = new Set<string>();
  const byId = new Map(cur.concepts.map((c) => [c.id, c]));
  const visit = (id: string) => {
    if (done.has(id)) return;
    if (visiting.has(id)) return void problems.push(`prerequisite cycle through ${id}`);
    visiting.add(id);
    for (const r of byId.get(id)?.prerequisites ?? []) visit(r);
    visiting.delete(id);
    done.add(id);
  };
  cur.concepts.forEach((c) => visit(c.id));

  const seen = new Set<string>();
  const passageById = new Map(passages.map((p) => [p.id, p]));
  for (const p of passages) {
    if (seen.has(p.id)) problems.push(`passage ${p.id}: duplicate id`);
    seen.add(p.id);
    if (!ids.has(p.concept_id)) problems.push(`passage ${p.id}: unknown concept ${p.concept_id}`);
    if (p.verified) {
      if (!p.verified_by || !p.verified_on) problems.push(`passage ${p.id}: verified=true needs verified_by and verified_on`);
      if (isPlaceholder(p.text)) problems.push(`passage ${p.id}: verified=true but text is a placeholder`);
      if (!p.source_id || p.source_id === "TODO" || !p.source_url || p.source_url === "TODO") problems.push(`passage ${p.id}: verified=true needs a real source_id and source_url`);
    }
  }
  for (const i of items) {
    if (i.status !== "approved") continue;
    if (isPlaceholder(i.prompt) || i.options.some((o) => isPlaceholder(o.text))) problems.push(`item ${i.id}: approved but contains a placeholder`);
    const p = i.source_passage_id ? passageById.get(i.source_passage_id) : undefined;
    if (!p || !p.verified) problems.push(`item ${i.id}: approved but its source passage is missing or unverified`);
  }
  for (const u of units) {
    // Placeholders in a verified unit are never displayed (the unit page hides them), but the hook must be real.
    if (u.verified && !u.reviewed_by) problems.push(`unit ${u.id}: verified=true needs reviewed_by`);
    if (u.verified && [u.hook_ar, u.hook_en].some(isPlaceholder)) problems.push(`unit ${u.id}: verified=true but the hook is a placeholder`);
  }
  for (const v of videos) {
    if (v.permission === "granted" && (!v.creator_credit || v.creator_credit.startsWith("TODO"))) problems.push(`video ${v.id}: permission granted but creator credit is missing`);
  }
  if (referrals.verified) {
    if (!referrals.reviewed_by) problems.push("referrals: verified=true needs reviewed_by");
    for (const [k, v] of Object.entries(referrals.referrals)) for (const lang of ["ar", "en"] as const) if (isPlaceholder(v[lang])) problems.push(`referrals.${k}.${lang}: verified=true but still a placeholder`);
  }
  return problems;
}
