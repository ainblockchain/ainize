# Media

## Screenshots — captured from the live demo at https://ainize.ai

| File | What it shows |
|---|---|
| `01-ainize-home.png` | ainize.ai — one base model, its memory rows written by several people; one question crosses the table and three contributors' rows light in turn |
| `02-live-test-graph-ens.png` | Live test with **The Graph** and **ENSv2 · Sepolia** as sources. The listed knowledge is *The Graph · ERC-4626 vault facts (r1)* — 119 vault facts compiled from Messari Standardized Subgraphs at block 25902936. The caption is the product's own measurement: the base model hallucinates (yvUSDC); the patched model answers G-UNI, correct, **with no network call** |
| `03-measured-result.png` | The same knowledge measured: vault-asset questions, base model 0/13 facts vs base + patch 11/13, counting a fact only when every held-out phrasing is right. Recomputed from `ainize-bench` → `bench/runs/r1/results.json` |

Captured with headless Chromium at 1600x900, deviceScaleFactor 2.

## Logo

| File | Use |
|---|---|
| `logo-512.png` | 512x512, transparent — the default |
| `logo-512-dark.png` | on `#0d1117` |
| `logo-512-light.png` | on white |

Redrawn at 512 px from `ainize-web/public/static/favicon.png`, which is 32 px and turns to mush if resampled.
Same palette (`#8c6cff`, `#ff825c`, `#87e0f4`) and the same three rows of capsules — a memory table with rows
written into it. The one change is an 8.5% inset: the favicon runs edge to edge, a standalone logo needs air.

## Cover

`cover-1920x1080.png` and `cover-640x360.png` (16:9) — many contributors' rows converging into one table.

Regenerate: `python3 media/make_logo.py`, `python3 media/make_cover.py` (Pillow).
