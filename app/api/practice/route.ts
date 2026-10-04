import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

const Query = z.object({ conceptId: z.string().max(64).optional(), lang: z.enum(["ar", "en"]).optional() });

/** Approved items only (status = approved, verified source). Generation is offline (scripts/generate-items.ts). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = Query.safeParse({
    conceptId: url.searchParams.get("conceptId") ?? undefined,
    lang: url.searchParams.get("lang") ?? undefined,
  });
  if (!q.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const items = await getStore().getItems({ conceptId: q.data.conceptId, learner: true });
  return NextResponse.json({ items: q.data.lang ? items.filter((i) => i.lang === q.data.lang) : items });
}
