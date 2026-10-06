// Resolves which clip files exist for a video entry. A clip is playable only if permission is
// "granted" (CLAUDE.md rule 9), the file exists, and at least one checked caption track exists
// (captions marked "NOTE DRAFT" are hidden from learners until a person removes the marker).
import fs from "node:fs";
import path from "node:path";
import { isPlayableVideo, unverifiedAllowed } from "./content-gate";
import type { Lang, VideoEntry } from "./types";

export type VideoBlock = "permission" | "missing-file" | "missing-captions" | null;

export interface ResolvedClip {
  n: number;
  key: string;
  label_en: string;
  src: string;
  /** Caption tracks that match THIS clip's own timeline. */
  captions: Partial<Record<Lang, string>>;
}

export interface ResolvedVideo {
  id: string;
  kind: VideoEntry["kind"];
  title_ar: string;
  credit: string | null;
  creditPending: boolean;
  blocked: VideoBlock;
  /** Playable clips only (permission granted, file present, captions present for that clip). */
  clips: ResolvedClip[];
}

/** Machine/unchecked captions carry a "NOTE DRAFT" line; they count as unverified (CLAUDE.md rule 2 spirit). */
function isDraftCaption(file: string): boolean {
  try {
    return /^NOTE\s+DRAFT/m.test(fs.readFileSync(file, "utf8").slice(0, 600));
  } catch {
    return false;
  }
}

/**
 * Files, relative to public/:
 *  - step clip:   videos/<id>_<n>_<key>.mp4  + videos/captions/<id>_<n>_<key>.<ar|en>.vtt
 *  - whole clip:  videos/<id>.mp4            + videos/captions/<id>.<ar|en>.vtt
 *  - full re-encode (fallback when no step clips): videos/<id>_full.mp4 + videos/captions/<id>.<ar|en>.vtt
 * Captions are per clip because step clips are cut from a longer video: a caption file for the whole
 * video would be out of sync with every step clip (scripts/split-captions.ts produces the per-clip files).
 */
export function resolveVideo(
  v: VideoEntry,
  publicDir = path.join(process.cwd(), "public"),
  allowDraftCaptions = unverifiedAllowed(),
): ResolvedVideo {
  const exists = (rel: string) => fs.existsSync(path.join(publicDir, rel));
  const captionsFor = (base: string): Partial<Record<Lang, string>> => {
    const out: Partial<Record<Lang, string>> = {};
    for (const lang of ["ar", "en"] as const) {
      const rel = `/videos/captions/${base}.${lang}.vtt`;
      if (exists(rel) && (allowDraftCaptions || !isDraftCaption(path.join(publicDir, rel)))) out[lang] = rel;
    }
    return out;
  };

  const stepClips: ResolvedClip[] = v.steps
    .filter((s) => s.use)
    .map((s) => {
      const base = `${v.id}_${s.n}_${s.key}`;
      return { n: s.n, key: s.key, label_en: s.label_en, src: `/videos/${base}.mp4`, captions: captionsFor(base) };
    })
    .filter((c) => exists(c.src));

  let candidates = stepClips;
  if (candidates.length === 0) {
    const single = [`/videos/${v.id}.mp4`, `/videos/${v.id}_full.mp4`].find(exists);
    candidates = single ? [{ n: 1, key: "whole", label_en: v.title_ar, src: single, captions: captionsFor(v.id) }] : [];
  }
  const captioned = candidates.filter((c) => c.captions.ar || c.captions.en);

  let blocked: VideoBlock = null;
  if (!isPlayableVideo(v)) blocked = "permission";
  else if (candidates.length === 0) blocked = "missing-file";
  else if (captioned.length === 0) blocked = "missing-captions";

  const creditPending = !v.creator_credit || v.creator_credit.startsWith("TODO");
  return {
    id: v.id,
    kind: v.kind,
    title_ar: v.title_ar,
    credit: creditPending ? null : v.creator_credit,
    creditPending,
    blocked,
    clips: blocked ? [] : captioned,
  };
}
