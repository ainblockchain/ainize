# Video artifacts and reproduction

**Caption-only review video: human narration is unavailable. This is not a compliant final demo.**
Target export: 150 seconds, 1280×720, H.264, no audio, no music, no synthetic voice.
The actual MP4 is published on the [main repository release](https://github.com/ainblockchain/ainize/releases/tag/ethonline2026-review).
Publication and final technical metadata are recorded in [capture evidence](../evidence/video/README.md).

The browser helper captures actual pixels approximately once per second, preserving elapsed wall-clock
intervals in the encoded video. It never changes the application DOM or fabricates a catalogue.
The Graph evidence page is explicitly labeled as a replay of saved command output, not a live product
UI. Cuts remove excess capture tails; timestamps are reset to zero without accelerating playback.

## Capture and assemble the caption-only review

Prerequisites: Node 22+, Python 3.10+, Google Chrome, ffmpeg with libx264/libass, ffprobe.
All writes below stay inside this root repository. Chrome uses an isolated browser context.

```bash
npm install --prefix .video-tools --no-audit --no-fund --ignore-scripts playwright-core@1.58.2
python3 video/evidence-page.py
python3 -m http.server 8766 --bind 127.0.0.1 --directory video/work
```

In another terminal, use fresh capture directories (the encoder refuses overwrites):

```bash
node video/capture.mjs http://127.0.0.1:8766/evidence.html video/captures/graph-final 50
node video/capture.mjs http://127.0.0.1:8766/upload.html video/captures/upload-final 30
node video/capture.mjs http://127.0.0.1:8766/compare.html video/captures/compare-final 30
node video/capture.mjs http://127.0.0.1:8766/ens.html video/captures/ens-final 20
node video/capture.mjs http://127.0.0.1:8766/reproduce.html video/captures/reproduce-final 20
bash video/assemble-caption-only.sh
bash video/validate.sh --caption-only video/final/ainize-ethonline2026-caption-only.mp4
```

The ENS shot renders an excerpt of actual imported registrar source; it is not a Sepolia demonstration.
The upload and comparison shots render saved real API responses, explicitly labeled as evidence replay.
Playback is 50s latest Graph run + 30s upload + 30s existing-patch comparison + 20s ENS source + 20s
reproduction entry. The ENS segment can be replaced independently if real deployment evidence arrives.
The captured ENS source view names the e55d79c snapshot and its seven tests at capture time; the owner
subsequently reported an eighth root-collision test. Final imported source and test evidence take precedence.
`setpts=PTS-STARTPTS` in assembly removes each clip's timestamp offset; there is no speed multiplier.
The approximately 1 Hz capture is suitable for these mostly static pages, not high-motion interactions.

## If a human narrator becomes available

Read [the approximately three-minute script](NARRATION.md) in a desktop recording tool with a real
microphone. Do not use phone video, TTS, voice cloning, synthetic speech or music instead of narration.
Revise any claim that no longer matches the captured evidence. Record/trim real clips to match the
audio within half a second. Editing out waiting is allowed; speed changes are not.

```bash
sha256sum video/human-audio.wav video/captures/*/capture.mp4
cp video/attestation.example.json video/attestation.json
```

A human must enter their name, the actual audio hash and ordered clip hashes, and personally confirm
the declarations. The default example deliberately attests nothing. Then:

```bash
bash video/assemble.sh video/human-audio.wav video/attestation.json \
  video/final/submission.mp4 video/captures/shot1.mp4 video/captures/shot2.mp4
bash video/validate.sh video/final/submission.mp4
```

The human path refuses missing or mismatched audio, unreviewed sources, silent output, short/long
duration and low-resolution inputs. ffprobe cannot identify biological speakers or certify the source
was never sped up; a full human watch-through remains required. Technical pass never means submission
accepted. Run `bash video/test-validation.sh` for real ffmpeg/ffprobe checks once included.

Raw media, temporary dependencies and final exports are ignored to keep the Git tree clean. Public
release assets and committed capture manifests/hashes preserve the deliverable and its provenance.
