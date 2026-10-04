// Provider-agnostic embeddings (no model weights are ever downloaded at runtime).
// mock: deterministic hashed bag-of-words + char trigrams (works for Arabic and English).
// hosted: any OpenAI-compatible /embeddings endpoint (EMBEDDING_API_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL).
import { getEnv } from "./env";
import { tokens } from "./text";

export const EMBEDDING_DIM = 1024;

export interface Embedder {
  readonly provider: "mock" | "hosted";
  embed(texts: string[]): Promise<number[][]>;
}

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function mockVector(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const tok of tokens(text)) {
    v[fnv(tok) % EMBEDDING_DIM] += 2;
    const padded = `#${tok}#`;
    for (let i = 0; i + 3 <= padded.length; i++) v[fnv(padded.slice(i, i + 3)) % EMBEDDING_DIM] += 0.5;
  }
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export const mockEmbedder: Embedder = {
  provider: "mock",
  async embed(texts) {
    return texts.map(mockVector);
  },
};

export function createHostedEmbedder(opts: { apiKey: string; model: string; url?: string }): Embedder {
  const url = opts.url ?? process.env.EMBEDDING_API_URL ?? "https://api.openai.com/v1/embeddings";
  return {
    provider: "hosted",
    async embed(texts) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({ model: opts.model, input: texts }),
      });
      if (!res.ok) throw new Error(`embeddings: HTTP ${res.status}`);
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}

export function getEmbedder(): Embedder {
  const env = getEnv();
  if (env.embeddingProvider === "hosted" && env.embeddingApiKey) {
    return createHostedEmbedder({ apiKey: env.embeddingApiKey, model: env.embeddingModel });
  }
  return mockEmbedder;
}
