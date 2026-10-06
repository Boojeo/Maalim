import fs from "node:fs";
import path from "node:path";

export default function teardown() {
  const dir = path.join(process.cwd(), "public", "videos");
  for (const f of ["wudu-main_1_one.mp4", "wudu-main_2_two.mp4", "captions/wudu-main_1_one.en.vtt", "captions/wudu-main_1_one.ar.vtt", "captions/wudu-main_2_two.en.vtt", "captions/wudu-main_2_two.ar.vtt"]) {
    fs.rmSync(path.join(dir, f), { force: true });
  }
  // remove the captions folder only if the fixtures were the only thing in it (never delete real captions)
  try {
    fs.rmdirSync(path.join(dir, "captions"));
  } catch {
    /* not empty: keep */
  }
}
