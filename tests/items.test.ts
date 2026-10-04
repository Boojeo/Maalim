import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkItem } from "@/lib/item-check";
import { generateItems, parseItems } from "@/lib/item-gen";
import { mockLlm, type LlmClient } from "@/lib/llm";
import { createLocalStore } from "@/lib/data/local";
import type { Item, Passage } from "@/lib/types";

const passage: Passage = {
  id: "p1", concept_id: "wudu", lang: "en", source: "hadeethenc", source_id: "1", source_url: "u", level: "L2",
  text: "SYNTHETIC TEST PASSAGE ONE. The sample procedure has three parts: part A comes first, part B comes second, and part C comes third.",
  verified: true, verified_by: "R", verified_on: "2026-10-04",
};
const mcq = (over: Partial<Item> = {}): Item => ({
  id: "i", concept_id: "wudu", type: "mcq", lang: "en", prompt: "Which part comes first?",
  options: [{ id: "a", text: "part A" }, { id: "b", text: "unrelated thing" }], answer: "a",
  source_passage_id: "p1", source_span: "part A comes first", video_id: null, status: "draft", generated_by: null, reviewed_by: null, reviewed_on: null, ...over,
});

describe("checkItem: answerable from the source span", () => {
  it("accepts a well-formed mcq", () => expect(checkItem(mcq(), passage)).toEqual({ ok: true, problems: [] }));
  it("rejects spans that are not verbatim in the passage", () => {
    expect(checkItem(mcq({ source_span: "part A comes last" }), passage).problems).toContain("source span is not a verbatim part of the source passage");
  });
  it("rejects when the correct option is not supported by the span", () => {
    expect(checkItem(mcq({ options: [{ id: "a", text: "unrelated thing" }, { id: "b", text: "other stuff" }] }), passage).ok).toBe(false);
  });
  it("rejects ambiguous items (a wrong option is also supported)", () => {
    const r = checkItem(mcq({ options: [{ id: "a", text: "part A" }, { id: "b", text: "part A comes first" }] }), passage);
    expect(r.problems.join()).toContain("ambiguous");
  });
  it("a short wrong option sharing one word with the span is not 'supported'", () => {
    const item = mcq({ source_span: "part B comes second", answer: "b", options: [{ id: "a", text: "part A" }, { id: "b", text: "part B" }, { id: "c", text: "unrelated thing" }] });
    expect(checkItem(item, passage).ok).toBe(true);
  });
  it("checks ordering against the span order", () => {
    const span = "part A comes first, part B comes second, and part C comes third";
    const order = (answer: string[]): Item => mcq({
      type: "order", source_span: span, answer,
      options: [{ id: "a", text: "part A" }, { id: "b", text: "part B" }, { id: "c", text: "part C" }],
    });
    expect(checkItem(order(["a", "b", "c"]), passage).ok).toBe(true);
    expect(checkItem(order(["b", "a", "c"]), passage).ok).toBe(false);
    expect(checkItem(order(["a", "b"]), passage).ok).toBe(false);
  });
  it("never passes placeholders or unverified / missing sources", () => {
    expect(checkItem(mcq({ prompt: "[CONTENT NEEDED: q]" }), passage).ok).toBe(false);
    expect(checkItem(mcq(), { ...passage, verified: false }).problems).toContain("source passage is not verified");
    expect(checkItem(mcq({ source_passage_id: null }), null).ok).toBe(false);
  });
});

describe("offline generator", () => {
  it("mock adapter drafts cloze items that all pass the check, as status draft", async () => {
    const { accepted, rejected } = await generateItems(passage, mockLlm);
    expect(accepted.length).toBeGreaterThan(0);
    expect(rejected).toEqual([]);
    for (const i of accepted) {
      expect(i.status).toBe("draft");
      expect(i.source_passage_id).toBe("p1");
      expect(passage.text).toContain(i.source_span!);
      expect(i.generated_by).toContain("items.v1");
    }
  });
  it("rejects model output that fails the answerability check", async () => {
    const bad: LlmClient = {
      provider: "mock", model: "bad",
      async generate() {
        return { text: JSON.stringify([{ type: "mcq", prompt: "Q?", options: [{ id: "a", text: "x" }, { id: "b", text: "y" }], answer: "a", source_span: "invented span not in passage" }]), provider: "mock", model: "bad", inputTokens: 1, outputTokens: 1, latencyMs: 1 };
      },
    };
    const r = await generateItems(passage, bad);
    expect(r.accepted).toEqual([]);
    expect(r.rejected).toHaveLength(1);
    expect(parseItems("not json")).toEqual([]);
  });
  it("drafts never reach learners until approved", async () => {
    process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-items-"));
    const store = createLocalStore(path.join(process.cwd(), "tests/fixtures/content"));
    const p = (await store.getPassage("wudu-syn-1"))!;
    await store.upsertItems((await generateItems(p, mockLlm)).accepted);
    const before = (await store.getItems({ learner: true })).map((i) => i.id);
    expect(before.some((id) => id.startsWith("gen-"))).toBe(false);
    const draft = (await store.getItems({ status: "draft", learner: false })).find((i) => i.id.startsWith("gen-"))!;
    await store.setItemStatus(draft.id, "approved", "Reviewer");
    expect((await store.getItems({ learner: true })).map((i) => i.id)).toContain(draft.id);
  });
});
