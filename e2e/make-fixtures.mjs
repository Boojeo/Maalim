// Generates tiny SYNTHETIC clips + captions (colour bars, no religious content) before the server starts.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "videos");
fs.mkdirSync(path.join(dir, "captions"), { recursive: true });
for (const key of ["1_one", "2_two"]) {
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=10:duration=2", "-pix_fmt", "yuv420p", "-c:v", "libx264", path.join(dir, `wudu-main_${key}.mp4`)],
    { stdio: "inherit" },
  );
}
const vtt = (t) => `WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n${t}\n`;
fs.writeFileSync(path.join(dir, "captions", "wudu-main.en.vtt"), vtt("SYNTHETIC caption"));
fs.writeFileSync(path.join(dir, "captions", "wudu-main.ar.vtt"), vtt("SYNTHETIC caption (ar)"));
