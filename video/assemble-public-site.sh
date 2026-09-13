#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p video/final
ffmpeg -hide_banner -loglevel warning -n \
  -i video/captures/public-site-clean/capture.mp4 \
  -vf "pad=1280:916:0:0:black,subtitles=video/public-site-captions.srt:force_style='FontName=DejaVu Sans,FontSize=8,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,Alignment=2,MarginV=6'" \
  -an -c:v libx264 -threads 2 -preset ultrafast -crf 18 -pix_fmt yuv420p -movflags +faststart \
  video/final/ainize-public-site-demo.mp4
bash video/validate.sh --caption-only video/final/ainize-public-site-demo.mp4
