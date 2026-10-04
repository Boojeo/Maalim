import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Keep-alive / uptime probe. Cheap; also touches the database so a sleeping free-tier project wakes up. */
export async function GET() {
  const store = getStore();
  try {
    await store.getConcept("shahada");
    return NextResponse.json({ ok: true, store: store.kind, llm: getEnv().llmProvider });
  } catch {
    return NextResponse.json({ ok: false, store: store.kind }, { status: 503 });
  }
}
