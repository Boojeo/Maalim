// Raw loaders for /content/*.json (server only). Phase 2 builds the typed data layer on top.
import fs from "node:fs";
import path from "node:path";
import type { Curriculum, Passage, VideoEntry } from "./types";

const dir = path.join(process.cwd(), "content");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as T;
}

export function readCurriculumFile(): Curriculum {
  return readJson<Curriculum>("curriculum.json");
}
export function readPassagesFile(): Passage[] {
  return readJson<{ passages: Passage[] }>("passages.json").passages;
}
export function readVideosFile(): VideoEntry[] {
  return readJson<{ videos: VideoEntry[] }>("videos.json").videos;
}
