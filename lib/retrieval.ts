// retrieve(conceptId, query, lang): verified (learner-safe) passages only, ranked by embedding similarity.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cosine, getEmbedder, type Embedder } from "./embeddings";
import { getStore, type DataStore } from "./data";
import { sha } from "./text";
import type { Lang, Passage } from "./types";

export interface Retrieved {
  passage: Passage;
  score: number;
}

export interface RetrieveDeps {
  store?: DataStore;
  embedder?: Embedder;
}

export interface RetrieveOptions {
  k?: number;
  /** Minimum cosine similarity for a query-based match. */
  minScore?: number;
}

// Embedding cache keyed by provider + text hash (memory; also persisted next to the runtime data).
const memory = new Map<string, number[]>();
const cacheFile = () =>
  path.join(process.env.LOCAL_DATA_DIR ?? (process.env.VERCEL ? path.join(os.tmpdir(), "maalim") : path.join(process.cwd(), ".data")), "embeddings.json");
let diskLoaded = false;

function loadDisk() {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    const obj = JSON.parse(fs.readFileSync(cacheFile(), "utf8")) as Record<string, number[]>;
    for (const [k, v] of Object.entries(obj)) memory.set(k, v);
  } catch {
    /* no cache yet */
  }
}

function persistDisk() {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(Object.fromEntries(memory)));
  } catch {
    /* read-only FS: memory cache only */
  }
}

export async function embedCached(embedder: Embedder, texts: string[]): Promise<number[][]> {
  loadDisk();
  const keys = texts.map((t) => `${embedder.provider}:${sha(t, 24)}`);
  const missing = [...new Set(keys.filter((k) => !memory.has(k)))];
  if (missing.length) {
    const byKey = new Map(keys.map((k, i) => [k, texts[i]]));
    const vecs = await embedder.embed(missing.map((k) => byKey.get(k)!));
    missing.forEach((k, i) => memory.set(k, vecs[i]));
    if (embedder.provider === "hosted") persistDisk();
  }
  return keys.map((k) => memory.get(k)!);
}

/**
 * Returns learner-safe passages for a concept. With a query: ranked by similarity and filtered by minScore.
 * Without a query: all passages of the concept (in the requested language when available).
 * An empty array means "nothing verified to say" and must be handled by the caller.
 */
export async function retrieve(
  conceptId: string,
  query: string,
  lang: Lang,
  opts: RetrieveOptions = {},
  deps: RetrieveDeps = {},
): Promise<Retrieved[]> {
  const store = deps.store ?? getStore();
  const k = opts.k ?? 4;
  let pool = await store.getPassages({ conceptId, lang, learner: true });
  if (pool.length === 0) pool = await store.getPassages({ conceptId, learner: true }); // other language, flagged by passage.lang
  if (pool.length === 0) return [];

  const q = query.trim();
  if (!q) return pool.slice(0, k).map((passage) => ({ passage, score: 1 }));

  const embedder = deps.embedder ?? getEmbedder();
  const [qv, ...pv] = await embedCached(embedder, [q, ...pool.map((p) => p.text)]);
  const minScore = opts.minScore ?? (embedder.provider === "mock" ? 0.12 : 0.3);
  return pool
    .map((passage, i) => ({ passage, score: cosine(qv, pv[i]) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
