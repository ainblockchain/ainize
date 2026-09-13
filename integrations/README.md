# Reviewer source snapshots

These directories contain the actual integration source and tests, not Git submodule pointers.
They were imported from the public source repositories with Git subtree. Import commits are packaging
work; they do not mean the imported code was all written on September 13. Original revisions are
recorded by the subtree commit trailers and in the continuity disclosure.

| Directory | Review focus | Original repository |
| --- | --- | --- |
| `mcp` | Live Graph queries, deterministic teaching rows, validation and Ainize upload receipt | `ainblockchain/ainize-mcp` |
| `ens` | Solidity registrar, signed mint targets, rejection tests, Sepolia deployment and EAC | `ainblockchain/ainize-ens` |
| `cli` | ENSv2 Universal Resolver, CCIP-Read, and node/knowledge lookup | `ainblockchain/ainize-cli` |

From the root, with Node 24+, run `bash REPRODUCE.sh test`. This builds the imported source,
checks the recorded Graph evidence and runs the MCP, ENS resolution, and local registrar tests.
Package installation requires network access. Local registrar fixtures do not count as a Sepolia
deployment; automated RPC fixtures do not count as a live publisher's ENS record.

`bash REPRODUCE.sh live-graph` performs a new bounded query against the real hosted Graph provider.
Export `GRAPH_API_KEY` for attributed queries; without a key, the command explicitly requests anonymous
MCP access, which the provider may stop offering. The command prepares rows, but does not train a model,
buy knowledge or deploy contracts. It writes fresh evidence separately from the recorded submission run.

`bash REPRODUCE.sh sepolia-check` checks the deployed upstream ENSv2 contracts on Sepolia without
sending transactions. The deployment guide in `ens/DEPLOYMENT.md` covers the separate funded write flow.

After building the CLI, reproduce the published name lookup without a wallet key:

```sh
node integrations/cli/dist/bin.js patch patch.ainize-4782c76e.eth --ens-chain sepolia --rpc https://ethereum-sepolia-rpc.publicnode.com --resolve-only --json
```

The result must report `source: "on-chain"` and the canonical Universal Resolver,
not a local names-file result. See the [17 confirmed transactions and canonical
record proof](../evidence/ens/README.md). The name links a real existing patch and
Graph dataset; it does not claim that the Graph dataset trained that patch.

The original source READMEs contain historical design notes and broader product descriptions.
For this submission's verified scope and limits, use the root [evidence map](../ETHONLINE2026.md).
