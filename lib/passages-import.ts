// Intake of passages supplied BY A PERSON (copied verbatim from QuranEnc / HadeethEnc / IslamHouse).
// This code never writes or alters religious text: it validates and stores exactly what the CSV contains,
// always as verified=false. Verification is a separate, human-run step (scripts/verify-passages.ts).
import { isPlaceholder, type Level, type Passage } from "./types";

export const COLUMNS = ["id", "concept_id", "lang", "source", "source_id", "source_url", "text", "level"] as const;

/** RFC 4180 CSV (quotes, doubled quotes, commas and newlines inside quotes, BOM, CRLF). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export interface ImportResult {
  passages: Passage[];
  errors: string[];
}

export function rowsToPassages(rows: string[][], conceptIds: string[]): ImportResult {
  const errors: string[] = [];
  const [header, ...body] = rows;
  if (!header) return { passages: [], errors: ["empty file"] };
  const idx = Object.fromEntries(COLUMNS.map((c) => [c, header.map((h) => h.trim()).indexOf(c)]));
  for (const c of COLUMNS) if (idx[c] < 0) errors.push(`missing column: ${c}`);
  if (errors.length) return { passages: [], errors };

  const out: Passage[] = [];
  const seen = new Set<string>();
  body.forEach((r, n) => {
    const line = n + 2;
    const get = (c: (typeof COLUMNS)[number]) => (r[idx[c]] ?? "").trim();
    const p = {
      id: get("id"), concept_id: get("concept_id"), lang: get("lang"), source: get("source"),
      source_id: get("source_id"), source_url: get("source_url"), text: r[idx.text] ?? "", level: get("level"),
    };
    const bad = (m: string) => errors.push(`line ${line} (${p.id || "no id"}): ${m}`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id)) bad("id must be lowercase letters, digits and dashes (e.g. wudu-001)");
    if (seen.has(p.id)) bad("duplicate id");
    seen.add(p.id);
    if (!conceptIds.includes(p.concept_id)) bad(`unknown concept_id "${p.concept_id}"`);
    if (p.lang !== "ar" && p.lang !== "en") bad('lang must be "ar" or "en"');
    if (!["quranenc", "hadeethenc", "islamhouse"].includes(p.source)) bad("source must be quranenc, hadeethenc or islamhouse");
    if (!p.source_id || p.source_id.toUpperCase() === "TODO") bad("source_id is required (the exact ID on the source site)");
    if (!/^https?:\/\//.test(p.source_url)) bad("source_url must be the link to the exact item");
    if (!p.text.trim() || isPlaceholder(p.text)) bad("text is empty or a placeholder");
    if (!["L1", "L2", "L3", "L4"].includes(p.level)) bad("level must be L1, L2, L3 or L4");
    out.push({
      id: p.id, concept_id: p.concept_id, lang: p.lang as Passage["lang"], source: p.source as Passage["source"],
      source_id: p.source_id, source_url: p.source_url,
      text: p.text, // exactly as supplied (no trimming of inner content, no normalisation)
      level: p.level as Level, verified: false, verified_by: null, verified_on: null,
    });
  });
  return { passages: errors.length ? [] : out, errors };
}

/** Upserts by id; placeholder entries of the imported concepts are dropped. New passages are never verified. */
export function mergePassages(existing: Passage[], incoming: Passage[]): Passage[] {
  const concepts = new Set(incoming.map((p) => p.concept_id));
  const ids = new Set(incoming.map((p) => p.id));
  const kept = existing.filter((p) => !ids.has(p.id) && !(concepts.has(p.concept_id) && isPlaceholder(p.text)));
  return [...kept, ...incoming];
}

/** Human-run: marks passages verified. Refuses placeholders and incomplete sources. */
export function verifyPassages(passages: Passage[], ids: string[] | "all", by: string, on: string): { passages: Passage[]; errors: string[] } {
  const errors: string[] = [];
  if (by.trim().length < 2) errors.push("--by (reviewer name) is required");
  const out = passages.map((p) => {
    if (ids !== "all" && !ids.includes(p.id)) return p;
    if (isPlaceholder(p.text) || !p.source_id || p.source_id === "TODO" || !p.source_url || p.source_url === "TODO") {
      errors.push(`${p.id}: placeholder text or incomplete source, cannot be verified`);
      return p;
    }
    return { ...p, verified: true, verified_by: by.trim(), verified_on: on };
  });
  if (ids !== "all") for (const id of ids) if (!passages.some((p) => p.id === id)) errors.push(`${id}: no such passage`);
  return { passages: errors.length ? passages : out, errors };
}
