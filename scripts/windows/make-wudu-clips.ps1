<#
  Cuts and re-encodes the step clips for one video in content/videos.json (Windows PowerShell).
  Needs ffmpeg in PATH. Reads the step times from content/videos.json (steps with "use": true).

  Usage (from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\windows\make-wudu-clips.ps1 `
      -Source "C:\Users\abdul\Downloads\Downlaoder\<the downloaded file>.webm"

  Output: public\videos\<id>_<n>_<key>.mp4  (each should be under 8 MB)
  It never copies the source video into the repo, and it does NOT change "permission" in videos.json:
  set that to "granted" yourself only after the creator has given written permission.
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$VideoId = "wudu-main",
  [switch]$IncludeFull
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw "ffmpeg not found in PATH. Install it (winget install Gyan.FFmpeg) and reopen PowerShell." }
if (-not (Test-Path -LiteralPath $Source)) { throw "Source file not found: $Source" }

$json = Get-Content -LiteralPath (Join-Path $repo "content\videos.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$video = $json.videos | Where-Object { $_.id -eq $VideoId }
if (-not $video) { throw "No video '$VideoId' in content/videos.json" }
if ($video.permission -ne "granted") { Write-Warning "permission is '$($video.permission)': the app will not play these clips until it is 'granted' and a creator credit is filled in." }
if (-not $video.timestamps_verified) { Write-Warning "timestamps are not verified yet (+/- 3 s). Have the Sharia reviewer confirm them against the source text." }

$out = Join-Path $repo "public\videos"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$enc = @("-vf", "scale=-2:1280,fps=30", "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart")

foreach ($step in ($video.steps | Where-Object { $_.use -eq $true })) {
  $name = "{0}_{1}_{2}.mp4" -f $VideoId, $step.n, $step.key
  $dest = Join-Path $out $name
  & ffmpeg -y -loglevel error -ss $step.start -to $step.end -i $Source @enc $dest
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $name" }
  $mb = [math]::Round((Get-Item $dest).Length / 1MB, 2)
  $flag = if ($mb -gt 8) { "  <-- over 8 MB, lower quality (raise -crf)" } else { "" }
  Write-Host ("made {0}  ({1} - {2}, {3} MB){4}" -f $name, $step.start, $step.end, $mb, $flag)
}

if ($IncludeFull) {
  $dest = Join-Path $out ("{0}_full.mp4" -f $VideoId)
  & ffmpeg -y -loglevel error -i $Source @enc $dest
  Write-Host ("made {0}  ({1} MB)" -f (Split-Path $dest -Leaf), [math]::Round((Get-Item $dest).Length / 1MB, 2))
}
Write-Host "done. Next: captions (npx tsx scripts/split-captions.ts $VideoId), then commit only public/videos/*.mp4 and captions."
