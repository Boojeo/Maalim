// Shared text utilities: tokenising (Arabic + Latin), sentence splitting, hashing.
import { createHash } from "node:crypto";

const DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g; // harakat, small marks, tatweel

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase();
}

const STOP = new Set(
  (
    "a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those " +
    "he she they them his her their we you your i me my our not no so than then there here also can may will shall do does did " +
    "has have had which who whom whose what when where how all any each some such into over under about after before " +
    "في من على الى إلى عن ان أن إن ما هذا هذه ذلك تلك هو هي هم هن كان كانت و او أو ثم قد لا لم لن كل بعد قبل الذي التي الذين"
  ).split(/\s+/),
);

function stem(t: string): string {
  if (/^[a-z]+$/.test(t) && t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function tokens(text: string): string[] {
  return (normalize(text).match(/[\p{L}\p{N}]+/gu) ?? []).map(stem);
}

/** Tokens that carry meaning (no stopwords, no single characters). */
export function contentTokens(text: string): string[] {
  return tokens(text).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Split into sentences on . ! ? ؟ ۔ and newlines; a citation marker after the full stop stays with its sentence. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    const matches = line.match(/[^.!?؟۔]+[.!?؟۔]*(?:\s*\[\d+(?:\s*,\s*\d+)*\])*/gu) ?? [];
    for (const m of matches) {
      const t = m.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function sha(text: string, len = 16): string {
  return createHash("sha256").update(text).digest("hex").slice(0, len);
}
