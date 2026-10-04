import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

const Body = z.object({
  conceptId: z.string().min(1).max(64),
  kind: z.enum(["unit_done", "check_correct", "check_wrong"]),
});

/** Opt-in anonymous counters. Only sent if the learner switched sharing on; stores no identifier and only the day. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const store = getStore();
  if (!(await store.getConcept(parsed.data.conceptId))) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  await store.addEvent({ concept_id: parsed.data.conceptId, kind: parsed.data.kind, day: new Date().toISOString().slice(0, 10) });
  return new NextResponse(null, { status: 204 });
}
