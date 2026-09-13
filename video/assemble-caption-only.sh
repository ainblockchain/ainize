#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
mkdir -p video/final
ffmpeg -hide_banner -loglevel error -n \
  -i video/captures/graph-final/capture.mp4 \
  -i video/captures/upload-final/capture.mp4 \
  -i video/captures/compare-final/capture.mp4 \
  -i video/captures/ens-final/capture.mp4 \
  -i video/captures/reproduce-final/capture.mp4 \
  -filter_complex '[0:v]trim=duration=50,setpts=PTS-STARTPTS[first];[1:v]trim=duration=30,setpts=PTS-STARTPTS[second];[2:v]trim=duration=30,setpts=PTS-STARTPTS[third];[3:v]trim=duration=20,setpts=PTS-STARTPTS[fourth];[4:v]trim=duration=20,setpts=PTS-STARTPTS[fifth];[first][second][third][fourth][fifth]concat=n=5:v=1:a=0,subtitles=video/captions.srt:force_style='\''FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00111111,BorderStyle=3,Outline=2,MarginV=18'\''[video]' \
  -map '[video]' -an -r 30 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -movflags +faststart video/final/ainize-ethonline2026-caption-only.mp4
bash video/validate.sh --caption-only video/final/ainize-ethonline2026-caption-only.mp4 > video/final/caption-only.validation.json
sha256sum video/final/ainize-ethonline2026-caption-only.mp4
echo 'Caption-only review artifact. Missing human narration; NOT a compliant final video.'
