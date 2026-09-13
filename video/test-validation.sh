#!/usr/bin/env bash
set -euo pipefail
root=$(git rev-parse --show-toplevel)
cd "$root"
mkdir -p video/work
test_dir=$(mktemp -d "$root/video/work/validation.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=navy:s=1280x720:r=1:d=241 -an -c:v libx264 -preset ultrafast -pix_fmt yuv420p "$test_dir/long.mp4"
ffmpeg -hide_banner -loglevel error -i "$test_dir/long.mp4" -t 120 -c copy "$test_dir/caption.mp4"
ffmpeg -hide_banner -loglevel error -i "$test_dir/caption.mp4" -f lavfi -i sine=frequency=440:sample_rate=48000:duration=120 -map 0:v -map 1:a -c:v copy -c:a aac -shortest "$test_dir/tone-fixture.mp4"
bash video/validate.sh --caption-only "$test_dir/caption.mp4" >/dev/null
echo 'PASS: 120-second 720p caption-only fixture passes technical mode.'
bash video/validate.sh "$test_dir/tone-fixture.mp4" >/dev/null
echo 'PASS: audible test-tone fixture passes technical audio checks (not human narration).'
expect_failure() {
  local description=$1
  shift
  if "$@" >"$test_dir/failure.txt" 2>&1; then
    echo "FAIL: $description was accepted" >&2
    exit 1
  fi
  echo "PASS: $description rejected."
}
expect_failure 'missing narration in human mode' bash video/validate.sh "$test_dir/caption.mp4"
expect_failure 'audio in explicitly silent caption mode' bash video/validate.sh --caption-only "$test_dir/tone-fixture.mp4"
expect_failure '241-second video' bash video/validate.sh --caption-only "$test_dir/long.mp4"
ffmpeg -hide_banner -loglevel error -i "$test_dir/caption.mp4" -t 119 -c copy "$test_dir/short.mp4"
expect_failure '119-second video' bash video/validate.sh --caption-only "$test_dir/short.mp4"
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=navy:s=640x360:r=1:d=120 -an -c:v libx264 -preset ultrafast "$test_dir/small.mp4"
expect_failure '360p source' bash video/validate.sh --caption-only "$test_dir/small.mp4"
ffmpeg -hide_banner -loglevel error -i "$test_dir/caption.mp4" -f lavfi -i anullsrc=r=48000:cl=mono -map 0:v -map 1:a -c:v copy -c:a aac -t 120 "$test_dir/silent.mp4"
expect_failure 'silent narration' bash video/validate.sh "$test_dir/silent.mp4"
expect_failure 'absent human audio at assembly' bash video/assemble.sh "$test_dir/missing.wav" video/attestation.example.json "$test_dir/output.mp4" "$test_dir/caption.mp4"
expect_failure 'unattested generated test audio at assembly' bash video/assemble.sh "$test_dir/tone-fixture.mp4" video/attestation.example.json "$test_dir/output.mp4" "$test_dir/caption.mp4"
head -c 100 "$test_dir/caption.mp4" > "$test_dir/corrupt.mp4"
expect_failure 'corrupt media' bash video/validate.sh --caption-only "$test_dir/corrupt.mp4"
echo 'All 11 technical checks passed using real ffmpeg/ffprobe. Generated color/tone/silence are test fixtures only and never submission footage.'
