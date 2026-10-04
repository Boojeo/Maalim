// Offline draft-item generation (never runs in a request). Output is always status "draft"; it only
// becomes visible to learners after a person approves it in /admin/review.
import fs from "node:fs";
import path from "node:path";
import { checkItem } from "./item-check";
import { getLlm, type LlmClient } from "./llm";
import { sha } from "./text";
import type { Item, ItemOption, Passage } from "./types";

export const ITEMS_PROMPT_VERSION = "items.v1";

export interface GenResult {
  accepted: Item[];
  rejected: { reason: string[]; raw: unknown }[];
}

function loadPrompt(): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", `${ITEMS_PROMPT_VERSION}.md`), "utf8").replace(/^---[\s\S]*?---\s*/, "").trim();
}

export function parseItems(raw: string): unknown[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const v = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function generateItems(passage: Passage, llm: LlmClient = getLlm()): Promise<GenResult> {
  const res = await llm.generate({ system: loadPrompt(), user: `Passage: ${passage.text}`, maxTokens: 900 });
  const accepted: Item[] = [];
  const rejected: GenResult["rejected"] = [];
  for (const raw of parseItems(res.text)) {
    const r = raw as Partial<Item> & { options?: ItemOption[] };
    const span = String(r.source_span ?? "");
    const item: Item = {
      id: `gen-${passage.id}-${sha(span + String(r.prompt), 8)}`,
      concept_id: passage.concept_id,
      type: r.type === "order" ? "order" : "mcq",
      lang: passage.lang,
      prompt: String(r.prompt ?? ""),
      options: Array.isArray(r.options) ? r.options.map((o) => ({ id: String(o.id), text: String(o.text) })) : [],
      answer: (r.answer as Item["answer"]) ?? "",
      source_passage_id: passage.id,
      source_span: span,
      video_id: null,
      status: "draft",
      generated_by: `${res.provider}:${res.model}:${ITEMS_PROMPT_VERSION}`,
      reviewed_by: null,
      reviewed_on: null,
    };
    const check = checkItem(item, passage);
    if (check.ok) accepted.push(item);
    else rejected.push({ reason: check.problems, raw });
  }
  return { accepted, rejected };
}
