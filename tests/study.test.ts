import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splitItems, summariseStudy } from "@/lib/study";
import { createLocalStore } from "@/lib/data/local";
import type { Item, StudyResult } from "@/lib/types";

const item = (id: string): Item => ({ id, concept_id: "wudu", type: "mcq", lang: "en", prompt: "p", options: [], answer: "a", source_passage_id: null, source_span: null, video_id: null, status: "approved", generated_by: null, reviewed_by: null, reviewed_on: null });
const run = (g: "A" | "B", pre: number, post: number): StudyResult => ({ group_code: g, concept_id: "wudu", pre_correct: pre, pre_total: 4, post_correct: post, post_total: 4, day: "2026-10-06" });

describe("study", () => {
  it("splits items into two disjoint, stable halves", () => {
    const s = splitItems(["d", "a", "c", "b"].map(item));
    expect(s.pre.map((i) => i.id)).toEqual(["a", "c"]);
    expect(s.post.map((i) => i.id)).toEqual(["b", "d"]);
    expect(splitItems(["a", "b", "c"].map(item)).pre).toHaveLength(2);
  });
  it("reports gain per group, the difference, and hides groups with fewer than 3 runs", () => {
    const rs = [run("A", 1, 2), run("A", 2, 2), run("A", 1, 1), run("B", 1, 4), run("B", 2, 4), run("B", 1, 3), run("B", 2, 4)];
    const s = summariseStudy(rs);
    const [a, b] = s.groups;
    expect(a).toMatchObject({ n: 3 });
    expect(a.meanPre).toBeCloseTo(4 / 12);
    expect(a.meanPost).toBeCloseTo(5 / 12);
    expect(b.gain).toBeCloseTo(15 / 16 - 6 / 16);
    expect(s.difference).toBeCloseTo(b.gain! - a.gain!);
    const small = summariseStudy([run("A", 1, 2), run("B", 1, 2)]);
    expect(small.groups.every((g) => g.n === null && g.gain === null)).toBe(true);
    expect(small.difference).toBeNull();
    expect(small.total).toBe(2);
  });
  it("/api/study stores one anonymous row and validates input", async () => {
    process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-study-"));
    const { POST } = await import("@/app/api/study/route");
    const call = (b: unknown) => POST(new Request("http://x/api/study", { method: "POST", body: JSON.stringify(b) }));
    const ok = { group: "B", conceptId: "wudu", preCorrect: 1, preTotal: 2, postCorrect: 2, postTotal: 2 };
    expect((await call(ok)).status).toBe(204);
    expect((await call({ ...ok, postCorrect: 3 })).status).toBe(400); // more correct than total
    expect((await call({ ...ok, group: "C" })).status).toBe(400);
    expect((await call({ ...ok, conceptId: "nope" })).status).toBe(400);
    const rows = await createLocalStore().listStudyResults();
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["concept_id", "day", "group_code", "post_correct", "post_total", "pre_correct", "pre_total"]);
  });
});
