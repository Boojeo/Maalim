import { describe, expect, it } from "vitest";
import { aggregate, safeCount } from "@/lib/aggregates";
import { findIdentifier } from "@/lib/handoff";
import { createLocalStore } from "@/lib/data/local";
import { emptyProgress, markDone, markStarted, mastery, recommend, recordAttempt, weakConcepts } from "@/lib/progress";
import type { Referral } from "@/lib/types";

describe("F6 mastery and next step", async () => {
  const { concepts } = await createLocalStore().getCurriculum();

  it("mastery needs evidence; weak = below 60% after >= 2 attempts", () => {
    let s = recordAttempt(emptyProgress(), "wudu", false);
    expect(mastery(s, "wudu")).toBeNull();
    s = recordAttempt(s, "wudu", true);
    expect(mastery(s, "wudu")).toBe(0.5);
    s = markDone(s, "wudu");
    expect(weakConcepts(concepts, s).map((c) => c.id)).toEqual(["wudu"]);
  });
  it("recommends continue > next unlocked > locked-next > done, respecting prerequisites", () => {
    let s = emptyProgress();
    expect(recommend(concepts, s)).toMatchObject({ kind: "next", primary: { id: "shahada" } });
    s = markStarted(s, "shahada");
    expect(recommend(concepts, s)).toMatchObject({ kind: "continue", primary: { id: "shahada" } });
    s = markDone(s, "shahada");
    expect(recommend(concepts, s).primary?.id).toBe("tawhid"); // quran is also open; order decides
    // a started-but-locked concept is not "continue" (prerequisites first)
    const locked = markStarted(emptyProgress(), "salah");
    expect(recommend(concepts, locked)).toMatchObject({ kind: "next", primary: { id: "shahada" } });
    for (const id of ["tawhid", "quran", "five-pillars", "wudu", "salah"]) s = markDone(s, id);
    expect(recommend(concepts, s)).toMatchObject({ kind: "done", primary: null });
  });
  it("suggests a review of a weak finished concept without blocking the next unit", () => {
    let s = markDone(emptyProgress(), "shahada");
    s = recordAttempt(recordAttempt(s, "shahada", false), "shahada", false);
    const r = recommend(concepts, s);
    expect(r.review?.id).toBe("shahada");
    expect(r.primary?.id).toBe("tawhid");
  });
});

describe("F7 anonymity", () => {
  it("refuses emails, phone numbers and links in a consented summary", () => {
    expect(findIdentifier("write to me at a.b@example.com")).toBe("email");
    expect(findIdentifier("call +966 50 123 4567")).toBe("phone");
    expect(findIdentifier("see https://example.com/me")).toBe("url");
    expect(findIdentifier("Topic: wudu. A question about my family.")).toBeNull();
  });
  it("aggregates suppress counts below 3 and never expose per-referral data", () => {
    expect(safeCount(0)).toBe(0);
    expect(safeCount(2)).toBeNull();
    expect(safeCount(3)).toBe(3);
    const mk = (i: number, level: Referral["level"], concept: string | null): Referral => ({
      id: String(i), concept_id: concept, question_hash: "h", level, consented_summary: "SECRET TEXT", created_at: "2026-10-05T10:00:00Z", status: "new",
    });
    const refs = [mk(1, "L4", "wudu"), mk(2, "L4", "wudu"), mk(3, "L4", "wudu"), mk(4, "L3", "salah")];
    const events = [
      ...Array.from({ length: 3 }, () => ({ concept_id: "wudu", kind: "check_correct" as const, day: "2026-10-05" })),
      { concept_id: "wudu", kind: "check_wrong" as const, day: "2026-10-05" },
      { concept_id: "salah", kind: "unit_done" as const, day: "2026-10-05" },
    ];
    const a = aggregate(refs, events, ["wudu", "salah"]);
    expect(a.referrals.total).toBe(4);
    expect(a.referrals.byLevel).toMatchObject({ L4: 3, L3: null });
    expect(a.referrals.byConcept).toMatchObject({ wudu: 3, salah: null });
    expect(a.progress.find((p) => p.concept === "wudu")).toMatchObject({ checkAnswers: 4, accuracy: 0.75 });
    expect(a.progress.find((p) => p.concept === "salah")).toMatchObject({ unitsDone: null, accuracy: null });
    expect(JSON.stringify(a)).not.toContain("SECRET TEXT");
  });
});

describe("/api/handoff (server side)", () => {
  it("refuses identifiers, validates input and stores no user identifier", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-handoff-"));
    const { POST } = await import("@/app/api/handoff/route");
    const call = (body: unknown) => POST(new Request("http://x/api/handoff", { method: "POST", body: JSON.stringify(body) }));
    const ok = { conceptId: "wudu", level: "L4", questionHash: "0123456789abcdef", summary: "Topic: wudu. A family situation." };
    expect((await call({ ...ok, summary: "mail me at x@y.com please" })).status).toBe(422);
    expect((await call({ ...ok, level: "L1" })).status).toBe(400);
    expect((await call({ ...ok, conceptId: "nope" })).status).toBe(400);
    const res = await call({ ...ok, userId: "should-be-ignored", email: "x@y.com" });
    expect(res.status).toBe(201);
    expect((await res.json()).code).toMatch(/^[0-9A-F]{8}$/);
    const rows = await createLocalStore().listReferrals();
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["concept_id", "consented_summary", "created_at", "id", "level", "question_hash", "status"]);
  });
});
