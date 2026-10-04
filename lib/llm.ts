// Provider-agnostic LLM client. ALL model calls go through here (CLAUDE.md).
// Adapters: mock (deterministic, extractive), hosted (OpenAI-compatible or Anthropic Messages), allam (OpenAI-compatible endpoint).
// Always temperature 0.
import { getEnv } from "./env";
import { splitSentences, contentTokens } from "./text";

export interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface LlmResponse {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface LlmClient {
  readonly provider: "mock" | "hosted" | "allam";
  readonly model: string;
  generate(req: LlmRequest): Promise<LlmResponse>;
}

const approxTokens = (s: string) => Math.ceil(s.length / 4);

/**
 * Mock adapter. It only EXTRACTS: it picks sentences that already exist in the numbered passages of an
 * explain prompt and tags them with their passage number. It never writes new content.
 */
export const mockLlm: LlmClient = {
  provider: "mock",
  model: "mock-extractive-v1",
  async generate({ system, user }) {
    const t0 = performance.now();
    const topic = /^Topic:\s*(.*)$/m.exec(user)?.[1] ?? "";
    const parts = user.split(/^\[(\d+)\]\s+\(id:[^)]*\)\s*/m).slice(1); // [n, text, n, text, ...]
    const cands: { n: string; s: string; score: number; order: number }[] = [];
    const want = new Set(contentTokens(topic));
    let order = 0;
    for (let i = 0; i + 1 < parts.length; i += 2) {
      for (const s of splitSentences(parts[i + 1].trim())) {
        const score = contentTokens(s).filter((x) => want.has(x)).length;
        cands.push({ n: parts[i], s, score, order: order++ });
      }
    }
    cands.sort((a, b) => b.score - a.score || a.order - b.order);
    const picked = cands.slice(0, 4).sort((a, b) => a.order - b.order);
    const text = picked.map((c) => `${c.s.replace(/\s*\[\d+\]\s*$/g, "")} [${c.n}]`).join("\n");
    return {
      text,
      provider: "mock",
      model: "mock-extractive-v1",
      inputTokens: approxTokens(system + user),
      outputTokens: approxTokens(text),
      latencyMs: performance.now() - t0,
    };
  },
};

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`llm: HTTP ${res.status}`);
  return res.json();
}

export function createOpenAiCompatible(opts: {
  provider: "hosted" | "allam";
  baseUrl: string;
  apiKey: string;
  model: string;
}): LlmClient {
  return {
    provider: opts.provider,
    model: opts.model,
    async generate({ system, user, maxTokens = 600 }) {
      const t0 = performance.now();
      const json = (await postJson(
        `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`,
        { authorization: `Bearer ${opts.apiKey}` },
        {
          model: opts.model,
          temperature: 0,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
      )) as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
      const text = json.choices?.[0]?.message?.content ?? "";
      return {
        text,
        provider: opts.provider,
        model: opts.model,
        inputTokens: json.usage?.prompt_tokens ?? approxTokens(system + user),
        outputTokens: json.usage?.completion_tokens ?? approxTokens(text),
        latencyMs: performance.now() - t0,
      };
    },
  };
}

export function createAnthropic(opts: { apiKey: string; model: string; baseUrl?: string }): LlmClient {
  return {
    provider: "hosted",
    model: opts.model,
    async generate({ system, user, maxTokens = 600 }) {
      const t0 = performance.now();
      const json = (await postJson(
        `${(opts.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`,
        { "x-api-key": opts.apiKey, "anthropic-version": "2023-06-01" },
        { model: opts.model, max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: user }] },
      )) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
      const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
      return {
        text,
        provider: "hosted",
        model: opts.model,
        inputTokens: json.usage?.input_tokens ?? approxTokens(system + user),
        outputTokens: json.usage?.output_tokens ?? approxTokens(text),
        latencyMs: performance.now() - t0,
      };
    },
  };
}

/** Selects the adapter from env; falls back to mock when anything is missing. */
export function getLlm(): LlmClient {
  const env = getEnv();
  if (env.llmProvider === "hosted" && env.llmApiKey && env.llmModel) {
    if ((process.env.LLM_API_STYLE ?? "openai") === "anthropic") {
      return createAnthropic({ apiKey: env.llmApiKey, model: env.llmModel, baseUrl: process.env.LLM_API_URL });
    }
    return createOpenAiCompatible({
      provider: "hosted",
      baseUrl: process.env.LLM_API_URL ?? "https://api.openai.com/v1",
      apiKey: env.llmApiKey,
      model: env.llmModel,
    });
  }
  if (env.llmProvider === "allam" && env.allamEndpoint && env.allamToken) {
    return createOpenAiCompatible({
      provider: "allam",
      baseUrl: env.allamEndpoint,
      apiKey: env.allamToken,
      model: process.env.ALLAM_MODEL ?? "allam",
    });
  }
  return mockLlm;
}
