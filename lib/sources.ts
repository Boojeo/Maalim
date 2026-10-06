// Verbatim access to the official source APIs (HadeethEnc, QuranEnc). Everything returned is copied exactly as
// published; this code never writes, edits, translates or summarises religious text (CLAUDE.md rule 1).
import type { Lang, Level, Passage } from "./types";

export type Fetcher = (url: string) => Promise<unknown>;

export const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

/** Node's fetch ignores HTTPS_PROXY by default; scripts call this once so they also work behind a proxy (e.g. cloud sandboxes). */
export async function enableEnvProxy(): Promise<void> {
  if (!(process.env.HTTPS_PROXY || process.env.https_proxy)) return;
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- HadeethEnc ---------------------------------------------------------------------------------

export const HADEETH_API = "https://hadeethenc.com/api/v1";
export const hadeethUrl = (id: string, lang: Lang) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`;

export interface HadeethItem {
  id: string;
  title: string;
  hadeeth: string;
  attribution: string;
  grade: string;
  explanation: string;
  categories: string[];
}

export interface CategoryInfo {
  id: string;
  title: string;
  hadeeths_count: string;
  parent_id: string | null;
}

export async function listCategories(fetcher: Fetcher = defaultFetcher): Promise<CategoryInfo[]> {
  return (await fetcher(`${HADEETH_API}/categories/list/?language=en`)) as CategoryInfo[];
}

/** Ids of one category in the site's own order (all pages). */
export async function listCategoryIds(categoryId: string, fetcher: Fetcher = defaultFetcher, pause = 0): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; page < 50; page++) {
    const r = (await fetcher(`${HADEETH_API}/hadeeths/list/?language=en&category_id=${categoryId}&page=${page}&per_page=50`)) as {
      data: { id: string }[];
      meta: { last_page: number };
    };
    ids.push(...r.data.map((d) => d.id));
    if (page >= Number(r.meta.last_page)) break;
    if (pause) await sleep(pause);
  }
  return ids;
}

export async function getHadeeth(id: string, lang: Lang, fetcher: Fetcher = defaultFetcher): Promise<HadeethItem> {
  return (await fetcher(`${HADEETH_API}/hadeeths/one/?language=${lang}&id=${id}`)) as HadeethItem;
}

/** A candidate is what a reviewer sees when choosing passages. Nothing here is selected or ranked by us. */
export interface Candidate {
  concept_id: string;
  source: "hadeethenc";
  source_id: string;
  categories: string[];
  title_en: string;
  title_ar: string;
  text_en: string;
  text_ar: string;
  attribution_en: string;
  attribution_ar: string;
  grade_en: string;
  grade_ar: string;
  url_en: string;
  url_ar: string;
  fetched_on: string;
}

export async function fetchCandidates(
  conceptId: string,
  categoryIds: string[],
  limit: number,
  fetcher: Fetcher = defaultFetcher,
  pause = 0,
  today = new Date().toISOString().slice(0, 10),
): Promise<Candidate[]> {
  const ordered: string[] = [];
  for (const c of categoryIds) for (const id of await listCategoryIds(c, fetcher, pause)) if (!ordered.includes(id)) ordered.push(id); // site order
  const out: Candidate[] = [];
  for (const id of ordered.slice(0, limit)) {
    const [en, ar] = [await getHadeeth(id, "en", fetcher), await getHadeeth(id, "ar", fetcher)];
    if (pause) await sleep(pause);
    out.push({
      concept_id: conceptId, source: "hadeethenc", source_id: id, categories: en.categories,
      title_en: en.title, title_ar: ar.title, text_en: en.hadeeth, text_ar: ar.hadeeth,
      attribution_en: en.attribution, attribution_ar: ar.attribution, grade_en: en.grade, grade_ar: ar.grade,
      url_en: hadeethUrl(id, "en"), url_ar: hadeethUrl(id, "ar"), fetched_on: today,
    });
  }
  return out;
}

/** Passages for the hadith ids a reviewer chose: Arabic and English, exactly as published, always unverified. */
export async function hadeethPassages(
  conceptId: string,
  level: Level,
  ids: string[],
  opts: { explanations?: boolean } = {},
  fetcher: Fetcher = defaultFetcher,
): Promise<Passage[]> {
  const out: Passage[] = [];
  for (const id of ids) {
    for (const lang of ["ar", "en"] as const) {
      const item = await getHadeeth(id, lang, fetcher);
      const base = { concept_id: conceptId, lang, source: "hadeethenc" as const, source_url: hadeethUrl(id, lang), level, verified: false, verified_by: null, verified_on: null };
      out.push({ ...base, id: `${conceptId}-hd${id}-${lang}`, source_id: id, text: item.hadeeth });
      if (opts.explanations && item.explanation) out.push({ ...base, id: `${conceptId}-hd${id}-expl-${lang}`, source_id: `${id} (explanation)`, text: item.explanation });
    }
  }
  return out;
}

// ---- QuranEnc -----------------------------------------------------------------------------------

export const QURAN_API = "https://quranenc.com/api/v1";
export const quranUrl = (key: string, sura: number, lang: Lang) => `https://quranenc.com/${lang}/browse/${key}/${sura}`;

interface Ayah {
  sura: string;
  aya: string;
  arabic_text: string;
  translation: string;
}

export async function getAyah(key: string, sura: number, aya: number, fetcher: Fetcher = defaultFetcher): Promise<Ayah> {
  return ((await fetcher(`${QURAN_API}/translation/aya/${key}/${sura}/${aya}`)) as { result: Ayah }).result;
}

/** "sura:aya" or "sura:from-to" -> list of [sura, aya]. */
export function parseAyahRef(ref: string): [number, number][] {
  const m = ref.trim().match(/^(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!m) throw new Error(`bad ayah reference "${ref}" (use 112:1 or 112:1-4)`);
  const [sura, from] = [Number(m[1]), Number(m[2])];
  const to = m[3] ? Number(m[3]) : from;
  if (to < from || to - from > 30) throw new Error(`bad ayah range "${ref}"`);
  return Array.from({ length: to - from + 1 }, (_, i) => [sura, from + i] as [number, number]);
}

/** One passage per ayah and language (Arabic text and the chosen translation), verbatim, unverified. */
export async function quranPassages(
  conceptId: string,
  level: Level,
  translationKey: string,
  refs: string[],
  fetcher: Fetcher = defaultFetcher,
): Promise<Passage[]> {
  const out: Passage[] = [];
  for (const ref of refs) {
    for (const [sura, aya] of parseAyahRef(ref)) {
      const a = await getAyah(translationKey, sura, aya, fetcher);
      const base = { concept_id: conceptId, source: "quranenc" as const, source_id: `${sura}:${aya}`, level, verified: false, verified_by: null, verified_on: null };
      out.push({ ...base, id: `${conceptId}-q${sura}-${aya}-ar`, lang: "ar", source_url: quranUrl(translationKey, sura, "ar"), text: a.arabic_text });
      out.push({ ...base, id: `${conceptId}-q${sura}-${aya}-en`, lang: "en", source_url: quranUrl(translationKey, sura, "en"), text: a.translation });
    }
  }
  return out;
}
