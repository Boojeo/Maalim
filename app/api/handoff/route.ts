import { NextResponse } from "next/server";
import { getStore } from "@/lib/data";
import { HandoffBody, findIdentifier } from "@/lib/handoff";

export const dynamic = "force-dynamic";

/**
 * Stores the summary the learner previewed and consented to. No user identifiers are stored: the row has
 * a concept, a level, a one-way question hash and the consented text. Obvious contact details are refused.
 */
export async function POST(req: Request) {
  const parsed = HandoffBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { conceptId, level, questionHash, summary } = parsed.data;
  const found = findIdentifier(summary);
  if (found) return NextResponse.json({ error: "contains_identifier", kind: found }, { status: 422 });

  const store = getStore();
  if (conceptId && !(await store.getConcept(conceptId))) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const r = await store.addReferral({ concept_id: conceptId, question_hash: questionHash, level, consented_summary: summary });
  // The short code lets the learner quote their referral later without any account or identifier.
  return NextResponse.json({ ok: true, code: r.id.slice(0, 8).toUpperCase() }, { status: 201 });
}
