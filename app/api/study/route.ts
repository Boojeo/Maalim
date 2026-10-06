import { NextResponse } from "next/server";
import { z } from "zod";
import { limited } from "@/lib/api-guard";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

const Count = z.number().int().min(0).max(50);
const Body = z
  .object({
    group: z.enum(["A", "B"]),
    conceptId: z.string().min(1).max(64),
    preCorrect: Count,
    preTotal: Count.min(1),
    postCorrect: Count,
    postTotal: Count.min(1),
  })
  .refine((b) => b.preCorrect <= b.preTotal && b.postCorrect <= b.postTotal);

/** One finished study run. No identifier, no timestamp finer than a day. */
export async function POST(req: Request) {
  const tooMany = limited(req, "study", 20);
  if (tooMany) return tooMany;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const b = parsed.data;
  const store = getStore();
  if (!(await store.getConcept(b.conceptId))) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  await store.addStudyResult({
    group_code: b.group,
    concept_id: b.conceptId,
    pre_correct: b.preCorrect,
    pre_total: b.preTotal,
    post_correct: b.postCorrect,
    post_total: b.postTotal,
    day: new Date().toISOString().slice(0, 10),
  });
  return new NextResponse(null, { status: 204 });
}
