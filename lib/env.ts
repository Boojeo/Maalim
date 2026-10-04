// Central env handling. Secrets come from process.env (cloud environment settings);
// anything missing falls back to mock / local adapters. Server-side only.

export type LlmProvider = "mock" | "hosted" | "allam";
export type EmbeddingProvider = "mock" | "hosted";

function val(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function getEnv() {
  const llmRequested = val("LLM_PROVIDER") ?? "mock";
  const embRequested = val("EMBEDDING_PROVIDER") ?? "mock";

  const llmProvider: LlmProvider =
    llmRequested === "hosted" && val("LLM_API_KEY") && val("LLM_MODEL")
      ? "hosted"
      : llmRequested === "allam" && val("ALLAM_ENDPOINT_URL") && val("ALLAM_API_TOKEN")
        ? "allam"
        : "mock";

  const embeddingProvider: EmbeddingProvider =
    embRequested === "hosted" && val("EMBEDDING_API_KEY") ? "hosted" : "mock";

  const supabaseConfigured = Boolean(val("SUPABASE_URL") && val("SUPABASE_ANON_KEY"));

  return {
    llmProvider,
    llmApiKey: val("LLM_API_KEY"),
    llmModel: val("LLM_MODEL"),
    allamEndpoint: val("ALLAM_ENDPOINT_URL"),
    allamToken: val("ALLAM_API_TOKEN"),
    embeddingProvider,
    embeddingApiKey: val("EMBEDDING_API_KEY"),
    embeddingModel: val("EMBEDDING_MODEL") ?? "bge-m3",
    supabaseUrl: val("SUPABASE_URL"),
    supabaseAnonKey: val("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: val("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseConfigured,
    allowUnverified: process.env.DEV_ALLOW_UNVERIFIED === "1",
    isProduction: process.env.NODE_ENV === "production",
  };
}

/** Names only, never values: which variables are present. Safe to show on /dev. */
export function envReport(): { name: string; set: boolean; fallback: string }[] {
  const rows: [string, string][] = [
    ["LLM_PROVIDER", "mock adapter"],
    ["LLM_API_KEY", "mock adapter"],
    ["LLM_MODEL", "mock adapter"],
    ["ALLAM_ENDPOINT_URL", "not used"],
    ["ALLAM_API_TOKEN", "not used"],
    ["EMBEDDING_PROVIDER", "mock embedder"],
    ["EMBEDDING_API_KEY", "mock embedder"],
    ["SUPABASE_URL", "local JSON fallback"],
    ["SUPABASE_ANON_KEY", "local JSON fallback"],
    ["SUPABASE_SERVICE_ROLE_KEY", "local JSON fallback"],
    ["DEV_ALLOW_UNVERIFIED", "off (learners never see unverified content)"],
  ];
  return rows.map(([name, fallback]) => ({ name, set: val(name) !== undefined, fallback }));
}
