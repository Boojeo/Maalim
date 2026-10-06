import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as next } from "@/app/api/next/route";
import { clientKey, rateLimit, resetRateLimits } from "@/lib/rate-limit";

const req = (ip: string) => new Request("http://x/y", { headers: { "x-forwarded-for": ip } });
beforeEach(() => resetRateLimits());

describe("rate limit", () => {
  it("allows up to the limit, then refuses with a retry time, per caller", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit(req("1.1.1.1"), "t", 3, 60_000, 1000).ok).toBe(true);
    const r = rateLimit(req("1.1.1.1"), "t", 3, 60_000, 1000);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
    expect(rateLimit(req("2.2.2.2"), "t", 3, 60_000, 1000).ok).toBe(true); // another caller is unaffected
  });
  it("resets after the window and never exposes the address", () => {
    for (let i = 0; i < 4; i++) rateLimit(req("1.1.1.1"), "t", 3, 1000, 0);
    expect(rateLimit(req("1.1.1.1"), "t", 3, 1000, 1001).ok).toBe(true);
    expect(clientKey(req("1.1.1.1"))).not.toContain("1.1.1.1");
  });
  it("API routes answer 429 when flooded", async () => {
    const { POST } = await import("@/app/api/handoff/route");
    const call = () => POST(new Request("http://x/api/handoff", { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: "{}" }));
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push((await call()).status);
    expect(codes.slice(0, 6).every((c) => c === 400)).toBe(true);
    expect(codes.slice(6)).toEqual([429, 429]);
  });
});

describe("/api/next", () => {
  beforeEach(() => { process.env.FUTURE_CONCEPTS = ""; }); // test the prerequisite graph itself, not the launch scope
  afterEach(() => { delete process.env.FUTURE_CONCEPTS; });
  const call = (progress: unknown) => next(new Request("http://x/api/next", { method: "POST", body: JSON.stringify({ progress }) }));
  it("recommends from the prerequisite graph and stores nothing", async () => {
    expect(await (await call(null)).json()).toEqual({ kind: "next", primary: "shahada", review: null });
    const p = { version: 1, stage: 0, concepts: { shahada: { started: true, done: true, attempts: 2, correct: 0, updatedAt: null } } };
    expect(await (await call(p)).json()).toMatchObject({ primary: "tawhid", review: "shahada" });
  });
  it("tolerates garbage and rejects a missing body", async () => {
    expect((await call("garbage")).status).toBe(200);
    expect((await next(new Request("http://x/api/next", { method: "POST", body: "nope" }))).status).toBe(400);
  });
});
