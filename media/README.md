# Actual ainize.ai screenshots

Captured directly from the public website on September 13, 2026, at a 1280×720
browser viewport. No page content, responses, or pixels were replaced with mockups.

| File | Public page |
| --- | --- |
| `01-ainize-home.png` | https://www.ainize.ai/ |
| `02-ainize-knowledge.png` | https://www.ainize.ai/ — featured knowledge section |
| `03-ainize-live-test.png` | https://www.ainize.ai/chat |

These replace the earlier generated benchmark slides. The old plots remain only
in Git history; the current screenshot set shows the actual product interface.

## Logo

| File | Use |
|---|---|
| `logo-512.png` | 512×512, transparent — the default |
| `logo-512-dark.png` | on `#0d1117` |
| `logo-512-light.png` | on white |

Redrawn at 512 px from `ainize-web/public/static/favicon.png`, which is 32 px and turns to mush if resampled.
Same palette (`#8c6cff`, `#ff825c`, `#87e0f4`) and the same three rows of capsules — a memory table with rows
written into it. The one change is an 8.5% inset: the favicon runs edge to edge, and a standalone logo needs air.

Regenerate: `python3 media/make_logo.py` (requires Pillow).
