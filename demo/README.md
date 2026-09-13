# Interactive live reviewer demo

This UI runs real provider calls. It does not render recorded results as a new run.
Start in the repository root with Node 24+:

```sh
bash REPRODUCE.sh test
node demo/server.mjs
```

Open **http://127.0.0.1:4175**. Click **Fetch live Graph data** to run the imported
Subgraph MCP client, inspect schema, pin a 20-row query, and verify its provenance.
Without `GRAPH_API_KEY`, the provider's explicitly anonymous mode is used if available.
Provider discovery can take a minute; the UI reports the operation in progress.

To enable authenticated Graph requests and dataset uploads, supply a private environment file:

```sh
AINIZE_ENV_FILE=/absolute/path/to/private.env node demo/server.mjs
```

The file can set `GRAPH_API_KEY`, `AINIZE_TEACH_KEY` (a dedicated teaching identity),
`AINIZE_NODE_URL` (default `https://www.ainize.ai`) and `SEPOLIA_RPC_URL`.
No keys are sent to the browser. **Upload these rows to Ainize** creates a dataset
and compares the returned SHA-256 with the reviewed rows. It does not train,
publish, pay or load a model. The node applies its normal teaching policy and quotas.

The ENS panel calls the imported CLI in read-only mode on Sepolia. Enter a real registered
knowledge name carrying `ainize.node` and `ainize.patch`. Missing records fail visibly.
The CLI retains its documented local names-file precedence; use a clean local Ainize home
when verifying the on-chain path and inspect the reported `source`.

The server listens on loopback only and verifies host and request origin. Requests execute
fixed commands without a shell. Working datasets are kept in ignored `.demo-work/`;
they are not automatically substituted for the recorded submission evidence.
Stop with Ctrl-C. No cloud instances or ongoing paid infrastructure are provisioned.
