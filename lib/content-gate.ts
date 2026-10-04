// The single place that decides what a learner may see (CLAUDE.md rules 2, 7, 9).
import { getEnv } from "./env";
import { isPlaceholder, type Item, type Passage, type Unit, type VideoEntry } from "./types";

/** Unverified content is visible only outside production AND with DEV_ALLOW_UNVERIFIED=1. */
export function unverifiedAllowed(): boolean {
  const env = getEnv();
  return env.allowUnverified && !env.isProduction;
}

export function isLearnerPassage(p: Passage, allowUnverified = unverifiedAllowed()): boolean {
  if (allowUnverified) return true;
  return p.verified && !!p.verified_by && !isPlaceholder(p.text);
}

export function isLearnerItem(
  item: Item,
  passagesById: Map<string, Passage>,
  allowUnverified = unverifiedAllowed(),
): boolean {
  if (allowUnverified) return item.status === "approved" || item.status === "draft";
  if (item.status !== "approved") return false;
  if (isPlaceholder(item.prompt) || item.options.some((o) => isPlaceholder(o.text))) return false;
  if (item.source_passage_id) {
    const p = passagesById.get(item.source_passage_id);
    if (!p || !isLearnerPassage(p, false)) return false;
  }
  return true;
}

export function isLearnerUnit(u: Unit, allowUnverified = unverifiedAllowed()): boolean {
  return allowUnverified || u.verified;
}

/** A clip may be played only if permission is granted (CLAUDE.md rule 9). */
export function isPlayableVideo(v: VideoEntry): boolean {
  return v.permission === "granted";
}

/** True if this content would show an unverified-content banner in the UI. */
export function needsBanner(): boolean {
  return unverifiedAllowed();
}
