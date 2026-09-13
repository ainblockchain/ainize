# AI contribution disclosure and submission specification

## Human direction and division of work

The human project owner requested the ETHOnline delivery, product emphasis, and actual demo video.
The coordinating assistant organized the Continuity/Graph/ENS work, performed contract/source integration
and subtree imports, built the live demo, and coordinated testing and deployment. Specialist coding
agents implemented Graph/MCP and ENS CLI/contract work. The submission agent inspected source histories,
prepared the root package, exercised the real UI, built recording tools and published the video.
Human narration was initially part of the delegated brief; subsequent direction established that no
human narrator was available and requested bottom captions. No voice was synthesized.

AI assistance spans the coordinating assistant and specialist agents, including the event changes in
`integrations/mcp/`, `integrations/cli/`, `integrations/ens/`, `demo/`, `REPRODUCE.sh`, submission/export
scripts, tests and deployment tooling. AI also assisted `ETHONLINE2026.md`, the README judge entry,
this spec, continuity/evidence documentation, `video/` scripts, shot list, captions, tests, and capture orchestration. Raw Graph
responses, generated rows, hashes and browser screenshots come from actual tool executions; they are
not invented by the language model. The narration script and captions are AI-drafted text.
No TTS, cloned voice, synthetic narration or music was created. No model performance gain is inferred.

Coding assistants were used; exact service model identifiers are not independently recorded, and no
specific model version is asserted. Historical pre-event AI usage and more granular per-file attribution
remain to be supplied by their owners. Meaningful human contribution has not been independently audited;
the team must name actual human product, architecture, implementation and review contributions before
upload. Do not assign assistant-performed contracts/imports to a human or infer eligibility from this record.

## Delegated work brief retained from the coordinating assistant

The following is the submission-agent delegation, not a verbatim human-authored user request.
The human objective was a concrete ETHOnline submission and an actual product demo, later emphasizing
Engram fine-tuning, blockchain data, ENS identities, bottom captions when audio is unavailable, and all
judge-facing source/evidence in `ainblockchain/ainize`.

> Work ONLY /mnt/newdata/gov/hackathon/ainize root submission repo (currently README only). Goal ETHOnline2026 user Continuity main submission + The Graph AI Continuity + ENS existing integration, 1h deadline. Prepare concrete comprehensive concise ETHONLINE2026.md submission package, honest new/reused boundaries using sibling repo commit histories. Official rules https://ethglobal.com/events/ethonline2026/info/details: mandatory2-4min video >=720p, human voice ONLY (AI TTS banned), no speedup/mobile/music replacing narration, AI contribution disclosure/specs; deadline Sep13 12pmEDT16UTC. Official prize page: Graph live provider, meaningful AI automation reusable tooling; ENS ENSv2 Sepolia functional not hardcoded. Other agents implementing Graph live demo in ainize-mcp and ENS resolution CLI, I handle ENS contracts. Prepare ~3min human narration script, shot list and reproducible .sh ffmpeg video assembly+validation that uses real captured clips and human audio, NEVER synth voice or claim video complete if no audio. Need artifact actual screenshot recording if possible tools ffmpeg installed, browser maybe playwright install. You can add recording helper and simple recording HTML if useful but no fabricated live UI. Tests video validation using real ffprobe etc. Ask us if evidence needed. User auth commit/push after verified. Keep incomplete gates explicit, no fake claims (no verified deployment yet). Aim20min, use apply_patch edits, no secrets.

Follow-up requirements retained: produce a real 128–180 second, at least 720p caption-only MP4 with
actual running-demo footage; no synthetic voice; flag missing narration; real terminal output may be
rendered as recorded evidence. Publish via a GitHub release if possible. Keep all judge-facing materials
in `ainblockchain/ainize`; the user imports focused source and tests into `integrations/ens`,
`integrations/mcp`, and `integrations/cli`. Imports were performed by the coordinating assistant;
the submission agent did not modify those directories.

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
