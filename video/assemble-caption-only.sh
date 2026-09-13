#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
mkdir -p video/final
ens_clip=${ENS_CLIP:-video/captures/ens-live/capture.mp4}
ffmpeg -hide_banner -loglevel error -n \
  -i video/captures/live-interactive/capture.mp4 \
  -i video/captures/compare-readable/capture.mp4 \
  -i "$ens_clip" \
  -i video/captures/reproduce-final/capture.mp4 \
  -filter_complex '[0:v]trim=duration=80,setpts=PTS-STARTPTS[first];[1:v]trim=duration=30,setpts=PTS-STARTPTS[second];[2:v]trim=duration=20,setpts=PTS-STARTPTS[third];[3:v]trim=duration=20,setpts=PTS-STARTPTS[fourth];[first][second][third][fourth]concat=n=4:v=1:a=0,subtitles=video/captions.srt:force_style='\''FontName=DejaVu Sans,FontSize=11,PrimaryColour=&H00FFFFFF,OutlineColour=&H00111111,BorderStyle=3,Outline=1,MarginV=8,MarginL=12,MarginR=12'\''[video]' \
  -map '[video]' -an -r 30 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -movflags +faststart video/final/ainize-ethonline2026-caption-only.mp4
bash video/validate.sh --caption-only video/final/ainize-ethonline2026-caption-only.mp4 > video/final/caption-only.validation.json
sha256sum video/final/ainize-ethonline2026-caption-only.mp4
echo 'Caption-only review artifact. Missing human narration; NOT a compliant final video.'
