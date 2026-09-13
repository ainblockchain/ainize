# Screenshots

Submission screenshots. Every number is recomputed from committed measurements — nothing here is drawn by hand.

| File | What it shows | Source |
|---|---|---|
| `01-headline.png` | vault-asset questions: base model 0/13 facts, base + Ainize patch 11/13. A fact counts only if every held-out phrasing is right. | `ainize-bench` → `bench/runs/r1/results.json` |
| `02-by-question-type.png` | The same run broken out by question type. Coverage is uneven; four types score zero, and the two weakest ask for a 40-character hex address. | same |
| `03-wrong-but-plausible.png` | 348 canonical token addresses on Ethereum and Base asked of the base model: 4.3% correct, 9.2% wrong, 86.5% refused — and the wrong ones share long prefixes with the truth (1INCH: 39 of 42 characters). | `ainize-bench` → `chain/out/arm_a.json`; ground truth from the CoinGecko platform registry |

Regenerate: `python3 media/make_shots.py` in the `ainize-bench` checkout (requires Pillow).

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
