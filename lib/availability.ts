// Launch scope: only the wudu landmark is built. The other topics are shown as clearly marked
// "future work" (never as units) until their content has been verified by a Sharia reviewer.
// Override with FUTURE_CONCEPTS="a,b" (an empty value = nothing is future; used by the e2e fixtures).
import type { Concept, Curriculum } from "./types";

const DEFAULT_FUTURE = ["shahada", "tawhid", "quran", "five-pillars", "salah"];

export function futureConceptIds(): string[] {
  const raw = process.env.FUTURE_CONCEPTS;
  if (raw === undefined) return DEFAULT_FUTURE;
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

export const isFuture = (c: Pick<Concept, "availability">) => c.availability === "future";

/** Marks future concepts and stops them from blocking live ones (a built topic never waits on future work). */
export function applyAvailability(cur: Curriculum): Curriculum {
  const future = new Set(futureConceptIds());
  const concepts = cur.concepts.map((c) =>
    future.has(c.id)
      ? { ...c, availability: "future" as const }
      : { ...c, prerequisites: c.prerequisites.filter((r) => !future.has(r)) },
  );
  return { ...cur, concepts };
}
