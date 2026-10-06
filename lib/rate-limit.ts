// In-memory, per-instance rate limiting. The caller is represented only by a salted hash that lives in memory
// for the length of the window: nothing is stored or logged, so this does not track anyone (rule 6).
import { sha } from "./text";

interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

export function clientKey(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return sha(`${process.env.RATE_LIMIT_SALT ?? "maalim"}|${ip}`, 12);
}

export interface RateResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when !ok). */
  retryAfter: number;
}

export function rateLimit(req: Request, name: string, limit: number, windowMs = 60_000, now = Date.now()): RateResult {
  if (process.env.RATE_LIMIT_OFF === "1") return { ok: true, retryAfter: 0 };
  const key = `${name}:${clientKey(req)}`;
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
}

export function resetRateLimits() {
  buckets.clear();
}
