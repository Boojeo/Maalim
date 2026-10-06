// Supabase implementation of DataStore. Used only when SUPABASE_URL + a key are configured.
// NOTE: not exercised against a live database in the cloud sandbox (no credentials); the SQL is in
// supabase/migrations. Learner-safety is enforced here (content-gate) and by RLS for anon keys.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "../env";
import { isLearnerItem, isLearnerPassage, releaseReferralTexts } from "../content-gate";
import type {
  CachedExplanation,
  Concept,
  Curriculum,
  Item,
  ItemStatus,
  Passage,
  ProgressEvent,
  StudyResult,
  Referral,
  ReferralFile,
  ReferralStatus,
  Stage,
  VideoEntry,
} from "../types";
import type { DataStore, ExplanationKey } from "./store";

type Row = Record<string, unknown>;

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`supabase: ${res.error.message}`);
  return res.data as T;
}

export function createSupabaseStore(client?: SupabaseClient): DataStore {
  const env = getEnv();
  const db =
    client ??
    createClient(env.supabaseUrl!, env.supabaseServiceRoleKey ?? env.supabaseAnonKey!, {
      auth: { persistSession: false },
    });

  const readFile = <T>(file: string): T =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", file), "utf8")) as T;

  const toConcept = (r: Row, reqs: string[]): Concept => ({
    id: r.id as string,
    title_ar: r.title_ar as string,
    title_en: r.title_en as string,
    level: r.level as Concept["level"],
    order: r.ord as number,
    prerequisites: reqs,
    objectives_en: (r.objectives_en as string[]) ?? [],
    reviewed_by: (r.reviewed_by as string | null) ?? null,
  });

  async function concepts(): Promise<Concept[]> {
    const cs = must(await db.from("concepts").select("*").order("ord")) as Row[];
    const ps = must(await db.from("prerequisites").select("*")) as Row[];
    return cs.map((c) =>
      toConcept(c, ps.filter((p) => p.concept_id === c.id).map((p) => p.requires_id as string)),
    );
  }

  const toPassage = (r: Row): Passage => r as unknown as Passage;
  const toItem = (r: Row): Item => r as unknown as Item;

  return {
    kind: "supabase",
    async getCurriculum(): Promise<Curriculum> {
      const stages = readFile<{ stages: Stage[] }>("curriculum.json").stages;
      return { stages, concepts: await concepts() };
    },
    async getConcept(id) {
      return (await concepts()).find((c) => c.id === id) ?? null;
    },
    async getPassages({ conceptId, lang, learner }) {
      let q = db.from("passages").select("id,concept_id,lang,source,source_id,source_url,text,level,verified,verified_by,verified_on");
      if (conceptId) q = q.eq("concept_id", conceptId);
      if (lang) q = q.eq("lang", lang);
      return (must(await q) as Row[]).map(toPassage).filter((p) => !learner || isLearnerPassage(p));
    },
    async getPassage(id) {
      const r = must(await db.from("passages").select("*").eq("id", id).maybeSingle()) as Row | null;
      return r ? toPassage(r) : null;
    },
    async getVideos(conceptId) {
      return (must(await db.from("videos").select("*").eq("concept_id", conceptId)) as Row[]).map(
        (r) => r as unknown as VideoEntry,
      );
    },
    async getUnit(conceptId) {
      const r = must(await db.from("units").select("*").eq("concept_id", conceptId).maybeSingle()) as Row | null;
      if (!r) return null;
      return {
        id: r.id as string,
        concept_id: conceptId,
        order: r.ord as number,
        hook_ar: (r.hook_ar as string) ?? "",
        hook_en: (r.hook_en as string) ?? "",
        video_ids: ((r.steps as { video_ids?: string[] })?.video_ids as string[]) ?? [],
        check_item_id: (r.check_item_id as string | null) ?? null,
        misconception_ar: (r.misconception_ar as string) ?? "",
        misconception_en: (r.misconception_en as string) ?? "",
        verified: Boolean(r.verified),
        reviewed_by: (r.reviewed_by as string | null) ?? null,
      };
    },
    async getItems({ conceptId, status, learner }) {
      let q = db.from("items").select("*");
      if (conceptId) q = q.eq("concept_id", conceptId);
      if (status) q = q.eq("status", status);
      const items = (must(await q) as Row[]).map(toItem);
      if (!learner) return items;
      const ps = new Map(
        (must(await db.from("passages").select("*")) as Row[]).map((r) => [r.id as string, toPassage(r)]),
      );
      return items.filter((i) => isLearnerItem(i, ps));
    },
    async upsertItems(items) {
      must(await db.from("items").upsert(items));
    },
    async setItemStatus(id, status: ItemStatus, reviewer) {
      const r = must(
        await db
          .from("items")
          .update({ status, reviewed_by: reviewer, reviewed_on: new Date().toISOString().slice(0, 10) })
          .eq("id", id)
          .select()
          .maybeSingle(),
      ) as Row | null;
      return r ? toItem(r) : null;
    },
    async getReferralTexts() {
      return releaseReferralTexts(readFile<ReferralFile>("referrals.json"));
    },
    async getCachedExplanation(key: ExplanationKey) {
      const r = must(
        await db
          .from("explanations_cache")
          .select("*")
          .eq("concept_id", key.concept_id)
          .eq("level", key.level)
          .eq("lang", key.lang)
          .eq("query_hash", key.query_hash)
          .maybeSingle(),
      ) as Row | null;
      return r ? (r as unknown as CachedExplanation) : null;
    },
    async putCachedExplanation(entry) {
      must(await db.from("explanations_cache").upsert(entry));
    },
    async addReferral(r) {
      return must(await db.from("referrals").insert(r).select().single()) as unknown as Referral;
    },
    async listReferrals() {
      return (must(await db.from("referrals").select("*").order("created_at", { ascending: false })) as Row[]).map(
        (r) => r as unknown as Referral,
      );
    },
    async listExplanations() {
      return (must(await db.from("explanations_cache").select("*")) as Row[]).map((r) => r as unknown as CachedExplanation);
    },
    async setExplanationStatus(key: ExplanationKey, status, reviewer) {
      const r = must(
        await db
          .from("explanations_cache")
          .update({ status, reviewed_by: reviewer })
          .eq("concept_id", key.concept_id)
          .eq("level", key.level)
          .eq("lang", key.lang)
          .eq("query_hash", key.query_hash)
          .select()
          .maybeSingle(),
      ) as Row | null;
      return r ? (r as unknown as CachedExplanation) : null;
    },
    async addStudyResult(r: StudyResult) {
      must(await db.from("study_results").insert(r));
    },
    async listStudyResults() {
      return (must(await db.from("study_results").select("group_code,concept_id,pre_correct,pre_total,post_correct,post_total,day")) as Row[]).map(
        (r) => r as unknown as StudyResult,
      );
    },
    async addEvent(e: ProgressEvent) {
      must(await db.from("progress_events").insert(e));
    },
    async listEvents() {
      return (must(await db.from("progress_events").select("concept_id,kind,day")) as Row[]).map((r) => r as unknown as ProgressEvent);
    },
    async setReferralStatus(id: string, status: ReferralStatus) {
      must(await db.from("referrals").update({ status }).eq("id", id));
    },
  };
}
