import type { Item } from "./types";

export type Response = string | string[];

export function gradeItem(item: Item, response: Response): boolean {
  if (item.type === "mcq") return typeof response === "string" && response === item.answer;
  if (!Array.isArray(response) || !Array.isArray(item.answer)) return false;
  return response.length === item.answer.length && response.every((r, i) => r === (item.answer as string[])[i]);
}

/** Deterministic shuffle so server and client render the same order for a given item. */
export function seededOrder<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
