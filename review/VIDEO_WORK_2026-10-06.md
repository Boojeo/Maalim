# Wudu video work, 2026-10-06

## What was done
1. **Clips:** cut 6 vertical clips (720x1280, H.264 + AAC, crf 26) from the source video with the same ffmpeg settings as `scripts/windows/make-wudu-clips.ps1` (run directly with ffmpeg, no PowerShell). All under 8 MB (1.5-5.1 MB). Lengths match `content/videos.json`; all decode cleanly and have audio.
2. **Step timestamps tightened** (checked against 1-frame-per-second frame sheets and speech timing, about +/-1 s per boundary):

| Step | Old | New |
|---|---|---|
| hands | 0:25-0:34 | unchanged |
| mouth-nose | 0:34-0:52 | 0:34-0:50 |
| face | 0:53-1:08 | 0:51-1:08 |
| arms | 1:09-1:32 | unchanged |
| head | 1:33-1:39 | 1:34-1:41 (now includes the ears) |
| feet | 1:44-2:10 | 1:44-2:09 |

   The affected clips were re-cut.
3. **Captions (Arabic + English): DRAFT machine output.** YouTube subtitles could not be downloaded (network policy blocks it from the sandboxes), so the audio was transcribed with Whisper large-v3 (Arabic speech-to-text; English = the model's machine translation of the Arabic speech). One non-speech hallucinated cue ("ترجمة نانسي قنقر") was removed; nothing else was edited. Files: `public/videos/captions/wudu-main.{ar,en}.vtt` (full timeline) and `wudu-main_<n>_<key>.{ar,en}.vtt` (per clip, made with `npm run split:captions -- wudu-main`). Every file starts with a `NOTE DRAFT` line.
   **Known problems:** the speaker uses dialect; the Arabic has misheard words (e.g. "ثلا", "قص الوجه") and the English has wrong lines (e.g. the arms step is rendered as "I washed my hair"). A person must correct every cue before learners see them.
4. **Checks:** lint, typecheck, 151 unit tests pass.
5. **`content/videos.json` for `wudu-main`:** `permission` = `"granted"` and `timestamps_verified` = `true` **by the owner's explicit instruction (2026-10-06)**, as a temporary setting. These are NOT confirmations from the creator (AboJody channel) or the Sharia reviewer. The other two videos are unchanged (`pending`, `false`).

## What is still needed (to make the temporary setting real)
- Creator's written permission (AboJody channel), otherwise set `permission` back to `"pending"`.
- A person corrects the AR + EN captions.
- The Sharia reviewer confirms the step timestamps and the order/number of washes, otherwise set `timestamps_verified` back to `false`.

## Not done / notes
- `git push` could not run from the sandbox (no GitHub credentials): run `git push -u origin video/wudu-clips`.
- Untracked `ffmpeg.exe`, `ffplay.exe`, `ffprobe.exe`, `yt-dlp.exe` in the repo root were not committed (consider adding them to `.gitignore`).
