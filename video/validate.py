import json
import math
import re
import subprocess
import sys


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ]))


def duration(info, kind=None):
    streams = [stream for stream in info['streams'] if stream['codec_type'] == kind]
    value = streams[0].get('duration') if streams else None
    return float(value or info['format']['duration'])


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(path, caption_only=False):
    info = probe(path)
    videos = [stream for stream in info['streams'] if stream['codec_type'] == 'video']
    audios = [stream for stream in info['streams'] if stream['codec_type'] == 'audio']
    require(len(videos) == 1 and len(audios) == (0 if caption_only else 1), 'Expected one video stream and ' + ('no audio for caption-only review.' if caption_only else 'one narration stream.'))
    video = videos[0]
    require(video['width'] >= 1280 and video['height'] >= 720, 'At least 1280×720 required by this landscape workflow; upscaling cannot restore unreadable source footage.')
    total = duration(info)
    require(math.isfinite(total) and 120 <= total <= 240, 'Duration must be 120–240 seconds.')
    require(video['codec_name'] == 'h264', 'This workflow requires H.264 video.')
    if caption_only:
        subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:v:0', '-f', 'null', '-'], capture_output=True, check=True)
        return {'technical_pass': True, 'duration_seconds': total, 'width': video['width'], 'height': video['height'], 'caption_only': True, 'audio_streams': 0, 'narration_missing': True, 'submission_compliant': False, 'limitation': 'Review artifact only: missing mandatory human narration. Caption timing and source truth still require human review.'}
    require(abs(duration(info, 'audio') - duration(info, 'video')) <= 1, 'Audio and video durations differ by more than one second.')
    require(audios[0]['codec_name'] == 'aac', 'This workflow requires AAC audio.')
    checked = subprocess.run(['ffmpeg', '-hide_banner', '-v', 'info', '-xerror', '-i', str(path), '-map', '0:v:0', '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    match = re.search(r'max_volume: ([-\w.]+) dB', checked.stderr)
    require(match is not None and float(match.group(1)) > -50, 'Audio is silent or effectively inaudible; human narration is required.')
    return {'technical_pass': True, 'duration_seconds': total, 'width': video['width'], 'height': video['height'], 'audio_peak_db': float(match.group(1)), 'human_review_required': True, 'limitations': 'ffprobe cannot establish human authorship, normal source speed, desktop origin, truthful claims, speech intelligibility, or absence of music replacing narration.'}


if __name__ == '__main__':
    try:
        caption_only = len(sys.argv) == 3 and sys.argv[1] == '--caption-only'
        require(len(sys.argv) == 2 or caption_only, 'Usage: bash video/validate.sh [--caption-only] video/final/video.mp4')
        print(json.dumps(validate(sys.argv[-1], caption_only), indent=2))
    except (ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f'VALIDATION FAILED: {error}', file=sys.stderr)
        sys.exit(1)
