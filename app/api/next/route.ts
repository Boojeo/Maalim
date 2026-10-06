import { NextResponse } from "next/server";
import { z } from "zod";
import { limited } from "@/lib/api-guard";
import { getStore } from "@/lib/data";
import { parseProgress, recommend } from "@/lib/progress";

export const dynamic = "force-dynamic";

// Stateless: the browser sends its own local progress, the server only runs the prerequisite-graph logic and
// stores nothing. (The same pure function runs offline in the browser; this endpoint exists for other clients.)
const Body = z.object({ progress: z.unknown() });

export async function POST(req: Request) {
  const tooMany = limited(req, "next", 120);
  if (tooMany) return tooMany;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const state = parseProgress(JSON.stringify(parsed.data.progress ?? null));
  const { concepts } = await getStore().getCurriculum();
  const r = recommend(concepts, state);
  return NextResponse.json({ kind: r.kind, primary: r.primary?.id ?? null, review: r.review?.id ?? null });
}
