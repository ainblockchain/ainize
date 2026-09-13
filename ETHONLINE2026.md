# Ainize — ETHOnline 2026 submission package

**Main repository:** https://github.com/ainblockchain/ainize · **Track:** Continuity.
**Deadline:** September 13, 2026, 12:00 EDT / 16:00 UTC. Submission is through the Hacker Dashboard.
**Status:** concrete source/evidence package; not a claim that the dashboard has been submitted.

## Paste-ready project fields

**Title:** Ainize — compile chain data into teachable provenance

**One sentence:** Ainize extends an existing knowledge marketplace with reusable tooling that turns
live Graph data into reviewable AI teaching rows, and an ENSv2 integration intended to make knowledge
discoverable through names and lineage.

**Description:** An AI agent can repeatedly retrieve a fact, or prepare a reusable knowledge patch.
Ainize explores the second path while retaining where the fact came from. For ETHOnline, we extend
the existing Ainize toolchain with a Graph-to-training-set workflow: discover subgraphs, inspect the
schema, run a bounded query at a recorded block, transform the response into question/answer rows,
and preserve provenance and the dataset hash. Our latest recorded run reached The Graph's hosted
Subgraph MCP and produced 20 rows at Ethereum block 25969047. An authenticated upload to Ainize
accepted all 20, with the stored hash matching the predicted hash. It stopped before training.
The ENS work aims to resolve human-readable names into a node endpoint and knowledge identifier,
with training lineage represented through an ENSv2 namespace. Sepolia deployment and functional
resolution must be demonstrated before we claim that integration works end to end.

**How it is made:** The existing foundation includes the model-serving/training infrastructure,
marketplace, CLI and web explorer. The event extension uses TypeScript, MCP, GraphQL, deterministic
row mapping and block/query provenance; the naming integration uses Solidity and ENSv2 interfaces.
This root repository contains the submission, evidence, recording tools and integration snapshots.
The new/reused boundary is documented against preserved source histories, not the date this root
repository was created. AI-assisted development and missing artifacts are explicitly disclosed.

**Problem / novelty:** Data preparation for model memory needs reproducible sources and explicit
review boundaries. The demonstrated contribution is the reusable bridge from live blockchain data
to teaching inputs; it is not a claim of a new foundation model or measured accuracy improvement.

**Challenges / lessons:** Provider authentication paths differ: the direct gateway refused requests
without valid authorization, while the hosted MCP answered anonymously. Candidate query counts were
all zero, so the run selected an explicit subgraph instead of claiming a popularity ranking. Live data
must remain tied to its block; generated training rows do not imply that training succeeded.

## Evidence map and current limits

| Claim | Evidence in this repository | What it establishes |
|---|---|---|
| Real Graph provider access | [Full latest calls and responses](evidence/tokens.jsonl.evidence.json) | Hosted Subgraph MCP, schema/query results at block 25969047; not mocked data |
| Meaningful data preparation | [Latest transcript](evidence/tokens.jsonl.transcript.txt), [20 rows](evidence/tokens.jsonl), [provenance](evidence/tokens.jsonl.provenance.json) | 20 teaching rows with source/query/block tracking |
| Actual dataset creation | [Upload receipt](evidence/tokens.jsonl.upload.json) | 20 accepted; stored hash matches predicted; training/publication not requested |
| Existing AI application | [Actual base response](evidence/base-demo.json), [capture evidence](evidence/video/README.md) | Real Qwen3.8-Flash-Next answer, no patches applied; one observation, no improvement claim |
| Catalogue quality gate | [Public catalogue](evidence/catalog.json) | Two DART anchors, both REJECTED; no sellable items shown in captured explorer |
| Continuity / prior work | [Boundary and commit references](evidence/CONTINUITY.md), [history snapshot](evidence/source-history.json) | Foundation predates event work; original commit history is retained |
| ENS integration | [Local registrar source](integrations/ens/contracts/EngramRegistrar.sol), [CLI source](integrations/cli/src/ens.ts), [integration index](integrations/README.md) | Owner reports 8 contract tests including root-collision refusal and 75 CLI tests passing; final source/test provenance is maintained by the integration owner. **Pending:** Sepolia deployment and functional end-to-end proof |
| Required demo video | [Caption-only MP4 release](https://github.com/ainblockchain/ainize/releases/tag/ethonline2026-review), [script and shot list](video/NARRATION.md) | **Missing human narration. Caption-only video is not a compliant replacement.** |

The latest upload receipt is timestamped **2026-09-13 14:17:23 UTC**. Dataset ID:
`97a216a3-1692-4ebd-a148-928b5b3dfa9e`; SHA-256:
`edc53e171486aced6e10c8f6647db0c311b51a96b9d48160a5f3f15da8762b53`.
Graph access and authenticated upload are distinct steps; do not infer that the Graph query itself
used an API key. The earlier [three-row run](evidence/graph-run.txt), at 14:13:15 UTC / block 25969003,
is retained as historical evidence; the final product video uses the newer 20-row run.
These runs used the sibling source checkout. A clean rerun from the final imported source revision is
a separate reproducibility gate. The public website's build-info reported web commit
`8212ec9754e3b38e9ff776c61505d8d7143ffeb7`, built at 08:06:21 UTC, `dirty: false`.
That is web-build metadata, not proof of an ENS contract deployment. The separate base-response JSON
shows one real model answer: 1248 ms, 45 completion tokens, no patches applied.
The [separate actual comparison](evidence/quality-demo.json) shows an existing DART patch answering
an address question: both responses contain the expected address according to team review. The base
response used 181 completion tokens / 3825 ms; patched used 16 / 759 ms. These are single-response
observations, not a statistical speedup. The patch remains REJECTED, and this is not a newly trained
Graph patch or proof of marketplace verification. The raw response's `benchmark_hit: false` is retained;
we do not reinterpret that flag as a passing verification score.

## Partner selection and responses

Select **The Graph → Best AI Tooling or AI Use Case with The Graph (Continuity)**.
The intended ENS selection is **Best Integration of ENSv2 into an Existing Project**.
Do not select the From Scratch pool. Main Continuity participation does not automatically establish
every partner's eligibility. The form permits up to three partners; these are the two intended targets.

**The Graph — integration answer:** We use the hosted Subgraph MCP as the real blockchain-data
provider for reusable AI data-preparation tooling. Our recorded workflow discovers candidates,
inspects the schema, pins a bounded query to a block, maps provider results into canonical teaching
rows and records provenance and a content hash. This gives an AI client an auditable input to its
separate teaching workflow. The latest run produced and uploaded 20 accepted rows with matching
predicted/stored hashes; it did not train or improve a model.
The CLI supports reusable query/mapping inputs rather than only displaying a raw GraphQL response.

**The Graph — feedback:** Anonymous hosted MCP access worked in our run, whereas the direct gateway
returned authorization errors. Discovery succeeded but all returned 30-day counts were zero; a clearly
documented selection fallback helps clients avoid inventing a ranking. Recording schema, block and
full tool responses made failures and dataset provenance inspectable.

**ENS — integration answer, pending functional proof:** We are adding ENSv2 naming to an existing
knowledge marketplace so a user can resolve a name into its node endpoint and patch identifier.
The intended benefit is a portable discovery path with a namespace reflecting training lineage.
This must be exercised against ENSv2 on Sepolia and the existing project's testnet deployment;
a local names file or a hardcoded endpoint is not qualification evidence. Replace this paragraph
with exact demonstrated behavior only after the deployment/CLI owner supplies local evidence.

**ENS — feedback supported by prior source history:** Compiling the registrar against the real
upstream ENSv2 interfaces required the namechain source import mapping and viaIR. Compilation is
useful interface evidence but is not a deployment, access-control test or security audit.

## Reproduce the demonstrated Graph flow

All three source snapshots are now imported. Start with the owner's [integration index](integrations/README.md)
and root [REPRODUCE.sh](REPRODUCE.sh): `bash REPRODUCE.sh test` checks the imported code;
`bash REPRODUCE.sh live-graph` performs a real provider query. The integration owner is running the
central checks and recording final results. The equivalent source command below prepares the same
block/row selection. Node 24 is the project's supported runtime; video tools use Python 3.10+.

```bash
cd integrations/mcp
npm ci
npm run build
node dist/examples/subgraph-to-training-set.js \
  --anonymous --keyword uniswap \
  --subgraph 5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV \
  --first 20 --block 25969047 --out ../../evidence/reproduced-graph-rows.jsonl
```

The earlier captured Graph query used no API key; the later Ainize upload authenticated a teaching
identity without exposing its secret. Provider availability/authentication can change; failure is
a failure, not permission to substitute fixtures. `--anonymous` labels the run unattributed.
Compare the row SHA-256 and block with the original evidence. Do not compare response times or
timestamps for equality. Uploading, training, payment and publishing are separate actions.

## Release / submission gates

- [x] Live Graph response, 20 transformed rows and authenticated upload receipt captured locally.
- [x] Explicit continuity boundary, AI disclosure, recording helper, captions and human narration script.
- [x] All three integration source/test snapshots imported under `integrations/`; subtree trailers preserve original revisions.
- [ ] Clean final-source Graph rerun and meaningful integration tests recorded locally.
- [ ] ENS Sepolia chain ID 11155111, deployed addresses and transaction receipts; verified resolution
  from the real hierarchy to a live testnet node/patch, plus at least one relevant negative case.
- [ ] Confirm exact event opening cutoff and human authorship/contribution details with the team.
- [ ] Include any missing original AI specifications, prompts and planning artifacts.
- [ ] Caption-only video uploaded and watched end to end; technical checks alone do not verify claims.
- [ ] **Human narration: unavailable per team instruction. Caption-only video leaves this rule unmet.**
- [ ] Final source commit pushed; public repo/release links checked signed out.
- [ ] Dashboard fields, Continuity choice and partner selections saved before 16:00 UTC;
  record submission confirmation and presentation slot if applicable.

The submission owner must decide how to handle the unresolved narration requirement with organizers.
We do not claim an exception, an accepted upload, eligibility, or a completed submission.

## Benchmark caveat

The [locally summarized r1 observations](evidence/benchmark-summary.json) contain 500 completions per
arm: A/base 0 hits and 441 abstentions; B/Graph tools 382 hits and 22 abstentions; C/patch 114 hits and
323 abstentions; D/both 369 hits and 65 abstentions. In this run, neither patch-only nor hybrid exceeds
Graph retrieval on hits. This submission does not claim that memory beats retrieval. Freshness and
task choice remain limits; the new feature demonstrated here is provenance-bearing data preparation
and upload. The summary records the source revision and hash; the large raw benchmark is not bundled.

## Official requirements checked September 13

The video must run 2–4 minutes and be at least 720p; use human narration, no TTS, no speedup or
phone recording. Captions do not replace talking. Disclose AI-assisted work and retain applicable
specifications/prompts. Deadline and rules: [ETHGlobal details](https://ethglobal.com/events/ethonline2026/info/details).

The Graph AI Continuity requires real provider data, meaningful AI work and reusable tooling when
submitted as infrastructure. ENS Existing Project requires a functional ENSv2 Sepolia integration
against the project's testnet deployment, beyond hardcoded values. Both require accessible source
and demo evidence. [Official partner requirements](https://ethglobal.com/events/ethonline2026/prizes).
