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

export interface Unit {
  id: string;
  concept_id: string;
  order: number;
  hook_ar: string;
  hook_en: string;
  video_ids: string[];
  check_item_id: string | null;
  misconception_ar: string;
  misconception_en: string;
  verified: boolean;
  reviewed_by: string | null;
}

export type ItemType = "mcq" | "order" | "scenario";
export type ItemStatus = "draft" | "approved" | "rejected";

export interface ItemOption {
  id: string;
  text: string;
}

export interface Item {
  id: string;
  concept_id: string;
  type: ItemType;
  lang: Lang;
  prompt: string;
  options: ItemOption[];
  /** mcq: option id. order/scenario: ordered list of option ids. */
  answer: string | string[];
  source_passage_id: string | null;
  /** Verbatim substring of the source passage that answers the item. */
  source_span: string | null;
  video_id: string | null;
  status: ItemStatus;
  generated_by: string | null;
  reviewed_by: string | null;
  reviewed_on: string | null;
}

export interface Citation {
  passage_id: string;
  source: Passage["source"];
  source_id: string;
  source_url: string;
}

export interface CachedExplanation {
  concept_id: string;
  level: Level;
  lang: Lang;
  query_hash: string;
  text: string;
  citations: Citation[];
  /** pending = generated, awaiting a reviewer; approved / rejected = reviewer decision. */
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string | null;
  created_at: string;
}

/** One finished A/B study run (anonymous; pre and post share a row, so no id is needed). */
export interface StudyResult {
  group_code: "A" | "B";
  concept_id: string;
  pre_correct: number;
  pre_total: number;
  post_correct: number;
  post_total: number;
  day: string;
}

export type ReferralStatus = "new" | "seen" | "closed";

/** No user identifiers (CLAUDE.md rule 6). */
export interface Referral {
  id: string;
  concept_id: string | null;
  question_hash: string;
  level: Level;
  consented_summary: string;
  created_at: string;
  status: ReferralStatus;
}

export interface ReferralTexts {
  L3: Record<Lang, string>;
  L4: Record<Lang, string>;
  out_of_scope: Record<Lang, string>;
  crisis: Record<Lang, string>;
}

/** content/referrals.json: wording is only released to learners once a named reviewer has verified it. */
export interface ReferralFile {
  verified: boolean;
  reviewed_by: string | null;
  referrals: ReferralTexts;
}

/** Anonymous, opt-in progress counters. No identifiers, no timestamps finer than a day. */
export type ProgressEventKind = "unit_done" | "check_correct" | "check_wrong";

export interface ProgressEvent {
  concept_id: string;
  kind: ProgressEventKind;
  /** YYYY-MM-DD */
  day: string;
}
