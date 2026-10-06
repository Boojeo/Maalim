import { describe, expect, it } from "vitest";
import { fetchCandidates, getAyah, hadeethPassages, listCategoryIds, parseAyahRef, quranPassages, type Fetcher } from "@/lib/sources";
import { mergePassages, verifyPassages } from "@/lib/passages-import";

// A fake of the source APIs. The odd whitespace and quotes are deliberate: text must come back byte-for-byte.
const ODD = '  Text with “quotes”, a tab\t, a CRLF\r\nand trailing space  ';
const items: Record<string, Record<string, { title: string; hadeeth: string; attribution: string; grade: string; explanation: string; categories: string[] }>> = {
  "11": { en: { title: "T11", hadeeth: ODD, attribution: "A", grade: "G", explanation: "EXPL-EN", categories: ["1"] }, ar: { title: "ع11", hadeeth: "نص 11", attribution: "ر", grade: "ص", explanation: "شرح", categories: ["1"] } },
  "22": { en: { title: "T22", hadeeth: "text 22", attribution: "A", grade: "G", explanation: "", categories: ["1"] }, ar: { title: "ع22", hadeeth: "نص 22", attribution: "ر", grade: "ص", explanation: "", categories: ["1"] } },
  "33": { en: { title: "T33", hadeeth: "text 33", attribution: "A", grade: "G", explanation: "", categories: ["2"] }, ar: { title: "ع33", hadeeth: "نص 33", attribution: "ر", grade: "ص", explanation: "", categories: ["2"] } },
};
const calls: string[] = [];
const fake: Fetcher = async (url) => {
  calls.push(url);
  const u = new URL(url);
  if (u.pathname.endsWith("/hadeeths/list/")) {
    const cat = u.searchParams.get("category_id");
    const page = Number(u.searchParams.get("page"));
    const all = cat === "1" ? ["11", "22"] : ["22", "33"]; // item 22 is in both categories
    return { data: (page === 1 ? all.slice(0, 1) : all.slice(1)).map((id) => ({ id })), meta: { last_page: 2 } };
  }
  if (u.pathname.endsWith("/hadeeths/one/")) {
    const id = u.searchParams.get("id")!;
    const lang = u.searchParams.get("language")!;
    return { id, ...items[id][lang] };
  }
  if (u.pathname.includes("/translation/aya/")) {
    const [, , , , , key, sura, aya] = u.pathname.split("/");
    return { result: { sura, aya, arabic_text: `ar ${sura}:${aya}`, translation: `${key} ${sura}:${aya} [1]` } };
  }
  throw new Error("unexpected " + url);
};

describe("source clients (verbatim, unverified)", () => {
  it("walks every page of a category in the site's own order", async () => {
    expect(await listCategoryIds("1", fake)).toEqual(["11", "22"]);
  });
  it("candidates: site order, de-duplicated across categories, limited, with links; nothing ranked or filtered by us", async () => {
    const c = await fetchCandidates("wudu", ["1", "2"], 3, fake, 0, "2026-10-06");
    expect(c.map((x) => x.source_id)).toEqual(["11", "22", "33"]);
    expect((await fetchCandidates("wudu", ["1", "2"], 2, fake)).map((x) => x.source_id)).toEqual(["11", "22"]);
    expect(c[0]).toMatchObject({ concept_id: "wudu", url_en: "https://hadeethenc.com/en/browse/hadith/11", url_ar: "https://hadeethenc.com/ar/browse/hadith/11", title_ar: "ع11", fetched_on: "2026-10-06" });
    expect(c[0].text_en).toBe(ODD);
  });
  it("hadith passages: Arabic + English, text exactly as published, ids valid, always unverified", async () => {
    const ps = await hadeethPassages("wudu", "L2", ["11"], {}, fake);
    expect(ps.map((p) => p.id)).toEqual(["wudu-hd11-ar", "wudu-hd11-en"]);
    expect(ps.find((p) => p.lang === "en")!.text).toBe(ODD); // not trimmed, not normalised
    expect(ps.find((p) => p.lang === "ar")!.text).toBe("نص 11");
    for (const p of ps) {
      expect(p).toMatchObject({ source: "hadeethenc", source_id: "11", level: "L2", verified: false, verified_by: null, verified_on: null });
      expect(p.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
    expect(ps[1].source_url).toBe("https://hadeethenc.com/en/browse/hadith/11");
  });
  it("explanations are opt-in and skipped when the source has none", async () => {
    expect((await hadeethPassages("wudu", "L2", ["11", "22"], { explanations: true }, fake)).map((p) => p.id)).toEqual([
      "wudu-hd11-ar", "wudu-hd11-expl-ar", "wudu-hd11-en", "wudu-hd11-expl-en", "wudu-hd22-ar", "wudu-hd22-en",
    ]);
  });
  it("Quran references: validated, one passage per ayah and language, verbatim", async () => {
    expect(parseAyahRef("112:1-3")).toEqual([[112, 1], [112, 2], [112, 3]]);
    expect(parseAyahRef("2:255")).toEqual([[2, 255]]);
    for (const bad of ["x", "1:", "5:3-1", "1:1-99"]) expect(() => parseAyahRef(bad)).toThrow();
    const ps = await quranPassages("quran", "L1", "some_key", ["1:1-2"], fake);
    expect(ps.map((p) => p.id)).toEqual(["quran-q1-1-ar", "quran-q1-1-en", "quran-q1-2-ar", "quran-q1-2-en"]);
    expect(ps[1]).toMatchObject({ text: "some_key 1:1 [1]", source: "quranenc", source_id: "1:1", verified: false });
    expect((await getAyah("k", 2, 3, fake)).arabic_text).toBe("ar 2:3");
  });
  it("importing replaces the concept's placeholder, keeps others, and never produces a verified passage", async () => {
    const placeholder = { id: "wudu-001", concept_id: "wudu", lang: "en" as const, source: "hadeethenc" as const, source_id: "TODO", source_url: "TODO", text: "[CONTENT NEEDED: x]", level: "L2" as const, verified: false, verified_by: null, verified_on: null };
    const merged = mergePassages([placeholder], await hadeethPassages("wudu", "L2", ["22"], {}, fake));
    expect(merged.map((p) => p.id)).toEqual(["wudu-hd22-ar", "wudu-hd22-en"]);
    expect(merged.every((p) => !p.verified)).toBe(true);
    expect(verifyPassages(merged, "all", "Reviewer", "2026-10-06").errors).toEqual([]);
  });
});
