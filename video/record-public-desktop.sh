#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
output="${1:-video/captures/public-site}"
seconds="${2:-180}"
[[ "$output" =~ ^video/captures/[a-zA-Z0-9_-]+$ ]] || { echo 'Use a new video/captures/name directory.' >&2; exit 2; }
[[ "$seconds" =~ ^[0-9]+$ ]] && (( seconds >= 120 && seconds <= 240 )) || { echo 'Duration must be 120–240 seconds.' >&2; exit 2; }
[[ -n "${DISPLAY:-}" ]] || { echo 'DISPLAY must identify the actual browser desktop.' >&2; exit 2; }
mkdir "$output"
started="$(date -u +%FT%TZ)"
printf 'Recording actual desktop from %s for %s seconds\n' "$started" "$seconds"
printf '{"startedAt":"%s","seconds":%s,"source":"actual X11 desktop with Chromium and the official MetaMask extension","website":"https://www.ainize.ai/","mockedProvider":false,"audio":false}\n' "$started" "$seconds" > "$output/capture.json"
ffmpeg -hide_banner -loglevel warning -n -f x11grab -video_size 1280x820 -framerate 15 \
  -i "$DISPLAY" -t "$seconds" -an -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
  -movflags +faststart "$output/capture.mp4"
sha256sum "$output/capture.mp4" > "$output/SHA256SUMS.txt"
