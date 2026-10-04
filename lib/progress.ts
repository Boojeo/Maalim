// Local-only progress (CLAUDE.md rule 6). Pure logic here; storage hook in lib/progress-client.ts.
import type { Concept } from "./types";

export interface ConceptProgress {
  started: boolean;
  done: boolean;
  attempts: number;
  correct: number;
  updatedAt: string | null;
}

export interface ProgressState {
  version: 1;
  stage: 0 | 1 | 2 | 3;
  concepts: Record<string, ConceptProgress>;
}

export type ConceptStatus = "locked" | "available" | "in_progress" | "done";

export const emptyProgress = (): ProgressState => ({ version: 1, stage: 0, concepts: {} });

export const emptyConcept = (): ConceptProgress => ({
  started: false,
  done: false,
  attempts: 0,
  correct: 0,
  updatedAt: null,
});

export function conceptStatus(concept: Concept, state: ProgressState): ConceptStatus {
  const p = state.concepts[concept.id];
  if (p?.done) return "done";
  if (p?.started) return "in_progress";
  const unmet = concept.prerequisites.some((r) => !state.concepts[r]?.done);
  return unmet ? "locked" : "available";
}

export function unmetPrerequisites(concept: Concept, state: ProgressState): string[] {
  return concept.prerequisites.filter((r) => !state.concepts[r]?.done);
}

/** First unfinished concept (curriculum order) whose prerequisites are done; else the first unfinished one. */
export function nextConcept(concepts: Concept[], state: ProgressState): Concept | null {
  const ordered = [...concepts].sort((a, b) => a.order - b.order);
  const open = ordered.filter((c) => !state.concepts[c.id]?.done);
  return open.find((c) => unmetPrerequisites(c, state).length === 0) ?? open[0] ?? null;
}

export function markStarted(state: ProgressState, id: string, now = new Date()): ProgressState {
  const cur = state.concepts[id] ?? emptyConcept();
  if (cur.started) return state;
  return { ...state, concepts: { ...state.concepts, [id]: { ...cur, started: true, updatedAt: now.toISOString() } } };
}

export function markDone(state: ProgressState, id: string, now = new Date()): ProgressState {
  const cur = state.concepts[id] ?? emptyConcept();
  return {
    ...state,
    concepts: { ...state.concepts, [id]: { ...cur, started: true, done: true, updatedAt: now.toISOString() } },
  };
}

export function recordAttempt(state: ProgressState, id: string, correct: boolean, now = new Date()): ProgressState {
  const cur = state.concepts[id] ?? emptyConcept();
  return {
    ...state,
    concepts: {
      ...state.concepts,
      [id]: {
        ...cur,
        started: true,
        attempts: cur.attempts + 1,
        correct: cur.correct + (correct ? 1 : 0),
        updatedAt: now.toISOString(),
      },
    },
  };
}

/** Defensive parse: anything malformed becomes an empty state. */
export function parseProgress(raw: string | null): ProgressState {
  if (!raw) return emptyProgress();
  try {
    const v = JSON.parse(raw) as Partial<ProgressState>;
    if (v?.version !== 1 || typeof v.concepts !== "object" || v.concepts === null) return emptyProgress();
    const stage = [0, 1, 2, 3].includes(v.stage as number) ? (v.stage as ProgressState["stage"]) : 0;
    return { version: 1, stage, concepts: v.concepts as ProgressState["concepts"] };
  } catch {
    return emptyProgress();
  }
}

// ---- F6: mastery and next step -------------------------------------------------------------

export const WEAK_BELOW = 0.6;
export const MIN_ATTEMPTS_FOR_MASTERY = 2;

/** Share of correct check/practice answers, or null while there is too little evidence. */
export function mastery(state: ProgressState, id: string): number | null {
  const p = state.concepts[id];
  if (!p || p.attempts < MIN_ATTEMPTS_FOR_MASTERY) return null;
  return p.correct / p.attempts;
}

/** Finished concepts that deserve another look, weakest first. */
export function weakConcepts(concepts: Concept[], state: ProgressState): Concept[] {
  return concepts
    .filter((c) => state.concepts[c.id]?.done && (mastery(state, c.id) ?? 1) < WEAK_BELOW)
    .sort((a, b) => (mastery(state, a.id) ?? 1) - (mastery(state, b.id) ?? 1));
}

export interface Recommendation {
  /** continue = unit in progress, next = first unlocked unit, locked-next = only locked units remain, done = all finished. */
  kind: "continue" | "next" | "locked-next" | "done";
  primary: Concept | null;
  /** A weak finished concept to revisit (shown as a gentle suggestion, never forced). */
  review: Concept | null;
}

/**
 * Next step respecting the prerequisite graph. The learner can always override by opening any
 * landmark; this only decides what is suggested.
 */
export function recommend(concepts: Concept[], state: ProgressState): Recommendation {
  const ordered = [...concepts].sort((a, b) => a.order - b.order);
  const review = weakConcepts(ordered, state)[0] ?? null;
  const open = ordered.filter((c) => !state.concepts[c.id]?.done);
  const inProgress = open.find((c) => state.concepts[c.id]?.started && unmetPrerequisites(c, state).length === 0);
  if (inProgress) return { kind: "continue", primary: inProgress, review };
  const unlocked = open.find((c) => unmetPrerequisites(c, state).length === 0);
  if (unlocked) return { kind: "next", primary: unlocked, review };
  if (open[0]) return { kind: "locked-next", primary: open[0], review };
  return { kind: "done", primary: null, review };
}

export function setStage(state: ProgressState, stage: ProgressState["stage"]): ProgressState {
  return { ...state, stage };
}
