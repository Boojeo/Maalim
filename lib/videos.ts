// Resolves which clip files exist for a video entry. A clip is playable only if permission is
// "granted" (CLAUDE.md rule 9), the file exists, and at least one caption track exists.
import fs from "node:fs";
import path from "node:path";
import { isPlayableVideo } from "./content-gate";
import type { Lang, VideoEntry } from "./types";

export type VideoBlock = "permission" | "missing-file" | "missing-captions" | null;

export interface ResolvedClip {
  n: number;
  key: string;
  label_en: string;
  src: string;
}

export interface ResolvedVideo {
  id: string;
  kind: VideoEntry["kind"];
  title_ar: string;
  credit: string | null;
  creditPending: boolean;
  blocked: VideoBlock;
  clips: ResolvedClip[];
  fullSrc: string | null;
  captions: Partial<Record<Lang, string>>;
}

export function resolveVideo(v: VideoEntry, publicDir = path.join(process.cwd(), "public")): ResolvedVideo {
  const exists = (rel: string) => fs.existsSync(path.join(publicDir, rel));
  const stepClips = v.steps
    .filter((s) => s.use)
    .map((s) => ({ n: s.n, key: s.key, label_en: s.label_en, src: `/videos/${v.id}_${s.n}_${s.key}.mp4` }))
    .filter((c) => exists(c.src));
  const full = `/videos/${v.id}_full.mp4`;
  const fullSrc = exists(full) ? full : null;
  // Scenario clips without steps are served whole as /videos/<id>.mp4.
  const whole = `/videos/${v.id}.mp4`;
  const clips = stepClips.length > 0 ? stepClips : exists(whole) ? [{ n: 1, key: "whole", label_en: v.title_ar, src: whole }] : [];

  const captions: Partial<Record<Lang, string>> = {};
  for (const lang of ["ar", "en"] as const) {
    const rel = `/videos/captions/${v.id}.${lang}.vtt`;
    if (exists(rel)) captions[lang] = rel;
  }

  let blocked: VideoBlock = null;
  if (!isPlayableVideo(v)) blocked = "permission";
  else if (clips.length === 0 && !fullSrc) blocked = "missing-file";
  else if (!captions.ar && !captions.en) blocked = "missing-captions";

  const creditPending = !v.creator_credit || v.creator_credit.startsWith("TODO");
  return {
    id: v.id,
    kind: v.kind,
    title_ar: v.title_ar,
    credit: creditPending ? null : v.creator_credit,
    creditPending,
    blocked,
    clips: blocked ? [] : clips,
    fullSrc: blocked ? null : fullSrc,
    captions,
  };
}
