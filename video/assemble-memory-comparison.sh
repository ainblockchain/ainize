#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p video/final
ffmpeg -hide_banner -loglevel warning -n \
  -i video/captures/memory-comparison-final/capture.mp4 \
  -vf "pad=1400:1096:0:0:black,subtitles=video/memory-comparison.srt:force_style='FontName=DejaVu Sans,FontSize=7,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,Alignment=2,MarginV=5'" \
  -an -c:v libx264 -threads 2 -preset ultrafast -crf 18 -pix_fmt yuv420p -movflags +faststart \
  video/final/ainize-memory-before-after.mp4
bash video/validate.sh --caption-only video/final/ainize-memory-before-after.mp4
