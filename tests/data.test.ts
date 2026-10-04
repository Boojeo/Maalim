import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/lib/data/local";
import { isLearnerItem, isLearnerPassage } from "@/lib/content-gate";
import { buildRows } from "@/scripts/seed";
import type { Item, Passage } from "@/lib/types";

const passage = (over: Partial<Passage> = {}): Passage => ({
  id: "p1", concept_id: "wudu", lang: "en", source: "hadeethenc", source_id: "1", source_url: "u",
  text: "some verified text", level: "L2", verified: true, verified_by: "Reviewer", verified_on: "2026-10-04", ...over,
});
const item = (over: Partial<Item> = {}): Item => ({
  id: "i1", concept_id: "wudu", type: "mcq", lang: "en", prompt: "Q?", options: [{ id: "a", text: "A" }],
  answer: "a", source_passage_id: "p1", source_span: "verified", video_id: null, status: "approved",
  generated_by: null, reviewed_by: "R", reviewed_on: null, ...over,
});

describe("content gate", () => {
  it("hides unverified, placeholder and reviewer-less passages from learners", () => {
    expect(isLearnerPassage(passage(), false)).toBe(true);
    expect(isLearnerPassage(passage({ verified: false }), false)).toBe(false);
    expect(isLearnerPassage(passage({ verified_by: null }), false)).toBe(false);
    expect(isLearnerPassage(passage({ text: "[CONTENT NEEDED: x]" }), false)).toBe(false);
  });
  it("shows only approved items whose source passage is verified", () => {
    const ps = new Map([["p1", passage()], ["p2", passage({ id: "p2", verified: false })]]);
    expect(isLearnerItem(item(), ps, false)).toBe(true);
    expect(isLearnerItem(item({ status: "draft" }), ps, false)).toBe(false);
    expect(isLearnerItem(item({ status: "rejected" }), ps, false)).toBe(false);
    expect(isLearnerItem(item({ source_passage_id: "p2" }), ps, false)).toBe(false);
    expect(isLearnerItem(item({ prompt: "[CONTENT NEEDED: q]" }), ps, false)).toBe(false);
  });
});

describe("local store (real /content files)", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-test-"));
    process.env.LOCAL_DATA_DIR = dir;
  });

  it("loads the curriculum with prerequisites", async () => {
    const s = createLocalStore();
    const cur = await s.getCurriculum();
    expect(cur.concepts).toHaveLength(6);
    expect((await s.getConcept("salah"))?.prerequisites).toEqual(["wudu"]);
  });
  it("returns no learner passages or items from the placeholder content", async () => {
    const s = createLocalStore();
    expect(await s.getPassages({ learner: true })).toHaveLength(0);
    expect(await s.getPassages({ learner: false })).not.toHaveLength(0);
    expect(await s.getItems({ learner: true })).toHaveLength(0);
  });
  it("persists review decisions, referrals and cache in the runtime file", async () => {
    const s = createLocalStore();
    const updated = await s.setItemStatus("item-wudu-order-001", "rejected", "tester");
    expect(updated?.status).toBe("rejected");
    expect((await s.getItems({ status: "rejected", learner: false })).map((i) => i.id)).toContain("item-wudu-order-001");
    const r = await s.addReferral({ concept_id: "wudu", question_hash: "h", level: "L3", consented_summary: "s" });
    expect((await s.listReferrals())[0].id).toBe(r.id);
    expect(Object.keys(r)).not.toContain("user_id");
    await s.putCachedExplanation({ concept_id: "wudu", level: "L2", lang: "en", query_hash: "", text: "t", citations: [], status: "pending", created_at: "x" });
    expect((await s.getCachedExplanation({ concept_id: "wudu", level: "L2", lang: "en", query_hash: "" }))?.text).toBe("t");
  });
});

describe("seed rows", () => {
  it("maps all content files", () => {
    const rows = buildRows();
    expect(rows.concepts).toHaveLength(6);
    expect(rows.prerequisites.length).toBeGreaterThan(0);
    for (const u of rows.units) expect(u.verified).toBe(false);
  });
});
