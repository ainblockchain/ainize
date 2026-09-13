#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
output="${1:-video/captures/public-site}"
seconds="${2:-180}"
width="${CAPTURE_WIDTH:-1280}"
height="${CAPTURE_HEIGHT:-820}"
[[ "$width" =~ ^[0-9]+$ && "$height" =~ ^[0-9]+$ ]] && (( width >= 1280 && height >= 820 && width % 2 == 0 && height % 2 == 0 )) || { echo 'Use even capture dimensions of at least 1280 by 820.' >&2; exit 2; }
[[ "$output" =~ ^video/captures/[a-zA-Z0-9_-]+$ ]] || { echo 'Use a new video/captures/name directory.' >&2; exit 2; }
[[ "$seconds" =~ ^[0-9]+$ ]] && (( seconds >= 120 && seconds <= 240 )) || { echo 'Duration must be 120–240 seconds.' >&2; exit 2; }
[[ -n "${DISPLAY:-}" ]] || { echo 'DISPLAY must identify the actual browser desktop.' >&2; exit 2; }
mkdir "$output"
started="$(date -u +%FT%TZ)"
printf 'Recording actual desktop from %s for %s seconds\n' "$started" "$seconds"
printf '{"startedAt":"%s","seconds":%s,"width":%s,"height":%s,"source":"actual X11 desktop with Chromium and the official MetaMask extension","website":"https://www.ainize.ai/","mockedProvider":false,"audio":false}\n' "$started" "$seconds" "$width" "$height" > "$output/capture.json"
ffmpeg -hide_banner -loglevel warning -n -f x11grab -video_size "${width}x${height}" -framerate 15 \
  -i "$DISPLAY" -t "$seconds" -an -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
  -movflags +faststart "$output/capture.mp4"
sha256sum "$output/capture.mp4" > "$output/SHA256SUMS.txt"
