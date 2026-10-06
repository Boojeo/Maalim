// F9: A/B pre/post study. Group A reads a static page, group B uses the Ma'ālim unit. Results are anonymous:
// one row per finished run holding pre and post scores, so no pairing id is needed.
import { safeCount } from "./aggregates";
import type { Item, StudyResult } from "./types";

/** Stable split into two parallel forms: even positions -> pre-test, odd -> post-test (items sorted by id). */
export function splitItems(items: Item[]): { pre: Item[]; post: Item[] } {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  return { pre: sorted.filter((_, i) => i % 2 === 0), post: sorted.filter((_, i) => i % 2 === 1) };
}

export const MIN_ITEMS_FOR_STUDY = 2;

export interface GroupSummary {
  group: "A" | "B";
  /** Number of finished runs, hidden (null) below the suppression threshold. */
  n: number | null;
  meanPre: number | null;
  meanPost: number | null;
  gain: number | null;
}

export interface StudySummary {
  groups: GroupSummary[];
  /** Gain(B) - gain(A) in percentage points, only when both groups are large enough to show. */
  difference: number | null;
  total: number;
}

const rate = (c: number, t: number) => (t === 0 ? null : c / t);

export function summariseStudy(results: StudyResult[]): StudySummary {
  const groups = (["A", "B"] as const).map((group): GroupSummary => {
    const rs = results.filter((r) => r.group_code === group);
    const n = safeCount(rs.length);
    if (n === null || rs.length === 0) return { group, n, meanPre: null, meanPost: null, gain: null };
    const pre = rate(rs.reduce((a, r) => a + r.pre_correct, 0), rs.reduce((a, r) => a + r.pre_total, 0));
    const post = rate(rs.reduce((a, r) => a + r.post_correct, 0), rs.reduce((a, r) => a + r.post_total, 0));
    return { group, n, meanPre: pre, meanPost: post, gain: pre !== null && post !== null ? post - pre : null };
  });
  const [a, b] = groups;
  return { groups, difference: a.gain !== null && b.gain !== null ? b.gain - a.gain : null, total: results.length };
}
