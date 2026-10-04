// Anonymised aggregates for the mentor dashboard. Small counts are suppressed (k-anonymity style)
// so a single learner cannot be singled out from a table cell.
import type { Level, ProgressEvent, Referral } from "./types";

export const SUPPRESS_BELOW = 3;

/** A count that is hidden (null) when it is positive but below the threshold. */
export const safeCount = (n: number): number | null => (n > 0 && n < SUPPRESS_BELOW ? null : n);

export interface Aggregates {
  referrals: {
    total: number;
    byLevel: Record<Level, number | null>;
    byStatus: Record<string, number | null>;
    byConcept: Record<string, number | null>;
  };
  progress: {
    concept: string;
    unitsDone: number | null;
    checkAnswers: number | null;
    /** 0..1, or null if too few answers to show. */
    accuracy: number | null;
  }[];
}

export function aggregate(referrals: Referral[], events: ProgressEvent[], conceptIds: string[]): Aggregates {
  const tally = <T extends string>(keys: T[]) => {
    const m = new Map<T, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const level = tally(referrals.map((r) => r.level));
  const status = tally(referrals.map((r) => r.status));
  const concept = tally(referrals.map((r) => r.concept_id ?? "none"));
  const obj = <T extends string>(m: Map<T, number>, keys: T[]) =>
    Object.fromEntries(keys.map((k) => [k, safeCount(m.get(k) ?? 0)])) as Record<T, number | null>;

  return {
    referrals: {
      total: referrals.length,
      byLevel: obj(level, ["L1", "L2", "L3", "L4"]),
      byStatus: obj(status, ["new", "seen", "closed"]),
      byConcept: obj(concept, [...conceptIds, "none"]),
    },
    progress: conceptIds.map((id) => {
      const ev = events.filter((e) => e.concept_id === id);
      const done = ev.filter((e) => e.kind === "unit_done").length;
      const right = ev.filter((e) => e.kind === "check_correct").length;
      const answers = right + ev.filter((e) => e.kind === "check_wrong").length;
      return {
        concept: id,
        unitsDone: safeCount(done),
        checkAnswers: safeCount(answers),
        accuracy: answers >= SUPPRESS_BELOW ? right / answers : null,
      };
    }),
  };
}
