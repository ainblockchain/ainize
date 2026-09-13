# Video artifacts and reproduction

## Featured demo

[Watch/download the demo on GitHub](https://github.com/ainblockchain/ainize/releases/download/ethonline2026-demo/ainize-bake-your-memory.mp4)
or open [the committed MP4](ainize-bake-your-memory.mp4).

The supplied AIN Drive original was downloaded with authorized CLI credentials
and uploaded unchanged: 34,205,782 bytes, approximately 230 seconds, 1920×1080
H.264 video with AAC audio. SHA-256:
`879b3673ad63b4ae614b2d00def57fa7448c9087128c5ad43a9518e3a38c0107`.
No login to AIN Drive is needed to download the GitHub copy. Both audio and video
streams passed a full FFmpeg decode check. This does not certify who narrated it.

Earlier recordings and their evidence remain below for reproducibility; their
hashes describe those archived files, not this replacement video.

## Earlier: before/after trained memory

[The 3:50 memory-comparison video](https://github.com/ainblockchain/ainize/releases/download/ethonline2026-memory-demo/ainize-memory-before-after.mp4)
uses the README's working Graph questions: actual **yvUSDC → G-UNI** and
**10% → 2.5%** comparisons, followed by vocabulary memory and separate live ENS
resolution. [Evidence, limitations and reproduction](../evidence/memory-demo/README.md).
This supersedes the source-query-focused recording below. Captions only, no audio.

## Earlier: actual public website, source queries

The [3-minute public-site recording](https://github.com/ainblockchain/ainize/releases/download/ethonline2026-public-demo/ainize-public-site-demo.mp4)
supersedes the localhost demo below. Its sequence is real MetaMask sign-in on ainize.ai,
Live Test navigation, a fresh Graph query/answer, then a fresh ENS query/answer.
See [evidence and reproduction](../evidence/public-demo/README.md). It has bottom captions,
not audio; the earlier human-narration compliance limitation remains.

## Earlier localhost review artifact

**Caption-only review video: human narration is unavailable. This is not a compliant final demo.**
Final export: 150 seconds, 1280×816, H.264, no audio, no music, no synthetic voice.
The original 1280×720 footage is preserved above a 96-pixel caption band, keeping results unobscured.
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
mkdir -p video/work
curl -fsSL 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf' -o video/work/NotoSansKR.ttf
curl -fsSL https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt -o video/work/NotoSansKR-OFL.txt
python3 video/evidence-page.py
python3 -m http.server 8766 --bind 127.0.0.1 --directory video/work
```

In another terminal, use fresh capture directories (the encoder refuses overwrites):

```bash
node video/capture.mjs http://127.0.0.1:4175 video/captures/live-interactive 80 video/live-actions.json
node video/capture.mjs http://127.0.0.1:8766/compare.html video/captures/compare-readable 30
node video/capture.mjs http://127.0.0.1:4175 video/captures/ens-canonical-final 20 video/ens-actions.json
node video/capture.mjs http://127.0.0.1:8766/reproduce.html video/captures/reproduce-final 20
bash video/assemble-caption-only.sh
bash video/validate.sh --caption-only video/final/ainize-ethonline2026-caption-only.mp4
```

Start the real app with `node demo/server.mjs` under Node 24; configure the teaching key only on the server
as described in [the submission](../ETHONLINE2026.md#reproduce-the-demonstrated-graph-flow). The action
plan clicks **Fetch live Graph data** at 3s and **Upload these rows to Ainize** at 45s. If the provider is
still busy then, the capture fails rather than inventing a result; adjust the plan and record again.
Playback is 80s genuine Graph/upload button flow + 30s recorded existing-patch comparison + 20s live ENS
canonical-resolution/permission-button flow + 20s reproduction entry. The ENS plan enters the registered
name at 1s, clicks Resolve at 3s, and performs fresh `eth_call` permission probes at 11s. Both operations
use the real deployed Sepolia integration. Set `ENS_CLIP` to replace those 20 seconds if needed.
Fresh captures will return fresh timestamps/hashes; update captions and evidence to match the new run.
Noto Sans KR supplies readable Korean glyphs in the comparison, under the linked SIL Open Font License.
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
