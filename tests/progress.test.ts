import { describe, expect, it } from "vitest";
import {
  conceptStatus, emptyProgress, markDone, markStarted, nextConcept, parseProgress, recordAttempt, unmetPrerequisites,
} from "@/lib/progress";
import { gradeItem, seededOrder } from "@/lib/practice";
import { createLocalStore } from "@/lib/data/local";
import type { Item } from "@/lib/types";

describe("progress and prerequisites", () => {
  it("locks concepts until prerequisites are done", async () => {
    const { concepts } = await createLocalStore().getCurriculum();
    const by = Object.fromEntries(concepts.map((c) => [c.id, c]));
    let s = emptyProgress();
    expect(conceptStatus(by.shahada, s)).toBe("available");
    expect(conceptStatus(by.tawhid, s)).toBe("locked");
    expect(unmetPrerequisites(by["five-pillars"], s)).toEqual(["shahada", "tawhid"]);
    s = markStarted(s, "shahada");
    expect(conceptStatus(by.shahada, s)).toBe("in_progress");
    s = markDone(s, "shahada");
    expect(conceptStatus(by.shahada, s)).toBe("done");
    expect(conceptStatus(by.tawhid, s)).toBe("available");
    expect(conceptStatus(by.quran, s)).toBe("available");
    expect(conceptStatus(by["five-pillars"], s)).toBe("locked");
  });
  it("picks the next concept respecting prerequisites", async () => {
    const { concepts } = await createLocalStore().getCurriculum();
    let s = emptyProgress();
    expect(nextConcept(concepts, s)?.id).toBe("shahada");
    s = markDone(s, "shahada");
    expect(nextConcept(concepts, s)?.id).toBe("tawhid");
    for (const id of ["tawhid", "quran", "five-pillars", "wudu", "salah"]) s = markDone(s, id);
    expect(nextConcept(concepts, s)).toBeNull();
  });
  it("records attempts and survives malformed storage", () => {
    const s = recordAttempt(recordAttempt(emptyProgress(), "wudu", true), "wudu", false);
    expect(s.concepts.wudu).toMatchObject({ attempts: 2, correct: 1, started: true });
    expect(parseProgress("not json")).toEqual(emptyProgress());
    expect(parseProgress('{"version":2}')).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify(s)).concepts.wudu.attempts).toBe(2);
  });
});

describe("grading", () => {
  const base: Item = {
    id: "i", concept_id: "c", type: "mcq", lang: "en", prompt: "p", options: [], answer: "a",
    source_passage_id: null, source_span: null, video_id: null, status: "approved", generated_by: null, reviewed_by: null, reviewed_on: null,
  };
  it("grades mcq and ordering", () => {
    expect(gradeItem(base, "a")).toBe(true);
    expect(gradeItem(base, "b")).toBe(false);
    const ord = { ...base, type: "order" as const, answer: ["x", "y", "z"] };
    expect(gradeItem(ord, ["x", "y", "z"])).toBe(true);
    expect(gradeItem(ord, ["x", "z", "y"])).toBe(false);
    expect(gradeItem(ord, ["x", "y"])).toBe(false);
  });
  it("shuffles deterministically", () => {
    const a = seededOrder([1, 2, 3, 4, 5], "seed");
    expect(a).toEqual(seededOrder([1, 2, 3, 4, 5], "seed"));
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
