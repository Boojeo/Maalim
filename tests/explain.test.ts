import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { guard, overlap, parseCitations } from "@/lib/citation-guard";
import { createLocalStore } from "@/lib/data/local";
import { explain } from "@/lib/explain";
import { mockEmbedder, mockVector, cosine } from "@/lib/embeddings";
import { mockLlm, type LlmClient } from "@/lib/llm";
import { retrieve } from "@/lib/retrieval";
import { splitSentences } from "@/lib/text";

const FIXTURE = path.join(process.cwd(), "tests/fixtures/content");
const P1 = "SYNTHETIC TEST PASSAGE ONE. The sample procedure has three parts: part A comes first, part B comes second, and part C comes third.";

function stub(text: string): LlmClient & { calls: number } {
  const s = {
    provider: "mock" as const, model: "stub", calls: 0,
    async generate() {
      s.calls++;
      return { text, provider: "mock", model: "stub", inputTokens: 10, outputTokens: 10, latencyMs: 1 };
    },
  };
  return s;
}

let store: ReturnType<typeof createLocalStore>;
beforeEach(() => {
  process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-explain-"));
  store = createLocalStore(FIXTURE);
});

describe("text + embeddings", () => {
  it("splits sentences and keeps citation markers with their sentence", () => {
    expect(splitSentences("One two. Three four [1]. Five six!")).toEqual(["One two.", "Three four [1].", "Five six!"]);
    expect(splitSentences("One two. [1] Three four.[1][2] Five six")).toEqual(["One two. [1]", "Three four.[1][2]", "Five six"]);
    expect(splitSentences("a b.\nc d؟ [2]")).toEqual(["a b.", "c d؟ [2]"]);
  });
  it("mock embeddings rank related text above unrelated, in English and Arabic", () => {
    const q = mockVector("which part comes first");
    expect(cosine(q, mockVector(P1))).toBeGreaterThan(cosine(q, mockVector("weather is sunny today in the city")));
    const qa = mockVector("ما معنى الشهادة");
    expect(cosine(qa, mockVector("معنى الشهادة في اللغة"))).toBeGreaterThan(cosine(qa, mockVector("الطقس مشمس اليوم")));
  });
});

describe("citation guard", () => {
  const passages = [{ n: 1, id: "p1", text: P1 }, { n: 2, id: "p2", text: "Each part of the sample procedure is repeated twice before moving on." }];

  it("keeps supported, cited sentences", () => {
    const r = guard("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].", passages);
    expect(r.sentences.map((s) => s.passageIds)).toEqual([["p1"], ["p2"]]);
    expect(r.dropped).toHaveLength(0);
    expect(r.fallbackToVerbatim).toBe(false);
  });
  it("drops sentences with no citation, an invalid citation, or content the passage does not support", () => {
    const r = guard(
      [
        "The sample procedure has three parts [1].",
        "Part A comes first and part B comes second [1].",
        "The procedure has three parts.", // no citation
        "The procedure has three parts [9].", // invalid passage number
        "Purple elephants always dance during winter evenings [1].", // cited but unsupported
      ].join("\n"),
      passages,
    );
    expect(r.sentences).toHaveLength(2);
    expect(r.dropped.map((d) => d.reason).sort()).toEqual(["invalid-citation", "low-overlap", "no-citation"]);
  });
  it("falls back to verbatim when fewer than 2 sentences survive", () => {
    expect(guard("The sample procedure has three parts [1].\nUnrelated invented claim about nothing [1].", passages).fallbackToVerbatim).toBe(true);
    expect(guard("NO_ANSWER", passages)).toMatchObject({ sentences: [], fallbackToVerbatim: true });
    expect(guard("", passages).fallbackToVerbatim).toBe(true);
  });
  it("parses [1][2] and [1,2] markers; overlap ignores stopwords", () => {
    expect(parseCitations("Text here [1][2].")).toEqual({ text: "Text here.", numbers: [1, 2] });
    expect(parseCitations("Text here [1, 3].").numbers).toEqual([1, 3]);
    expect(overlap("the and of", [P1])).toBe(0);
  });
});

describe("retrieve()", () => {
  it("returns only verified passages, never the unverified one", async () => {
    const r = await retrieve("wudu", "", "en", { k: 10 }, { store });
    expect(r.map((x) => x.passage.id).sort()).toEqual(["wudu-syn-1", "wudu-syn-2", "wudu-syn-3"]);
  });
  it("ranks by similarity and drops irrelevant queries", async () => {
    const ranked = await retrieve("wudu", "which part comes first in the sample procedure", "en", {}, { store, embedder: mockEmbedder });
    expect(ranked[0].passage.id).toBe("wudu-syn-1");
    expect(await retrieve("wudu", "quarterly tax filing deadlines", "en", {}, { store, embedder: mockEmbedder })).toEqual([]);
  });
  it("is empty for a concept without verified passages", async () => {
    expect(await retrieve("shahada", "", "en", {}, { store })).toEqual([]);
  });
});

describe("explain()", () => {
  it("SUPPORTED: generated sentences each carry a citation to a verified passage", async () => {
    const llm = stub("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].");
    const r = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    expect(r.mode).toBe("generated");
    expect(r.sentences).toHaveLength(2);
    for (const s of r.sentences) expect(s.passageIds.length).toBeGreaterThan(0);
    expect(r.passages.every((p) => p.verified)).toBe(true);
    expect(r.droppedCount).toBe(0);
  });
  it("UNSUPPORTED: invented sentences are dropped; if <2 survive the verbatim sources are returned", async () => {
    const llm = stub("Invented claim number one [1].\nInvented claim number two with no source.\nThe sample procedure has three parts [1].");
    const r = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    expect(r.mode).toBe("verbatim");
    expect(r.sentences).toEqual([]);
    expect(r.passages.length).toBeGreaterThan(0);
    expect(r.droppedCount).toBe(2);
  });
  it("UNSUPPORTED mixed: keeps the supported sentences and counts the dropped ones", async () => {
    const llm = stub("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].\nSomething invented entirely [1].");
    const r = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    expect(r.mode).toBe("generated");
    expect(r.sentences).toHaveLength(2);
    expect(r.droppedCount).toBe(1);
  });
  it("EMPTY RETRIEVAL: mode none and the model is never called", async () => {
    const llm = stub("anything [1]");
    const r = await explain({ conceptId: "shahada", lang: "en" }, { store, llm });
    expect(r.mode).toBe("none");
    expect(llm.calls).toBe(0);
    const irrelevant = await explain({ conceptId: "wudu", lang: "en", query: "quarterly tax filing deadlines" }, { store, llm });
    expect(irrelevant.mode).toBe("none");
    expect(llm.calls).toBe(0);
  });
  it("ask flow: an unmatched wording falls back to the concept's verified passages only when asked to", async () => {
    const llm = stub("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].");
    const q = "quarterly tax filing deadlines";
    expect((await explain({ conceptId: "wudu", lang: "en", query: q }, { store, llm })).mode).toBe("none");
    const r = await explain({ conceptId: "wudu", lang: "en", query: q, fallbackToConcept: true }, { store, llm });
    expect(r.mode).toBe("generated");
    expect(r.passages.every((p) => p.verified)).toBe(true);
  });
  it("caches guarded results (second call does not hit the model)", async () => {
    const llm = stub("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].");
    const a = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    const b = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    expect(llm.calls).toBe(1);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.sentences).toEqual(a.sentences);
  });
  it("the unverified passage never appears in the prompt or the result", async () => {
    let prompt = "";
    const llm: LlmClient = { ...stub(""), async generate(req) { prompt = req.user; return { text: "NO_ANSWER", provider: "mock", model: "m", inputTokens: 1, outputTokens: 1, latencyMs: 1 }; } };
    const r = await explain({ conceptId: "wudu", lang: "en" }, { store, llm });
    expect(prompt).not.toContain("UNVERIFIED");
    expect(JSON.stringify(r)).not.toContain("UNVERIFIED");
  });
  it("the mock adapter is extractive and always passes the guard", async () => {
    const r = await explain({ conceptId: "wudu", lang: "en", query: "which part comes first in the sample procedure" }, { store, llm: mockLlm, embedder: mockEmbedder });
    expect(["generated", "verbatim"]).toContain(r.mode);
    if (r.mode === "generated") for (const s of r.sentences) expect(P1 + " Each part of the sample procedure is repeated twice before moving on. SYNTHETIC TEST PASSAGE THREE. The sample note applies only to the synthetic fixture and has no other meaning.").toContain(s.text.replace(/\.$/, ""));
  });
});

describe("explanation review (approve / reject) and approved-only mode", () => {
  const llm = () => stub("The sample procedure has three parts [1].\nEach part of the sample procedure is repeated twice [2].");

  it("a rejected explanation is never shown again: the verbatim source is returned and the model is not re-called", async () => {
    const l = llm();
    await explain({ conceptId: "wudu", lang: "en" }, { store, llm: l });
    const entries = await store.listExplanations();
    expect(entries).toHaveLength(1);
    await store.setExplanationStatus({ concept_id: "wudu", level: "L2", lang: "en", query_hash: entries[0].query_hash }, "rejected", "Reviewer");
    const r = await explain({ conceptId: "wudu", lang: "en" }, { store, llm: l });
    expect(r.mode).toBe("verbatim");
    expect(r.sentences).toEqual([]);
    expect(l.calls).toBe(1);
    expect((await store.listExplanations())[0]).toMatchObject({ status: "rejected", reviewed_by: "Reviewer" });
  });
  it("EXPLAIN_REQUIRE_APPROVED=1: generated text stays hidden (verbatim shown) until a reviewer approves it", async () => {
    process.env.EXPLAIN_REQUIRE_APPROVED = "1";
    try {
      const l = llm();
      const first = await explain({ conceptId: "wudu", lang: "en" }, { store, llm: l });
      expect(first.mode).toBe("verbatim");
      const [entry] = await store.listExplanations();
      expect(entry.status).toBe("pending");
      expect(JSON.parse(entry.text)).toHaveLength(2); // saved for the reviewer
      expect((await explain({ conceptId: "wudu", lang: "en" }, { store, llm: l })).mode).toBe("verbatim");
      await store.setExplanationStatus({ concept_id: "wudu", level: "L2", lang: "en", query_hash: entry.query_hash }, "approved", "Reviewer");
      const approved = await explain({ conceptId: "wudu", lang: "en" }, { store, llm: l });
      expect(approved.mode).toBe("generated");
      expect(l.calls).toBe(1);
    } finally {
      delete process.env.EXPLAIN_REQUIRE_APPROVED;
    }
  });
});
