import { getEnv } from "../env";
import { createLocalStore } from "./local";
import { createSupabaseStore } from "./supabase";
import type { DataStore } from "./store";

export type { DataStore } from "./store";

let cached: DataStore | null = null;

/** Supabase when configured, otherwise the local JSON fallback. */
export function getStore(): DataStore {
  if (!cached) cached = getEnv().supabaseConfigured ? createSupabaseStore() : createLocalStore();
  return cached;
}

export function resetStoreForTests() {
  cached = null;
}
