import { NextResponse } from "next/server";
import { z } from "zod";
import { explain } from "@/lib/explain";

export const dynamic = "force-dynamic";

const Body = z.object({
  conceptId: z.string().min(1).max(64),
  lang: z.enum(["ar", "en"]),
  query: z.string().max(500).optional(),
});

/** retrieve -> generate -> citation guard -> cache. Only verified passages are ever retrieved. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    return NextResponse.json(await explain(parsed.data));
  } catch {
    // Never leak provider errors; the UI falls back to the verbatim sources it already has.
    return NextResponse.json({ error: "explain_failed" }, { status: 502 });
  }
}
