#!/usr/bin/env bash
# Re-encode the wudu source video to web-ready H.264 and cut one clip per step.
# Needs FFmpeg and jq.  Usage: bash scripts/make_clips.sh
# Reads step times from content/videos.json (only steps with "use": true).
# Run it AFTER Mohammed has confirmed the timestamps and permission is granted.
set -euo pipefail

JSON="content/videos.json"
OUT="public/videos"
mkdir -p "$OUT"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v jq >/dev/null || { echo "jq not found"; exit 1; }

ENC=(-vf "scale=-2:1280,fps=30" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart)

jq -c '.videos[] | select(.steps | length > 0)' "$JSON" | while read -r video; do
  id=$(echo "$video" | jq -r '.id')
  src=$(echo "$video" | jq -r '.source_file')
  perm=$(echo "$video" | jq -r '.permission')
  verified=$(echo "$video" | jq -r '.timestamps_verified')
  if [[ "$perm" != "granted" ]]; then echo "SKIP $id: permission is '$perm'"; continue; fi
  if [[ "$verified" != "true" ]]; then echo "WARN $id: timestamps not verified yet"; fi
  if [[ ! -f "$src" ]]; then echo "SKIP $id: missing $src"; continue; fi
  # full re-encoded version
  ffmpeg -y -loglevel error -i "$src" "${ENC[@]}" "$OUT/${id}_full.mp4"
  # one clip per step
  echo "$video" | jq -c '.steps[] | select(.use == true)' | while read -r step; do
    key=$(echo "$step" | jq -r '.key'); n=$(echo "$step" | jq -r '.n')
    s=$(echo "$step" | jq -r '.start'); e=$(echo "$step" | jq -r '.end')
    ffmpeg -y -loglevel error -ss "$s" -to "$e" -i "$src" "${ENC[@]}" "$OUT/${id}_${n}_${key}.mp4"
    echo "made $OUT/${id}_${n}_${key}.mp4  ($s - $e)"
  done
done
echo "done"
