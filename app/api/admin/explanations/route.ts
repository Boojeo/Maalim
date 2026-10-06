import { NextResponse } from "next/server";
import { z } from "zod";
import { limited } from "@/lib/api-guard";
import { isAuthorized } from "@/lib/admin-auth";
import type { GuardedSentence } from "@/lib/citation-guard";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Generated explanations (cache entries that contain model sentences) for reviewer approval. */
export async function GET(req: Request) {
  const tooMany = limited(req, "admin", 120);
  if (tooMany) return tooMany;
  if (!isAuthorized(req, "ADMIN_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const store = getStore();
  const entries = (await store.listExplanations()).filter((e) => e.text !== "");
  const rows = await Promise.all(
    entries.map(async (e) => {
      const sentences = JSON.parse(e.text) as GuardedSentence[];
      const passages = await Promise.all(e.citations.map((c) => store.getPassage(c.passage_id)));
      return { entry: { concept_id: e.concept_id, level: e.level, lang: e.lang, query_hash: e.query_hash, status: e.status, reviewed_by: e.reviewed_by ?? null }, sentences, passages: passages.filter(Boolean) };
    }),
  );
  return NextResponse.json({ rows });
}

const Body = z.object({
  concept_id: z.string().min(1).max(64),
  level: z.enum(["L1", "L2", "L3", "L4"]),
  lang: z.enum(["ar", "en"]),
  query_hash: z.string().max(64),
  decision: z.enum(["approved", "rejected"]),
  reviewer: z.string().trim().min(2).max(100),
});

export async function POST(req: Request) {
  const tooMany = limited(req, "admin", 120);
  if (tooMany) return tooMany;
  if (!isAuthorized(req, "ADMIN_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { decision, reviewer, ...key } = parsed.data;
  const updated = await getStore().setExplanationStatus(key, decision, reviewer);
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
