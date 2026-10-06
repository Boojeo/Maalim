import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVideo } from "@/lib/videos";
import type { VideoEntry } from "@/lib/types";

const video = (over: Partial<VideoEntry> = {}): VideoEntry => ({
  id: "v", concept_id: "wudu", kind: "lesson", title_ar: "t", source_file: "x", permission: "granted",
  creator_credit: "Someone", timestamps_verified: true,
  steps: [{ n: 1, key: "hands", label_en: "Hands", start: "0:00", end: "0:05", use: true }], ...over,
});

function pub(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-pub-"));
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), "x");
  }
  return dir;
}

describe("resolveVideo", () => {
  it("blocks clips without granted permission, even if files exist", () => {
    const dir = pub(["videos/v_1_hands.mp4", "videos/captions/v_1_hands.en.vtt"]);
    expect(resolveVideo(video({ permission: "pending" }), dir).blocked).toBe("permission");
  });
  it("blocks missing files", () => {
    expect(resolveVideo(video(), pub([])).blocked).toBe("missing-file");
  });
  it("blocks playback without captions", () => {
    expect(resolveVideo(video(), pub(["videos/v_1_hands.mp4"])).blocked).toBe("missing-captions");
  });
  it("captions must belong to the clip: a whole-video caption file does not unlock a step clip", () => {
    expect(resolveVideo(video(), pub(["videos/v_1_hands.mp4", "videos/captions/v.en.vtt"])).blocked).toBe("missing-captions");
  });
  it("only clips that have their own captions are offered", () => {
    const two = video({ steps: [
      { n: 1, key: "hands", label_en: "Hands", start: "0:00", end: "0:05", use: true },
      { n: 2, key: "face", label_en: "Face", start: "0:05", end: "0:10", use: true },
    ] });
    const r = resolveVideo(two, pub(["videos/v_1_hands.mp4", "videos/v_2_face.mp4", "videos/captions/v_2_face.ar.vtt"]));
    expect(r.blocked).toBeNull();
    expect(r.clips.map((c) => c.key)).toEqual(["face"]);
  });
  it("plays when granted + file + captions, and reports credit state", () => {
    const r = resolveVideo(video(), pub(["videos/v_1_hands.mp4", "videos/captions/v_1_hands.ar.vtt"]));
    expect(r.blocked).toBeNull();
    expect(r.clips).toHaveLength(1);
    expect(r.clips[0].captions.ar).toBe("/videos/captions/v_1_hands.ar.vtt");
    expect(r.credit).toBe("Someone");
    expect(resolveVideo(video({ creator_credit: "TODO: x" }), pub([])).creditPending).toBe(true);
  });
  it("in the repo's real videos.json every video whose permission is not 'granted' is blocked", async () => {
    const { createLocalStore } = await import("@/lib/data/local");
    const vids = await createLocalStore().getVideos("wudu");
    expect(vids.length).toBeGreaterThan(0);
    // wudu-main was set to 'granted' by the owner on 2026-10-06 (temporary override, see STATUS.md)
    for (const v of vids.filter((x) => x.permission !== "granted")) expect(resolveVideo(v).blocked).not.toBeNull();
  });
});
