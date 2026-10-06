import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized } from "@/lib/admin-auth";
import { aggregate } from "@/lib/aggregates";
import { limited } from "@/lib/api-guard";
import { getStore } from "@/lib/data";
import { summariseStudy } from "@/lib/study";

export const dynamic = "force-dynamic";

/** Mentor dashboard data: referral inbox (consented summaries only) + anonymised aggregates. */
export async function GET(req: Request) {
  const tooMany = limited(req, "mentor", 120);
  if (tooMany) return tooMany;
  if (new URL(req.url).searchParams.get("probe") === "1") return NextResponse.json({ authorized: isAuthorized(req, "MENTOR_TOKEN") });
  if (!isAuthorized(req, "MENTOR_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const store = getStore();
  const [referrals, events, curriculum, study] = await Promise.all([store.listReferrals(), store.listEvents(), store.getCurriculum(), store.listStudyResults()]);
  return NextResponse.json({
    // The inbox deliberately omits the question hash: only what the learner agreed to share.
    referrals: referrals.map(({ id, concept_id, level, consented_summary, created_at, status }) => ({
      id, concept_id, level, consented_summary, created_at, status,
    })),
    study: summariseStudy(study),
    aggregates: aggregate(referrals, events, curriculum.concepts.map((c) => c.id)),
    concepts: curriculum.concepts.map((c) => ({ id: c.id, title_ar: c.title_ar, title_en: c.title_en })),
  });
}

const Patch = z.object({ id: z.string().uuid(), status: z.enum(["new", "seen", "closed"]) });

export async function POST(req: Request) {
  const tooMany = limited(req, "mentor", 120);
  if (tooMany) return tooMany;
  if (!isAuthorized(req, "MENTOR_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  await getStore().setReferralStatus(parsed.data.id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
