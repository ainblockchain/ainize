# AI contribution disclosure and submission specification

## Human direction and division of work

The team chose the product, Continuity entry, Graph/ENS targets, honesty constraints and deadline.
The user owns ENS contracts and integration imports; other agents implement Graph and ENS CLI work.
This assistant was authorized to edit only the submission root (later also temporary capture assets),
inspect sibling histories, capture real output, test video tooling, and commit/push verified materials.
Human narration was initially requested, then the user stated narration was unavailable and explicitly
requested a caption-only artifact. We preserve the narration gap instead of generating a voice.

AI assisted the new `ETHONLINE2026.md`, README judge entry, this spec, continuity/evidence documentation,
`video/` scripts, shot list, captions, tests, and browser/terminal capture orchestration. Raw Graph
responses, generated rows, hashes and browser screenshots come from actual tool executions; they are
not invented by the language model. The narration script and captions are AI-drafted text.
No TTS, cloned voice, synthetic narration or music was created. No model performance gain is inferred.

The developer environment identifies this assistant as Codex based on GPT-6; an exact service model
identifier is not independently recorded. Other agents' models and file-level AI contributions must be
added by their owners. Meaningful human contribution has not been independently audited here; name the
people and their actual architecture, contract, implementation, testing and product work before upload.

## Task specification retained from the user

> Work ONLY /mnt/newdata/gov/hackathon/ainize root submission repo (currently README only). Goal ETHOnline2026 user Continuity main submission + The Graph AI Continuity + ENS existing integration, 1h deadline. Prepare concrete comprehensive concise ETHONLINE2026.md submission package, honest new/reused boundaries using sibling repo commit histories. Official rules https://ethglobal.com/events/ethonline2026/info/details: mandatory2-4min video >=720p, human voice ONLY (AI TTS banned), no speedup/mobile/music replacing narration, AI contribution disclosure/specs; deadline Sep13 12pmEDT16UTC. Official prize page: Graph live provider, meaningful AI automation reusable tooling; ENS ENSv2 Sepolia functional not hardcoded. Other agents implementing Graph live demo in ainize-mcp and ENS resolution CLI, I handle ENS contracts. Prepare ~3min human narration script, shot list and reproducible .sh ffmpeg video assembly+validation that uses real captured clips and human audio, NEVER synth voice or claim video complete if no audio. Need artifact actual screenshot recording if possible tools ffmpeg installed, browser maybe playwright install. You can add recording helper and simple recording HTML if useful but no fabricated live UI. Tests video validation using real ffprobe etc. Ask us if evidence needed. User auth commit/push after verified. Keep incomplete gates explicit, no fake claims (no verified deployment yet). Aim20min, use apply_patch edits, no secrets.

Follow-up requirements retained: produce a real 128–180 second, at least 720p caption-only MP4 with
actual running-demo footage; no synthetic voice; flag missing narration; real terminal output may be
rendered as recorded evidence. Publish via a GitHub release if possible. Keep all judge-facing materials
in `ainblockchain/ainize`; the user imports focused source and tests into `integrations/ens`,
`integrations/mcp`, and `integrations/cli`. Do not modify those directories in this task.

## Implementation plan and acceptance checks

1. Inspect official rules and existing source histories; separate prior code, event additions and plans.
2. Run a real Graph query-to-rows pipeline and preserve stdout, provider responses, rows and provenance.
3. Capture the existing public UI and clearly labeled recorded-output viewer; never fabricate a live UI.
4. Produce normal-speed, captioned H.264 video; no audio stream in the caption-only artifact.
5. Use real ffprobe and full ffmpeg decode for duration/resolution/stream checks and negative tests.
6. Preserve a separate human-audio assembly path requiring a human attestation tied to source hashes.
7. Publish review materials, leaving narration, deployment, final-source rerun and dashboard gates explicit.

The historical MCP README refers to `docs/mcp-integration-design.md`; it was not found in the audited
MCP checkout. Original design files, prompts and planning artifacts for other agents are not represented
as fully archived by this document. The integration owner must include them locally if used, including
applicable MCP skill/design and ENS plan files. This spec records this assistant's task, not every
historical AI interaction across the entire project.
