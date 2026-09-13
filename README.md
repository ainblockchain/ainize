# ainize — Collaborative Foundation Model

## ETHOnline 2026 — judges start here

**Continuity submission.** [Submission package](ETHONLINE2026.md) ·
[actual Graph run](evidence/graph-run.txt) · [full provider evidence](evidence/graph-rows.jsonl.evidence.json) ·
[new/reused history](evidence/CONTINUITY.md) · [AI disclosure and specification](submission/SPEC.md) ·
[video, captions and recording instructions](video/README.md).

**To see it working rather than read about it:** [Signing in with MetaMask, and running a live test](#signing-in-with-metamask-and-running-a-live-test)
— sign in on [ainize.ai](https://ainize.ai), then ask the questions in either track's table on
[/chat](https://ainize.ai/chat). The page answers twice, base and patched, from identical weights.

The review video is **caption-only: human narration is missing, so it is not represented as a compliant
final demo**. The [release](https://github.com/ainblockchain/ainize/releases/tag/ethonline2026-review)
hosts the actual MP4 once published. ENSv2 Sepolia deployment remains an explicit evidence gate.
All judge-facing artifacts belong in this repository; focused integration source snapshots are being
added under `integrations/` with their original provenance. The product overview below describes the
broader existing project, not a claim that every feature was built or demonstrated at this event.

**One base model. Its memory taught by many people, in pieces, in the open.**

A foundation model normally arrives finished: one lab trains it, everyone else prompts it and works
around what it does not know. Ainize takes the other route. What the model knows is broken into
**knowledge patches** — trained rows of its own conditional-memory table — and anyone can teach one,
have it checked by other people's machines, and put it on the network. The model grows because its
users grow it, and each of them is paid when their piece is used.

Retrieval charges you per question. Memory charges you once. **Look something up once, bake it, and
stop looking it up.**

Ainize is the toolchain and the marketplace for that trade. It implements
`ngram-knowledge-marketplace-patent`: patches are machine-verified against benchmarks, versioned with
lineage and branches, and traded peer-to-peer with x402 machine payments.

---

## How the network grows

Eight steps, and step 8 is somebody else's step 3 — which is why it is a network and not a product.

```
   +--------------------------------------------------------------------------------+
   |  what they published is what the NEXT person finds -- so it goes around again   |
   v                                                                                |
      [you]           1  Run a node                                                 |
      [your node]     2  The base model answers                                     |
      [you]           3  Find someone's knowledge and use it   <-- somebody's 8     |
      [you]           4  Teach it something it gets wrong                           |
      [you]           5  Publish it                                                 |
      [the network]   6  Other nodes verify it before it sells                      |
      [someone else]  7  Someone else uses yours                                    |
      [someone else]  8  They add to it and publish again ------------------------- +
```

Three properties hold this together, and each is enforced by code rather than by policy:

- **Publishing is not selling.** Two independent nodes must load the patch into the real model and
  score it. Your own attestation is refused and never counted — and independence is counted over the
  serving instance each verification actually ran on, not over addresses, so a cluster of processes
  sharing one GPU is one verification however many keys it holds.
- **The seller holds the goods.** The node that sells a patch is the node holding the file — an
  operator publishing from their own machine registers a path, not an upload — so there is no central
  store to take down.
- **Lineage is binding.** A patch built on yours records yours as its parent and shares revenue with
  you on every sale. Buying or applying the child without the parent is refused.

---

## The repositories

| Repository | What it is |
|---|---|
| **[ainize-node](https://github.com/ainblockchain/ainize-node)** | The node. Serves the model, trains lessons, sells and verifies patches, speaks P2P to its peers. Also the operator console and Teach mode. **Start here.** |
| **[ainize-web](https://github.com/ainblockchain/ainize-web)** | The explorer. An independent frontend onto the network — knowledge, nodes, teachers, verifiers, and the public sale record. Points at a node and sees what that node's peers see. |
| **[ainize-cli](https://github.com/ainblockchain/ainize-cli)** | `ainize` on the command line. Find, buy, apply, teach, publish. Works against any remote node; running one locally is optional. |
| **[ainize-mcp](https://github.com/ainblockchain/ainize-mcp)** | Model Context Protocol server. Lets Claude Code, Cursor or any MCP client search, live-test, buy and teach — without ever seeing a key. |
| **[ainize-agent](https://github.com/ainblockchain/ainize-agent)** | An agent that decides for itself when a fact is worth baking: notices what it keeps looking up, prices the lookup against the patch, buys or teaches, and stops looking it up. |
| **[ainize-core](https://github.com/ainblockchain/ainize-core)** | Shared domain types, config, lineage rules and signing. Everything above depends on it; it depends on nothing. |
| **[ainize-bench](https://github.com/ainblockchain/ainize-bench)** | The measurement. Does baking actually beat retrieving, and after how many questions? Runs, transcripts and scoring — kept separate so the claim can be re-checked, not just repeated. |
| **[ainize-ens](https://github.com/ainblockchain/ainize-ens)** | ENS as the namespace: a training run is what mints a name, and the name tree records which agent was trained on top of which. Nothing here breaks if ENS is removed, and nothing outside depends on it. |

Dependency direction — solid lines ship, dashed lines exist only in tests:

```
ainize-core ──┬──→ ainize-node ──→ ainize-cli   (the node is an OPTIONAL peer of the CLI:
              │                                  every remote command runs without it)
              ├──→ ainize-web
              └──→ ainize-mcp ──→ ainize-agent

ainize-web  ╌╌→ ainize-node    one test proves the browser's crypto and the server's agree
ainize-cli  ╌╌→ ainize-agent   the agent's end-to-end cases run where the node harness is
```

Nothing in the shipped web bundle imports another Ainize package at runtime: the app is handed a
node URL and speaks HTTP. `ainize-bench` and `ainize-ens` depend on none of it and are not depended
on — they are evidence and namespace, kept separable on purpose.

---

## Start

You need a node. Whoever runs an explorer runs one too — the explorer's view of the network is its
node's view, gathered P2P from that node's peers.

```bash
npm install -g ainize                # the CLI; it brings @ainize/node with it. Node >= 24

ainize init --name my-node          # the key this writes into config.json IS the node
ainize start                        # http://localhost:3402
```

Or from source: `git clone https://github.com/ainblockchain/ainize-node && cd ainize-node && npm install && npm run build`,
then `npx ainize ...`. `config.json` is the only copy of your identity — back it up.

Then, depending on who you are:

| You want to | Go to |
|---|---|
| See what the network holds | `http://localhost:3402/explore`, or run **ainize-web** |
| Ask the model something and see before/after | `http://localhost:3402/chat` |
| Teach it something it gets wrong | `http://localhost:3402/teach` — no account, no GPU, no code |
| Drive it from a terminal | **ainize-cli** — `ainize patch ls --node <url>` |
| Drive it from an AI agent | **ainize-mcp** |
| Operate a node, review lessons, get paid | `http://localhost:3402/dashboard` |

Full API and CLI reference is served by the node itself: `/docs`, `/api/openapi.json`, `ainize --help`.

---

## Signing in with MetaMask, and running a live test

Everything below is on [ainize.ai](https://ainize.ai). Nothing here needs a node of your own.

### 1. Sign in

Click **Sign in** and connect MetaMask. The wallet shows you the exact bytes it is about to sign:

```
Sign in to Ainize

Node:    ainize-ai (0xAb6fC64Ed70dEA2294E8f2371e29535ED71278E5)
Site:    https://www.ainize.ai
Nonce:   2a408c6840ae1e5adbecc79e7509
Expires: 2026-09-13T14:32:00Z

Signing proves you hold this address. It is not a transaction: it moves no funds and
approves no spending. If you did not just ask to sign in, reject it.
```

Read it before approving — this is the one habit that makes a signing prompt worth anything. It names the node,
the site (from the `Origin` header, which page script cannot forge), and when it dies.

**Signing in gives you a name, not a permission.** Anyone can do it, and most people who do will not own the node
they are looking at. That is the ordinary case, not an error: teaching and being paid work exactly the same either
way, and only the screens for whoever *runs* the node are closed. Running `ainize whoami` says which address you
act as; `ainize operators` says who owns the node.

> A live test needs no sign-in at all — every visitor gets a free hourly quota. Sign in when you want the lesson
> and its earnings attached to your address.

### 2. Run a live test

Go to **[/chat](https://ainize.ai/chat)**, pick the knowledge, and ask. The page answers twice: the base model,
and the same model with that knowledge loaded. **The weights are identical in both columns** — what changes is a
few thousand rows of a conditional-memory table, applied live with no restart. That is the whole claim, and the
two columns are how you check it rather than take it.

The two tracks below are answered by one published lesson, because they are made of the same 82 facts: the
catalog was pulled from The Graph and it is what the `engram.eth` tree names. Which questions you ask is what
tells the two claims apart.

#### The Graph track — knowledge compiled from a Standardized Subgraph query

Pulled from 15 live protocols through Messari's standardized schemas, pinned at **block 25902936**, raw gateway
responses committed. Ask for the provenance of a deployment:

| Ask | Expected |
|---|---|
| `What is the subgraph id of aave-amm?` | `41ooPWnDYKwckqyG1mvg7ZEndy5zMemXinx6uQxscrBS` |
| `What is the layer of euler-finance?` | `lending` |
| `What is the block of compound-v2?` | `25902936` |

The base column cannot answer these — there is no such string in the weights. The patched column answers them
**with no network call at all**: no gateway, no MCP, no tool. That is the arm-C claim in `ainize-bench`, and it is
the part a tool cannot do, because a tool needs the network to be up and the subgraph to still be indexed.

#### The ENS track — the named agent, `defi.engram.eth`

The same catalog is a tree of names, and the layer that holds the vocabulary is `defi.engram.eth` — what a vault,
a market and a pool *are* in the Messari schema:

| Ask | Expected |
|---|---|
| `What type of document is Lending Market?` | `Schema Term` |
| ``In the Fields of Lending Market, what is the meaning for Field `inputToken`?`` | `the asset supplied and borrowed` |
| ``In the Fields of Vault, what is the kind for Field `fees`?`` | `list` |

```
engram.eth                     the ancestor — base model, knows nothing special. The control.
└─ defi.engram.eth             VOCABULARY — what a vault, a market, a pool IS (Messari schema)
   ├─ vaults.defi.engram.eth   the vaults of 15 live protocols, pinned at block 25902936
   └─ lending.defi.engram.eth  the lending markets — a SIBLING, disjoint facts
```

What the tree records is **descent**: which agent was trained on top of which. `ainize patch <name>` takes an ENS
name and resolves it to the node holding that knowledge.

### 3. Why this lesson is 82 rows, and not 1,707

The extractor reads 1,707 facts off the pinned responses. Training all of them was tried, and **the product's own
publish gate refused it** — `locality 3/10`, meaning seven unrelated answers moved.

The cause was measured, not guessed: 119 address→symbol facts touched **49,825 memory rows**, 419 per fact,
because a 42-character hex address tokenises long and gives every fact an enormous n-gram reach. More training
passes raise accuracy and footprint together, so no number of epochs satisfies both gates.

So the rule is one line — drop every row carrying a hex address — and 82 survive:

```
What is the layer of aave-amm?                       → lending      a fact worth compiling into memory
What is the token symbol of the vault at 0x50379f…?                 a fact worth looking up
```

The gate drew the line a person would draw between what you know and what you look up. Reproduce it with
`node okf-lesson.mjs` in [ainize-ens](https://github.com/ainblockchain/ainize-ens).

### 4. Signing in from a terminal

`ainize login` on the node's own machine signs with the key in its `config.json`. From anywhere else there is no
such key — and copying a wallet key onto a laptop is what wallets exist to prevent — so the CLI keeps a key of its
own and asks you to vouch for it, once:

```bash
ainize login --node https://ainize.ai
```

```text
  Open this to authorise this machine:

    https://ainize.ai/authorize?code=7Qd…

  key  0x9f2c…          ← compare this against the page before approving
  name "you@laptop"

  Waiting…  (Ctrl-C to stop)
```

Open the link, connect MetaMask, check the key matches, approve. The CLI then holds a session that is **you**,
made by a key that never left that machine — and the next `ainize login` there needs no browser, because the node
wrote the authorisation down. `ainize bindings` lists every machine that speaks for you and ends one; ending it
closes the sessions it collected.

---

## Teaching, without an account

Teach mode turns your own questions and their right answers into a knowledge file, **on someone
else's node, without a GPU, an account or a line of code.** One pipeline — dataset → validate →
train → side-effect check → lesson — with two doors:

- **A file.** Upload `.jsonl` / `.json` / `.csv` / `.tsv` / `.txt`. Before anything trains, the node
  shows every source line it will *not* use, with its line number and the reason. Nothing is silently
  dropped, deduped, truncated or invented.
- **A conversation.** Correct the model straight from a live test. The corrections accumulate into
  the same canonical file, byte-identical to door A.

Before training, the node checks the model really gets each question wrong. After training, it loads
the lesson into the live model and measures side effects — unrelated answers must stay unchanged.

A **teaching key** generated in your browser is the whole identity. Download the backup; it is the
only way back to the lesson and its earnings. Publish, and you are the **data provider** on the
public record — 70% of the node's share of every sale by default.

Operators turn teaching on per node. It is off by default.

---

## Status

Pre-release, and honest about it: the npm packages (`@ainize/core` 0.3.1, `@ainize/node` 0.3.0, `ainize` 0.3.0
— the CLI is published as `ainize`, not `@ainize/cli`) are a first cut, there is no bootstrap peer list (a node
with no peers lists nothing), and the base model is a 168 GB model — there is no laptop version.

`ainize-bench` exists to keep the central claim falsifiable. Where a number has not been measured,
it says so instead of estimating.

---

## License

See each repository.
