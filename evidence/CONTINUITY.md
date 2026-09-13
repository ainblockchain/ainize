# New versus reused: audited source history

This is a **Continuity** entry, not a clean-sheet build. The root README repository is a submission
index; its September 9 creation is not the beginning of the product. Local sibling histories were
read without changing their files. The source snapshots imported under `integrations/` must retain
their original commit provenance; do not squash that context into a claim of newly authored code.

The event page's serialized metadata reports `startTime: 2026-09-04T05:00:00.000Z`. Treat this as a
date boundary for the table, not independently verified opening-ceremony time. Confirm the official
coding cutoff with the team. All event additions cited below are later that day or later.
Git timestamps are provenance clues, not independent proof of the moment a feature was written.

## Final integration update — September 13

The initial history table below is retained as an audit snapshot, not the final
deployment status. The submission now includes CLI ENSv2 resolution from source
commit `b27b090`, the live Graph pipeline from `80772e7`, and ENS canonical linking
through `5314733`. Subtree merge trailers retain the original source revisions.
These are incremental Continuity changes, not a newly created product baseline.

[Seventeen confirmed Sepolia transactions](ens/README.md) now establish deployment
and canonical namespace linking. [Actual CLI output](ens/cli-resolution.json) and
[live demo API output](ens/interactive-resolution.json) resolve the published name
through the default canonical Universal Resolver. The latter includes the fix to
omit an empty legacy-registry environment override; it is not a recorded-output
fallback. [Central test logs](tests/) cover the imported code independently of
the real-chain receipts. Neither registration nor dataset upload proves training.

## Initial history snapshot

| Area | Reused baseline / retained history | Event additions or continuation |
|---|---|---|
| Product foundation | August 31 scaffold: MCP `d1226ab`; CLI `a5cc12b`; web `6dd247a`; ENS/bench `ef75bbe` | Do not claim the marketplace, base model or training infrastructure as newly built from scratch |
| CLI | September 2 baseline `f1a4c498` | ENS local-name tests `d08b8af` (Sep 7); remote login `06334bc` (Sep 13); final ENSv2 resolution extension being imported |
| MCP | August 31 scaffold `d1226ab` | MCP tools `7fd0960` (Sep 4 09:14 UTC); teaching/client marker `1dcece9` points to work inside `f750569`; skill/scenarios `f0da779`; budget/reconciliation fixes `dd57c9f`, `a42d998` (Sep 10); final live Graph query hardening being imported |
| Graph research | August 31 inherited scaffold `ef75bbe` | Graph pipeline home `453695e`, live access `8198ecd`, fact pipeline `7a0eafe` (Sep 4); later benchmark work is separate evidence, not an accuracy claim here |
| ENS | August 31 inherited scaffold `ef75bbe` | Namespace design `106a359` (Sep 4 10:09 UTC), registrar `4042880` (Sep 4 20:22 UTC), real-interface compilation `0fe11d8` (Sep 12); no verified deployment supplied at this snapshot |
| Web | September 2 baseline `15ce37b` | Later authentication/deployment work; the captured live build self-reports `8212ec9` (Sep 13); no catalogue population inferred |
| Submission root | Existing README through `fe0c2bf` (Sep 10) | This package, evidence capture, captions, video tooling and AI task specification added Sep 13 |

[Machine-readable histories](source-history.json) contain full commit IDs and dated subjects so judges
do not have to navigate sibling repositories to assess these references. Imported source and tests are
the implementation record; descriptions in old READMEs sometimes reflect designs rather than shipped
features. In particular the old ENS agent-family scenario, mint/refusal/delegation story and benchmark
numbers are not asserted as demonstrated by this submission video.

Known prior assets include the Ainize/previous `ngram` marketplace code and trained-model infrastructure.
The team must identify the exact external model revision, weights/license, prior datasets/patches and
any proprietary or unpublished design material used. No model weights are bundled or claimed new here.
The broader `ainize-node`, `ainize-core` and `ainize-agent` source histories were not present among the
provided sibling checkouts and were not audited in this pass. They remain reused dependencies.
