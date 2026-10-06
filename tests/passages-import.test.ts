import { describe, expect, it } from "vitest";
import { mergePassages, parseCsv, rowsToPassages, verifyPassages } from "@/lib/passages-import";
import type { Passage } from "@/lib/types";

const IDS = ["wudu", "salah"];
const header = "id,concept_id,lang,source,source_id,source_url,text,level";
const good = `${header}\nwudu-100,wudu,en,hadeethenc,123,https://example.invalid/123,"Line one, with a comma and ""quotes""\nand a second line",L2\n`;

describe("CSV intake", () => {
  it("parses quotes, commas, newlines and a BOM without altering the text", () => {
    const rows = parseCsv("﻿" + good);
    expect(rows).toHaveLength(2);
    expect(rows[1][6]).toBe('Line one, with a comma and "quotes"\nand a second line');
  });
  it("imports valid rows as UNVERIFIED with the text exactly as supplied", () => {
    const { passages, errors } = rowsToPassages(parseCsv(good), IDS);
    expect(errors).toEqual([]);
    expect(passages[0]).toMatchObject({ id: "wudu-100", verified: false, verified_by: null, verified_on: null });
    expect(passages[0].text).toBe('Line one, with a comma and "quotes"\nand a second line');
  });
  it("accepts Arabic text unchanged", () => {
    const ar = `${header}\nwudu-101,wudu,ar,islamhouse,9,https://example.invalid/9,نص تجريبي,L2\n`;
    expect(rowsToPassages(parseCsv(ar), IDS).passages[0].text).toBe("نص تجريبي");
  });
  it("refuses incomplete rows: missing source, placeholder text, unknown concept, bad level, duplicates", () => {
    const bad = [
      header,
      "a b,wudu,en,hadeethenc,TODO,not-a-url,[CONTENT NEEDED: x],L9",
      "x1,nope,fr,other,1,https://e.invalid,text,L1",
      "x1,wudu,en,hadeethenc,1,https://e.invalid,text,L1",
    ].join("\n");
    const { errors, passages } = rowsToPassages(parseCsv(bad), IDS);
    expect(passages).toEqual([]);
    const all = errors.join("\n");
    for (const part of ["id must be", "source_id is required", "source_url must", "placeholder", "level must", "unknown concept_id", 'lang must', "source must", "duplicate id"]) expect(all).toContain(part);
  });
  it("requires every column", () => {
    expect(rowsToPassages(parseCsv("id,text\n1,x"), IDS).errors.join()).toContain("missing column");
  });
});

describe("merge and verify", () => {
  const placeholder: Passage = { id: "wudu-001", concept_id: "wudu", lang: "en", source: "hadeethenc", source_id: "TODO", source_url: "TODO", text: "[CONTENT NEEDED: x]", level: "L2", verified: false, verified_by: null, verified_on: null };
  const incoming = rowsToPassages(parseCsv(good), IDS).passages;

  it("replaces the concept's placeholders and keeps other concepts untouched", () => {
    const other: Passage = { ...placeholder, id: "salah-001", concept_id: "salah" };
    const merged = mergePassages([placeholder, other], incoming);
    expect(merged.map((p) => p.id).sort()).toEqual(["salah-001", "wudu-100"]);
  });
  it("re-importing an id resets it to unverified (text changed => needs a new review)", () => {
    const verified = verifyPassages(incoming, "all", "Reviewer", "2026-10-06").passages;
    expect(verified[0].verified).toBe(true);
    const again = mergePassages(verified, incoming);
    expect(again[0].verified).toBe(false);
  });
  it("verification needs a reviewer name and refuses placeholders", () => {
    expect(verifyPassages(incoming, "all", "", "2026-10-06").errors.join()).toContain("reviewer name");
    expect(verifyPassages([placeholder], "all", "Reviewer", "2026-10-06").errors.join()).toContain("cannot be verified");
    expect(verifyPassages(incoming, ["nope"], "Reviewer", "2026-10-06").errors.join()).toContain("no such passage");
  });
  it("verified passages carry reviewer and date and then pass the learner gate", async () => {
    const { isLearnerPassage } = await import("@/lib/content-gate");
    const [v] = verifyPassages(incoming, ["wudu-100"], "Reviewer", "2026-10-06").passages;
    expect(v).toMatchObject({ verified: true, verified_by: "Reviewer", verified_on: "2026-10-06" });
    expect(isLearnerPassage(v, false)).toBe(true);
    expect(isLearnerPassage(incoming[0], false)).toBe(false);
  });
});
