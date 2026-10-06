// Splits full-timeline caption files into one caption file per step clip.
// Input:  public/videos/captions/<id>.<ar|en>.vtt   (captions for the WHOLE source video, as a human checked them)
// Output: public/videos/captions/<id>_<n>_<key>.<ar|en>.vtt for every step with "use": true in content/videos.json
// Usage:  npx tsx scripts/split-captions.ts wudu-main
import fs from "node:fs";
import path from "node:path";
import { hasCues, parseTime, sliceVtt } from "../lib/vtt";
import type { VideoEntry } from "../lib/types";

const id = process.argv[2];
if (!id) {
  console.error("Usage: npx tsx scripts/split-captions.ts <video-id>   (e.g. wudu-main)");
  process.exit(1);
}
const videos = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "videos.json"), "utf8")).videos as VideoEntry[];
const video = videos.find((v) => v.id === id);
if (!video) {
  console.error(`No video "${id}" in content/videos.json`);
  process.exit(1);
}
const dir = path.join(process.cwd(), "public", "videos", "captions");
let wrote = 0;
for (const lang of ["ar", "en"] as const) {
  const src = path.join(dir, `${id}.${lang}.vtt`);
  if (!fs.existsSync(src)) {
    console.log(`skip ${lang}: ${path.relative(process.cwd(), src)} not found`);
    continue;
  }
  const full = fs.readFileSync(src, "utf8");
  for (const step of video.steps.filter((s) => s.use)) {
    const vtt = sliceVtt(full, parseTime(step.start), parseTime(step.end));
    const name = `${id}_${step.n}_${step.key}.${lang}.vtt`;
    if (!hasCues(vtt)) {
      console.log(`  ${name}: no captions fall inside ${step.start}-${step.end} (clip stays blocked until it has captions)`);
      continue;
    }
    fs.writeFileSync(path.join(dir, name), vtt);
    wrote++;
    console.log(`  wrote ${name}`);
  }
}
console.log(`done: ${wrote} caption file(s). A person must still check every caption (Arabic) and translation (English).`);
