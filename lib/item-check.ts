// Auto-check for practice items: each item must be answerable from its source span, and approval
// requires a verified source passage (CLAUDE.md rules 1, 2, 7).
import { overlap } from "./citation-guard";
import { contentTokens, normalize } from "./text";
import { isPlaceholder, type Item, type Passage } from "./types";

export interface CheckResult {
  ok: boolean;
  /** One human-readable line per failed check. */
  problems: string[];
}

const ANSWER_SUPPORT = 0.8;

const hasText = (span: string, text: string) => normalize(span).includes(normalize(text).trim());

/**
 * Is this option's text supported by the span? Literal inclusion always counts. Fuzzy content-word
 * overlap counts only for longer options (>= 3 content words): a short option like "part A" must not
 * be "supported" merely because it shares the word "part" with the span.
 */
function supported(span: string, text: string): boolean {
  if (hasText(span, text)) return true;
  return contentTokens(text).length >= 3 && overlap(text, [span]) >= ANSWER_SUPPORT;
}

export function checkItem(item: Item, passage: Passage | null): CheckResult {
  const problems: string[] = [];
  const fail = (m: string) => problems.push(m);

  if (isPlaceholder(item.prompt) || item.options.some((o) => isPlaceholder(o.text))) fail("contains a [CONTENT NEEDED] placeholder");
  if (!item.prompt.trim()) fail("empty prompt");
  if (!passage) fail("no source passage");
  else {
    if (!passage.verified || !passage.verified_by) fail("source passage is not verified");
    if (isPlaceholder(passage.text)) fail("source passage is a placeholder");
  }
  const span = item.source_span?.trim() ?? "";
  if (!span) fail("no source span");
  else if (passage && !hasText(passage.text, span)) fail("source span is not a verbatim part of the source passage");

  const ids = item.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) fail("duplicate option ids");
  if (item.options.length < 2) fail("fewer than 2 options");

  if (span && item.options.length >= 2) {
    if (item.type === "mcq") {
      if (typeof item.answer !== "string" || !ids.includes(item.answer)) fail("answer is not one of the options");
      else {
        const supportedIds = item.options.filter((o) => supported(span, o.text)).map((o) => o.id);
        if (!supportedIds.includes(item.answer)) fail("the correct option is not supported by the source span");
        if (supportedIds.some((id) => id !== item.answer)) fail("a wrong option is also supported by the source span (ambiguous)");
      }
    } else {
      const a = item.answer;
      if (!Array.isArray(a) || a.length !== ids.length || new Set(a).size !== ids.length || a.some((x) => !ids.includes(x))) {
        fail("answer is not a full ordering of the options");
      } else {
        const n = normalize(span);
        const positions = a.map((id) => n.indexOf(normalize(item.options.find((o) => o.id === id)!.text).trim()));
        if (positions.some((p) => p < 0)) fail("an option's text is not found in the source span");
        else if (positions.some((p, i) => i > 0 && p <= positions[i - 1])) fail("the answer order does not follow the source span");
      }
    }
  }
  return { ok: problems.length === 0, problems };
}
