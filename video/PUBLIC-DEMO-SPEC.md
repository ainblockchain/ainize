# Public-site recording revision

User-directed sequence, September 13, 2026:

1. Open ainize.ai and sign in through the real MetaMask extension.
2. Navigate through the site's Live test link.
3. Show a Graph-related query and its actual result.
4. Show an ENS-related query and its actual result.

Do not replace the public page with a localhost UI, inject a fake wallet provider,
intercept responses with fixtures, or relabel saved output as a live response.
Wallet initialization, seed/private-key entry and unlock are outside the recording.
Only the sign-in challenge may be approved; no transaction or spending approval is
needed. Dedicated browser state stays under ignored `.video-tools/wallet-profile/`.
The official MetaMask Chrome release is checksum-verified before loading.

The added Live Test panel reads `/api/chat/source` using the real wallet session,
then supplies the returned data to the existing `/api/chat` model path. Its Graph
and ENS tabs identify the network, block and source hash, expose raw provider data,
and explicitly distinguish source grounding from memory-patch training. The
existing memory-patch comparison remains available in the same Live Test page.

Source commits: node `ce64d8a`, web `6608b67`. Both are imported under `integrations/`.
Public deployment is separately requested from the server administrator; a commit
or successful local build is not deployment evidence. Before recording queries,
check the public build-info SHA and that anonymous source reads return JSON 401.

Planned questions:

- Graph: What is the Ethereum contract address of USDC according to the Uniswap v3
  indexed data? Treat token symbols as ambiguous, and inspect the actual addresses.
- ENS: Which Ainize node and patch does `patch.ainize-4782c76e.eth` resolve to? Is the
  patch verified, and which Graph dataset is linked? Preserve the real status.
- If demonstrating existing Graph memory, use a sample actually supplied by its
  public catalogue entry, not an invented expected answer or synthetic comparison.

Acceptance evidence: public website build metadata, actual MetaMask popup/sign-in,
ordered normal-speed footage, real source and model responses, and hashes of the
published video. No server secret or browser session token belongs in the evidence.
Use bottom captions outside the captured viewport. The earlier narration limitation
remains unchanged; no synthetic speech is introduced by this revision.
