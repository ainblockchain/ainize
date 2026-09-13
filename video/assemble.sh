#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -lt 4 ]; then
  echo 'Usage: bash video/assemble.sh human-audio.wav attestation.json output.mp4 clip1.mp4 [clip2.mp4 ...]' >&2
  exit 2
fi
root=$(cd "$(dirname "$0")/.." && pwd)
python3 "$root/video/assemble.py" "$@"
