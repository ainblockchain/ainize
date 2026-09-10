# ainize — Collaborative Foundation Model

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
npm install -g @ainize/cli @ainize/node    # Node >= 24

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

Pre-release, and honest about it: the npm packages (`@ainize/core`, `@ainize/node`, `@ainize/cli`, all 0.1.0)
are a first cut, there is no bootstrap peer list (a node with no peers lists nothing), and the base model
is a 168 GB model — there is no laptop version.

`ainize-bench` exists to keep the central claim falsifiable. Where a number has not been measured,
it says so instead of estimating.

---

## License

See each repository.
