// Local JSON fallback: content from /content/*.json (read-only) plus a small writable runtime
// file for referrals, review decisions and the explanation cache. On Vercel the runtime file
// lives in /tmp (ephemeral) - use Supabase for persistence.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isLearnerItem, isLearnerPassage, releaseReferralTexts } from "../content-gate";
import type {
  CachedExplanation,
  Curriculum,
  Item,
  Passage,
  ProgressEvent,
  StudyResult,
  Referral,
  ReferralFile,
  ReferralStatus,
  Unit,
  VideoEntry,
} from "../types";
import type { DataStore, ExplanationKey } from "./store";

interface Runtime {
  itemOverrides: Record<string, Pick<Item, "status" | "reviewed_by" | "reviewed_on">>;
  extraItems: Item[];
  explanations: CachedExplanation[];
  referrals: Referral[];
  events: ProgressEvent[];
  study: StudyResult[];
}

const emptyRuntime = (): Runtime => ({ itemOverrides: {}, extraItems: [], explanations: [], referrals: [], events: [], study: [] });

function dataDir(): string {
  if (process.env.LOCAL_DATA_DIR) return process.env.LOCAL_DATA_DIR;
  return process.env.VERCEL ? path.join(os.tmpdir(), "maalim") : path.join(process.cwd(), ".data");
}

export function createLocalStore(contentDir = process.env.CONTENT_DIR ?? path.join(process.cwd(), "content")): DataStore {
  const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8")) as T;
  const runtimeFile = () => path.join(dataDir(), "runtime.json");

  function loadRuntime(): Runtime {
    try {
      return { ...emptyRuntime(), ...(JSON.parse(fs.readFileSync(runtimeFile(), "utf8")) as Partial<Runtime>) };
    } catch {
      return emptyRuntime();
    }
  }
  function saveRuntime(r: Runtime) {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(runtimeFile(), JSON.stringify(r, null, 2));
  }

  const curriculum = () => read<Curriculum>("curriculum.json");
  const passages = () => read<{ passages: Passage[] }>("passages.json").passages;
  const baseItems = () => read<{ items: Item[] }>("items.json").items;

  function allItems(): Item[] {
    const rt = loadRuntime();
    const byId = new Map<string, Item>();
    for (const i of baseItems()) byId.set(i.id, i);
    for (const i of rt.extraItems) byId.set(i.id, i);
    return [...byId.values()].map((i) => ({ ...i, ...(rt.itemOverrides[i.id] ?? {}) }));
  }

  return {
    kind: "local",
    async getCurriculum() {
      return curriculum();
    },
    async getConcept(id) {
      return curriculum().concepts.find((c) => c.id === id) ?? null;
    },
    async getPassages({ conceptId, lang, learner }) {
      return passages().filter(
        (p) =>
          (!conceptId || p.concept_id === conceptId) &&
          (!lang || p.lang === lang) &&
          (!learner || isLearnerPassage(p)),
      );
    },
    async getPassage(id) {
      return passages().find((p) => p.id === id) ?? null;
    },
    async getVideos(conceptId) {
      return read<{ videos: VideoEntry[] }>("videos.json").videos.filter((v) => v.concept_id === conceptId);
    },
    async getUnit(conceptId) {
      return read<{ units: Unit[] }>("units.json").units.find((u) => u.concept_id === conceptId) ?? null;
    },
    async getItems({ conceptId, status, learner }) {
      const byId = new Map(passages().map((p) => [p.id, p]));
      return allItems().filter(
        (i) =>
          (!conceptId || i.concept_id === conceptId) &&
          (!status || i.status === status) &&
          (!learner || isLearnerItem(i, byId)),
      );
    },
    async upsertItems(items) {
      const rt = loadRuntime();
      for (const item of items) {
        rt.extraItems = rt.extraItems.filter((e) => e.id !== item.id);
        rt.extraItems.push(item);
      }
      saveRuntime(rt);
    },
    async setItemStatus(id, status, reviewer) {
      const rt = loadRuntime();
      if (!allItems().some((i) => i.id === id)) return null;
      rt.itemOverrides[id] = {
        status,
        reviewed_by: reviewer,
        reviewed_on: new Date().toISOString().slice(0, 10),
      };
      saveRuntime(rt);
      return allItems().find((i) => i.id === id) ?? null;
    },
    async getReferralTexts() {
      return releaseReferralTexts(read<ReferralFile>("referrals.json"));
    },
    async getCachedExplanation(key: ExplanationKey) {
      return (
        loadRuntime().explanations.find(
          (e) =>
            e.concept_id === key.concept_id &&
            e.level === key.level &&
            e.lang === key.lang &&
            e.query_hash === key.query_hash,
        ) ?? null
      );
    },
    async putCachedExplanation(entry) {
      const rt = loadRuntime();
      rt.explanations = rt.explanations.filter(
        (e) =>
          !(
            e.concept_id === entry.concept_id &&
            e.level === entry.level &&
            e.lang === entry.lang &&
            e.query_hash === entry.query_hash
          ),
      );
      rt.explanations.push(entry);
      saveRuntime(rt);
    },
    async addReferral(r) {
      const rt = loadRuntime();
      const referral: Referral = { ...r, id: randomUUID(), created_at: new Date().toISOString(), status: "new" };
      rt.referrals.push(referral);
      saveRuntime(rt);
      return referral;
    },
    async listReferrals() {
      return loadRuntime().referrals.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async listExplanations() {
      return loadRuntime().explanations;
    },
    async setExplanationStatus(key: ExplanationKey, status, reviewer) {
      const rt = loadRuntime();
      const e = rt.explanations.find(
        (x) => x.concept_id === key.concept_id && x.level === key.level && x.lang === key.lang && x.query_hash === key.query_hash,
      );
      if (!e) return null;
      e.status = status;
      e.reviewed_by = reviewer;
      saveRuntime(rt);
      return e;
    },
    async addStudyResult(r) {
      const rt = loadRuntime();
      rt.study.push(r);
      saveRuntime(rt);
    },
    async listStudyResults() {
      return loadRuntime().study;
    },
    async addEvent(e) {
      const rt = loadRuntime();
      rt.events.push(e);
      saveRuntime(rt);
    },
    async listEvents() {
      return loadRuntime().events;
    },
    async setReferralStatus(id: string, status: ReferralStatus) {
      const rt = loadRuntime();
      const r = rt.referrals.find((x) => x.id === id);
      if (r) r.status = status;
      saveRuntime(rt);
    },
  };
}
