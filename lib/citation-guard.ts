// Citation guard (CLAUDE.md rule 3): every generated sentence must cite a retrieved passage and be
// supported by it. Unsupported sentences are dropped. If fewer than MIN_SURVIVORS remain, the caller
// shows the verified source text verbatim instead.
import { contentTokens, splitSentences } from "./text";

export const MIN_SURVIVORS = 2;
/** Share of a sentence's content words that must appear in the cited passage(s). 0.9 = at most about one novel word per ten; stricter beats looser here: a rejected paraphrase just falls back to the verbatim source. */
export const MIN_OVERLAP = 0.9;

export interface GuardPassage {
  /** 1-based number used in the prompt and in [n] markers. */
  n: number;
  id: string;
  text: string;
}

export type DropReason = "no-citation" | "invalid-citation" | "low-overlap" | "no-content";

export interface GuardedSentence {
  text: string;
  /** Passage ids this sentence cites (all valid). */
  passageIds: string[];
}

export interface GuardResult {
  sentences: GuardedSentence[];
  dropped: { text: string; reason: DropReason }[];
  /** True when fewer than MIN_SURVIVORS sentences survived: show the verified source text verbatim. */
  fallbackToVerbatim: boolean;
}

const MARKER = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

export function parseCitations(sentence: string): { text: string; numbers: number[] } {
  const numbers: number[] = [];
  for (const m of sentence.matchAll(MARKER)) for (const x of m[1].split(",")) numbers.push(Number(x.trim()));
  const text = sentence.replace(MARKER, "").replace(/\s+/g, " ").replace(/\s+([.!?؟۔،,])/g, "$1").trim();
  return { text, numbers: [...new Set(numbers)] };
}

export function overlap(sentence: string, passageTexts: string[]): number {
  const want = [...new Set(contentTokens(sentence))];
  if (want.length === 0) return 0;
  const have = new Set(passageTexts.flatMap((t) => contentTokens(t)));
  return want.filter((t) => have.has(t)).length / want.length;
}

export function guard(raw: string, passages: GuardPassage[]): GuardResult {
  const byN = new Map(passages.map((p) => [p.n, p]));
  const sentences: GuardedSentence[] = [];
  const dropped: GuardResult["dropped"] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\n+/)) {
    for (const piece of splitSentences(line)) {
      if (!piece.trim() || piece.trim() === "NO_ANSWER") continue;
      const { text, numbers } = parseCitations(piece);
      if (!text) continue;
      if (numbers.length === 0) {
        dropped.push({ text, reason: "no-citation" });
        continue;
      }
      const cited = numbers.map((n) => byN.get(n));
      if (cited.some((c) => !c)) {
        dropped.push({ text, reason: "invalid-citation" });
        continue;
      }
      const real = cited as GuardPassage[];
      if (contentTokens(text).length < 2) {
        dropped.push({ text, reason: "no-content" });
        continue;
      }
      if (overlap(text, real.map((c) => c.text)) < MIN_OVERLAP) {
        dropped.push({ text, reason: "low-overlap" });
        continue;
      }
      if (seen.has(text)) continue;
      seen.add(text);
      sentences.push({ text, passageIds: real.map((c) => c.id) });
    }
  }
  return { sentences, dropped, fallbackToVerbatim: sentences.length < MIN_SURVIVORS };
}
