import { timingSafeEqual } from "node:crypto";

/**
 * Token gate for reviewer / mentor pages. If the env token is set, the request must send it in
 * `x-admin-token`. If it is not set: open in development, CLOSED in production.
 */
export function isAuthorized(req: Request, envName: "ADMIN_TOKEN" | "MENTOR_TOKEN"): boolean {
  const expected = process.env[envName];
  if (!expected) return process.env.NODE_ENV !== "production";
  const got = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
