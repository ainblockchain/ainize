import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from validate import duration, probe, require, validate


def digest(path):
    hashed = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            hashed.update(chunk)
    return hashed.hexdigest()


def assemble():
    audio, declaration, output, *clips = [Path(value).resolve() for value in sys.argv[1:]]
    root = Path(__file__).resolve().parents[1]
    require(output.is_relative_to(root), 'Output must stay inside the submission repository.')
    require(not output.exists(), 'Refusing to overwrite existing output.')
    require(audio.is_file() and declaration.is_file() and clips, 'Real audio, attestation, and captured clips are required.')
    attestation = json.loads(declaration.read_text())
    require(bool(attestation.get('human_name', '').strip()), 'A human must identify themselves in the attestation.')
    for field in ['human_voice_only', 'desktop_capture', 'normal_speed', 'reviewed_source_clips', 'no_music_replacing_narration']:
        require(attestation.get(field) is True, f'Human attestation missing: {field}')
    require(attestation.get('audio_sha256') == digest(audio), 'Attestation must match the actual human audio SHA-256.')
    clip_hashes = [digest(clip) for clip in clips]
    require(attestation.get('clip_sha256') == clip_hashes, 'Attest the actual clips in playback order.')
    audio_info = probe(audio)
    require(any(stream['codec_type'] == 'audio' for stream in audio_info['streams']), 'Input has no audio stream.')
    audio_length = duration(audio_info, 'audio')
    require(120 <= audio_length <= 239, 'Record 120–239 seconds of human narration; target 180.')
    clip_lengths = []
    for clip in clips:
        info = probe(clip)
        streams = [stream for stream in info['streams'] if stream['codec_type'] == 'video']
        require(len(streams) == 1 and streams[0]['width'] >= 1280 and streams[0]['height'] >= 720, f'Clip must have one video stream at least 1280×720: {clip.name}')
        clip_lengths.append(duration(info, 'video'))
    require(abs(sum(clip_lengths) - audio_length) <= 0.5, 'Capture/trim clips to match narration within 0.5s. No looping, padding, or speed changes are performed.')
    output.parent.mkdir(parents=True, exist_ok=True)
    work = root / 'video/work'
    work.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=work) as temporary:
        folder = Path(temporary)
        for index, clip in enumerate(clips):
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-i', str(clip), '-map', '0:v:0', '-an', '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', str(folder / f'clip-{index}.mp4')], check=True)
        listing = folder / 'clips.txt'
        listing.write_text(''.join(f"file 'clip-{index}.mp4'\n" for index in range(len(clips))))
        candidate = folder / 'candidate.mp4'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', str(listing), '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', str(audio_length), '-movflags', '+faststart', str(candidate)], check=True)
        report = validate(candidate)
        candidate.rename(output)
    report.update({'output_sha256': digest(output), 'audio_sha256': digest(audio), 'clip_sha256': clip_hashes, 'attestation': attestation, 'submission_complete': False})
    output.with_suffix('.validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Technical validation passed. Watch the entire export and confirm human narration and evidence before upload. Submission is NOT marked complete.')


if __name__ == '__main__':
    try:
        assemble()
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        print(f'ASSEMBLY FAILED: {error}', file=sys.stderr)
        sys.exit(1)
