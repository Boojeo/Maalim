export type Level = "L1" | "L2" | "L3" | "L4";
export type Lang = "ar" | "en";

export interface Concept {
  id: string;
  title_ar: string;
  title_en: string;
  level: Level;
  order: number;
  prerequisites: string[];
  objectives_en: string[];
  reviewed_by: string | null;
}

export interface Stage {
  id: number;
  slug: string;
  title_ar: string;
  title_en: string;
}

export interface Curriculum {
  stages: Stage[];
  concepts: Concept[];
}

export interface Passage {
  id: string;
  concept_id: string;
  lang: Lang;
  source: "quranenc" | "hadeethenc" | "islamhouse";
  source_id: string;
  source_url: string;
  text: string;
  level: Level;
  verified: boolean;
  verified_by: string | null;
  verified_on: string | null;
}

export interface VideoStep {
  n: number;
  key: string;
  label_en: string;
  start: string;
  end: string;
  use: boolean;
  note?: string;
}

export interface VideoEntry {
  id: string;
  concept_id: string;
  kind: "lesson" | "scenario" | "reference";
  title_ar: string;
  source_file: string;
  youtube_id?: string;
  format?: string;
  permission: "granted" | "pending" | "denied" | string;
  creator_credit: string;
  timestamps_verified: boolean;
  steps: VideoStep[];
  note?: string;
}

export const PLACEHOLDER_RE = /\[CONTENT NEEDED[^\]]*\]/;

export function isPlaceholder(text: string): boolean {
  return PLACEHOLDER_RE.test(text);
}
