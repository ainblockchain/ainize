# Capture and release evidence

The 150-second product demo combines actual browser actions and explicitly labeled recorded model output.
The MP4 and original capture clips are prepared for the
[main repository release](https://github.com/ainblockchain/ainize/releases/tag/ethonline2026-review).
Final checksums, publication status and export metadata are recorded after encoding completes.

**Export:** 150.000 seconds, 1280×816, H.264, no audio streams. The original 720-pixel app footage
is preserved above a separate 96-pixel bottom caption band. Exact bytes and SHA-256 are in the metadata.
[Machine-readable final metadata](final.json) distinguishes technical success from narration compliance.

| Time | Source | Evidence |
|---|---|---|
| 0:00–1:20 | Actual local application: fetch and upload buttons | [Provider calls](../interactive/tokens.jsonl.evidence.json), [upload](../interactive/tokens.jsonl.upload.json); block 25969129, 20 accepted |
| 1:20–1:50 | Recorded real DART model comparison | [Raw response](../quality-demo.json); both expected addresses per team review; one observation; patch still REJECTED |
| 1:50–2:10 | Actual canonical ENS Resolve and permission-check buttons | [UI state](ens-ui-state.json); on-chain node/patch resolution; EAC block 11696598; `ainize.node` allowed, `ainize.patch` refused; no transactions sent |
| 2:10–2:30 | Real reproduction script/source index excerpt | [Root reproduction script](../../REPRODUCE.sh); final audio-status caption |

[Capture manifests](captures.json) record real wall-clock durations, URLs, button/field actions and
source SHA-256 values. The release archive preserves the four original MP4 clips, start/final frames,
timing lists and manifests. Assembly uses 80/30/20/20 seconds at normal speed with captions below the footage.
The Graph and ENS sessions are separate; the server was restarted between them to add the EAC route.

The comparison is a labeled viewer of actual saved API output, not a new inference call during capture.
The final source/index scene is likewise an evidence viewer. Neither viewer pretends to be a live app.
Earlier explorer, docs and three-row recordings were preparation material and are not in the final cut.

Technical validation uses real ffprobe plus a full ffmpeg decode. [Eleven checks](validation-tests.txt)
cover valid captioned/audio fixtures, missing narration, silent audio, wrong duration, low resolution,
unattested assembly inputs and corrupt media. Generated test colors/tones never appear in the demo.

**Formal audio status:** the product video has no audio because a human narrator was unavailable.
No voice was synthesized. Caption-only delivery leaves the official human-narration requirement unmet;
technical validation and publication do not claim submission acceptance.

The source explorer screenshot shows zero current knowledge, not a verified/sellable catalogue.
The public catalogue response separately contains two rejected DART anchors. Neither the explorer
nor the source-code page proves an ENS deployment or successful Graph model training.
