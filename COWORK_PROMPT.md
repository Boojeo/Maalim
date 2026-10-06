# Cowork hand-off: wudu video clips + captions (runs on the owner's Windows PC)

Why this is needed: the cloud session cannot see the downloaded video, and YouTube blocks its datacenter IP.
Everything below happens on the PC. Nothing here grants permission or verifies content: people do that.

## Before you start (owner, 5 minutes)
1. Have the repo on the PC: `git clone https://github.com/Boojeo/Maalim.git` and `git checkout main`
   (or `claude/cool-euler-wnlcy9`; both have the same files).
2. In Cowork, **select the Maalim folder** as the working folder, so it can read and write there.
3. Have these on the PC (Cowork can install the first two with `winget` if it has a terminal; otherwise do it yourself):
   - `ffmpeg` in PATH: `winget install Gyan.FFmpeg`, then reopen PowerShell
   - Node 22 + `npm install` run once in the repo
   - the downloaded file `wudu_120.webm` (YouTube 6iSdWuL4zlQ). Path used so far:
     `C:\Users\abdul\Downloads\Downlaoder\<file>.webm`
4. Optional, for captions: `yt-dlp` (`winget install yt-dlp`).

## Prompt to paste into Cowork

```
You are helping finish the video part of the Ma'alim app in the folder I selected (the Maalim repo).
Read first: CLAUDE.md, STATUS.md (the "Update 2026-10-06" sections), content/videos.json,
scripts/windows/make-wudu-clips.ps1, scripts/split-captions.ts.

HARD RULES (from CLAUDE.md, do not break):
- Never write, recall, translate or "fix" any Quran, hadith or ruling text from memory.
- Do NOT change "permission" in content/videos.json (stays "pending"), and do NOT set "timestamps_verified".
  A person does those after the creator's written permission and the Sharia reviewer's check.
- Never commit the source video (public/videos/src is gitignored) or any file over 8 MB.
- Do not depict or dramatise the Prophet or the Companions.

TASK
1. My source video is at: <PASTE FULL WINDOWS PATH TO wudu_120.webm HERE>
   Check the file exists and that ffmpeg works (`ffmpeg -version`). If ffmpeg is missing, tell me the
   install command and stop.
2. From the repo root run:
   powershell -ExecutionPolicy Bypass -File scripts\windows\make-wudu-clips.ps1 -Source "<that path>"
   Expected output: public\videos\wudu-main_1_hands.mp4, _2_mouth-nose, _3_face, _4_arms, _5_head, _6_feet
   (6 clips). If any is over 8 MB, re-run only that step with a higher -crf (e.g. 28-30) until it is under 8 MB.
3. Spot-check each clip: duration matches its start/end in content/videos.json (+/- 1 s), it plays, has audio,
   is vertical. Report anything off. Do not edit the timestamps in videos.json; just report.
4. Captions: first try the video's own subtitles, untouched:
   yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "ar,en" --sub-format vtt -o "public/videos/captions/wudu-main.%(ext)s" https://www.youtube.com/watch?v=6iSdWuL4zlQ
   Rename to public/videos/captions/wudu-main.ar.vtt and wudu-main.en.vtt. If a language is not available,
   do NOT write or translate it yourself: leave it out and tell me which language is missing.
   (If you transcribe speech yourself because no subtitles exist, copy only what is spoken, mark the file's
   first NOTE line "DRAFT, unchecked transcription", and flag that a person must check it.)
5. Run `npm run split:captions -- wudu-main`. It writes one file per clip. List which clips got captions
   in each language and which did not (a clip without its own caption stays blocked in the app by design).
6. Run `npm run lint`, `npm run typecheck`, `npm test`. Report results.
7. Stage ONLY public/videos/*.mp4 and public/videos/captions/*.vtt. Show me `git status` and the sizes,
   then commit "Wudu step clips and captions (permission still pending)" on a new branch
   `video/wudu-clips` and push it. Do not open a pull request. Do not touch any other file.

REPORT BACK (short): what was made, sizes, clips/captions missing, any timestamp that looked wrong,
and the exact things a person still has to do:
 (a) get the creator's written permission (AboJody channel) then set permission to "granted",
 (b) person checks the AR + EN captions,
 (c) Sharia reviewer confirms the step timestamps and sets timestamps_verified to true.
```

## What a person must still do (Cowork cannot)
- Ask the creator (قناة أبوجودي / AboJody, youtube.com/@abojody99) for **written permission**; only then set
  `"permission": "granted"` for `wudu-main` in `content/videos.json`.
- Check the Arabic and English captions against the audio.
- The Sharia reviewer confirms step order, number of washes and timestamps, then `timestamps_verified: true`.
- The same applies to `wudu-workplace` (qH_JEpge3Gc) if it will be used: no steps defined yet, whole clip or cut by the reviewer.
  `wudu-reference` is for review only, do not use it in the app.

## If Cowork cannot run commands or push
Ask it to do steps 1-3 and 5 only and leave the files in the folder; then push from your own terminal:
`git checkout -b video/wudu-clips && git add public/videos/*.mp4 public/videos/captions/*.vtt && git commit -m "Wudu step clips and captions" && git push -u origin video/wudu-clips`.
Then tell the cloud session to merge and finish (wire-up, tests, STATUS.md update).
