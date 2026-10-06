import { NextResponse } from "next/server";
import { z } from "zod";
import { limited } from "@/lib/api-guard";
import { getStore } from "@/lib/data";
import { retrieve } from "@/lib/retrieval";
import { routeQuestion } from "@/lib/router";
import { isPlaceholder } from "@/lib/types";
import { sha } from "@/lib/text";

export const dynamic = "force-dynamic";

// Only the question text (and the UI language for the reply) is read. Anything else in the body is ignored:
// the router classifies the question, never the person.
const Body = z.object({ question: z.string().min(1).max(500), lang: z.enum(["ar", "en"]) });

export async function POST(req: Request) {
  const tooMany = limited(req, "route", 60);
  if (tooMany) return tooMany;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { question, lang } = parsed.data;

  const decision = routeQuestion(question);
  let answerable: boolean | null = null;
  if (decision.action === "answer") {
    answerable = decision.conceptId ? (await retrieve(decision.conceptId, "", lang)).length > 0 : false; // concept-level: verified passages exist
  }

  let referralText: string | null = null;
  if (decision.handoff) {
    const texts = await getStore().getReferralTexts();
    const t = (decision.urgent ? texts.crisis : decision.level === "L3" ? texts.L3 : decision.reason === "no-reference" ? texts.out_of_scope : texts.L4)[lang];
    referralText = t && !isPlaceholder(t) ? t : null; // placeholders never reach the learner
  }

  return NextResponse.json({ ...decision, answerable, referralText, questionHash: sha(question.trim().toLowerCase()) });
}
