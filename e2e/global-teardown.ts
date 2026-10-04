import fs from "node:fs";
import path from "node:path";

export default function teardown() {
  const dir = path.join(process.cwd(), "public", "videos");
  for (const f of ["wudu-main_1_one.mp4", "wudu-main_2_two.mp4", "captions/wudu-main.en.vtt", "captions/wudu-main.ar.vtt"]) {
    fs.rmSync(path.join(dir, f), { force: true });
  }
  fs.rmSync(path.join(dir, "captions"), { force: true, recursive: true });
}
