import { getEnv } from "../env";
import { createLocalStore } from "./local";
import { createSupabaseStore } from "./supabase";
import { applyAvailability } from "../availability";
import type { DataStore } from "./store";

export type { DataStore } from "./store";

let cached: DataStore | null = null;

/** Supabase when configured, otherwise the local JSON fallback. */
export function getStore(): DataStore {
  if (!cached) {
    const base = getEnv().supabaseConfigured ? createSupabaseStore() : createLocalStore();
    // Future-work flags are applied once, here, so every page sees the same curriculum.
    cached = {
      ...base,
      getCurriculum: async () => applyAvailability(await base.getCurriculum()),
      getConcept: async (id) => (await cached!.getCurriculum()).concepts.find((c) => c.id === id) ?? null,
    };
  }
  return cached;
}

export function resetStoreForTests() {
  cached = null;
}
