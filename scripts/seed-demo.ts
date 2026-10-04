// Loads SYNTHETIC referrals and progress counters so the mentor dashboard can be demoed.
// Everything is obviously fake (no real people, no real questions). Uses the configured store
// (local .data/ or Supabase). Usage: npx tsx scripts/seed-demo.ts
import { getStore } from "../lib/data";
import { sha } from "../lib/text";

async function main() {
  const store = getStore();
  const { concepts } = await store.getCurriculum();
  const existing = (await store.listReferrals()).filter((r) => r.consented_summary.startsWith("[SYNTHETIC DEMO]")).length;
  if (existing > 0) {
    console.log(`Synthetic demo data already present (${existing} referrals). Nothing to do.`);
    return;
  }
  const samples: { concept: string | null; level: "L3" | "L4"; text: string }[] = [
    { concept: "wudu", level: "L3", text: "Topic: Wudu. Type: topic where views may differ (L3). Question: [SYNTHETIC DEMO] a question about a detail of the steps." },
    { concept: "wudu", level: "L3", text: "Topic: Wudu. Type: topic where views may differ (L3). Question: [SYNTHETIC DEMO] another detail question." },
    { concept: "wudu", level: "L3", text: "Topic: Wudu. Type: question about a ruling (L3). Question: [SYNTHETIC DEMO] a third detail question." },
    { concept: "salah", level: "L3", text: "Topic: Salah. Type: topic where views may differ (L3). Question: [SYNTHETIC DEMO] a question about prayer while travelling." },
    { concept: null, level: "L4", text: "Type: personal situation (L4). Question: [SYNTHETIC DEMO] a personal family question." },
    { concept: null, level: "L4", text: "Type: personal situation (L4). Question: [SYNTHETIC DEMO] a personal work question." },
    { concept: "shahada", level: "L4", text: "Topic: The meaning of the shahada. Type: personal situation (L4). Question: [SYNTHETIC DEMO] a personal question." },
  ];
  for (const s of samples) {
    await store.addReferral({
      concept_id: s.concept,
      question_hash: sha(s.text),
      level: s.level,
      consented_summary: `[SYNTHETIC DEMO] ${s.text}`,
    });
  }
  const day = new Date().toISOString().slice(0, 10);
  const ids = concepts.map((c) => c.id);
  const plan: [string, "unit_done" | "check_correct" | "check_wrong", number][] = [
    [ids[0], "unit_done", 6], [ids[0], "check_correct", 5], [ids[0], "check_wrong", 1],
    [ids[1], "unit_done", 4], [ids[1], "check_correct", 3], [ids[1], "check_wrong", 2],
    [ids[4], "unit_done", 3], [ids[4], "check_correct", 4], [ids[4], "check_wrong", 3],
    [ids[5], "unit_done", 1],
  ];
  for (const [concept_id, kind, n] of plan) for (let i = 0; i < n; i++) await store.addEvent({ concept_id, kind, day });
  console.log(`Seeded ${samples.length} synthetic referrals and ${plan.reduce((a, p) => a + p[2], 0)} synthetic progress counters.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
