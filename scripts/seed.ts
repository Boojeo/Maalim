// Loads /content/*.json into Supabase. Without credentials it does nothing (local JSON fallback is used).
// Usage: npx tsx scripts/seed.ts   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Curriculum, Item, Passage, Unit, VideoEntry } from "../lib/types";

const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", f), "utf8")) as T;

export function buildRows() {
  const cur = read<Curriculum>("curriculum.json");
  const passages = read<{ passages: Passage[] }>("passages.json").passages;
  const videos = read<{ videos: VideoEntry[] }>("videos.json").videos;
  const units = read<{ units: Unit[] }>("units.json").units;
  const items = read<{ items: Item[] }>("items.json").items;

  return {
    concepts: cur.concepts.map((c) => ({
      id: c.id,
      slug: c.id,
      title_ar: c.title_ar,
      title_en: c.title_en,
      level: c.level,
      ord: c.order,
      objectives_en: c.objectives_en,
      reviewed_by: c.reviewed_by,
    })),
    prerequisites: cur.concepts.flatMap((c) => c.prerequisites.map((r) => ({ concept_id: c.id, requires_id: r }))),
    passages: passages.map((p) => ({ ...p })),
    videos: videos.map((v) => ({
      id: v.id,
      concept_id: v.concept_id,
      kind: v.kind,
      title_ar: v.title_ar,
      url: null,
      permission: v.permission,
      creator_credit: v.creator_credit,
      timestamps_verified: v.timestamps_verified,
      steps: v.steps,
    })),
    units: units.map((u) => ({
      id: u.id,
      concept_id: u.concept_id,
      hook_ar: u.hook_ar,
      hook_en: u.hook_en,
      steps: { video_ids: u.video_ids },
      check_item_id: u.check_item_id,
      misconception_ar: u.misconception_ar,
      misconception_en: u.misconception_en,
      ord: u.order,
      verified: u.verified,
      reviewed_by: u.reviewed_by,
    })),
    items: items.map((i) => ({ ...i })),
  };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rows = buildRows();
  if (!url || !key) {
    console.log(
      `Supabase not configured: nothing seeded. Local JSON fallback is used. (Would load ${rows.concepts.length} concepts, ${rows.passages.length} passages, ${rows.items.length} items.)`,
    );
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const order: (keyof typeof rows)[] = ["concepts", "prerequisites", "passages", "videos", "units", "items"];
  for (const table of order) {
    const { error } = await db.from(table).upsert(rows[table] as never[]);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`seeded ${table}: ${rows[table].length}`);
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
