import { NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export function limited(req: Request, name: string, limit: number): NextResponse | null {
  const r = rateLimit(req, name, limit);
  if (r.ok) return null;
  return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(r.retryAfter) } });
}
