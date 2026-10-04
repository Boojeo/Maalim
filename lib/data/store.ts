import type {
  CachedExplanation,
  Concept,
  Curriculum,
  Item,
  ItemStatus,
  Lang,
  Passage,
  ProgressEvent,
  Referral,
  ReferralStatus,
  ReferralTexts,
  Unit,
  VideoEntry,
} from "../types";

export interface ExplanationKey {
  concept_id: string;
  level: string;
  lang: Lang;
  query_hash: string;
}

/**
 * Typed access to all content. Two implementations: local JSON (default) and Supabase.
 * Methods with a `learner` flag return only learner-safe rows (see lib/content-gate.ts).
 */
export interface DataStore {
  readonly kind: "local" | "supabase";
  getCurriculum(): Promise<Curriculum>;
  getConcept(id: string): Promise<Concept | null>;
  getPassages(opts: { conceptId?: string; lang?: Lang; learner: boolean }): Promise<Passage[]>;
  getPassage(id: string): Promise<Passage | null>;
  getVideos(conceptId: string): Promise<VideoEntry[]>;
  getUnit(conceptId: string): Promise<Unit | null>;
  getItems(opts: { conceptId?: string; status?: ItemStatus; learner: boolean }): Promise<Item[]>;
  upsertItems(items: Item[]): Promise<void>;
  setItemStatus(id: string, status: ItemStatus, reviewer: string | null): Promise<Item | null>;
  getReferralTexts(): Promise<ReferralTexts>;
  getCachedExplanation(key: ExplanationKey): Promise<CachedExplanation | null>;
  putCachedExplanation(entry: CachedExplanation): Promise<void>;
  addReferral(r: Omit<Referral, "id" | "created_at" | "status">): Promise<Referral>;
  listReferrals(): Promise<Referral[]>;
  setReferralStatus(id: string, status: ReferralStatus): Promise<void>;
  addEvent(e: ProgressEvent): Promise<void>;
  listEvents(): Promise<ProgressEvent[]>;
}
