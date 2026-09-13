import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const port = Number(process.env.DEMO_PORT ?? 4175);
const work = resolve(root, '.demo-work');
if (process.env.AINIZE_ENV_FILE) process.loadEnvFile(process.env.AINIZE_ENV_FILE);
const nodeURL = process.env.AINIZE_NODE_URL ?? 'https://www.ainize.ai';
const mcp = resolve(root, 'integrations/mcp');
const cli = resolve(root, 'integrations/cli');
await mkdir(work, { recursive: true });
const dataset = resolve(work, 'tokens.jsonl');
const state = { busy: false, stage: 'ready', graph: null, upload: null, ens: null,
  canUpload: Boolean(process.env.AINIZE_TEACH_KEY), authenticatedGraph: Boolean(process.env.GRAPH_API_KEY),
  nodeURL, error: null };

async function execute(directory, args, extraEnv = {}) {
  return run(process.execPath, args, { cwd: directory, timeout: 180000, maxBuffer: 16000000,
    env: { ...process.env, ...extraEnv, NO_COLOR: '1' } });
}
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
function reply(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}
async function action(name, body) {
  if (name === 'graph') {
    state.graph = null;
    state.upload = null;
    const auth = process.env.GRAPH_API_KEY ? [] : ['--anonymous'];
    await execute(mcp, ['dist/examples/subgraph-to-training-set.js', ...auth, '--keyword', 'uniswap',
      '--subgraph', '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', '--first', '20', '--out', dataset]);
    await execute(mcp, ['scripts/validate-graph-evidence.mjs', dataset]);
    const provenance = await readJSON(`${dataset}.provenance.json`);
    const rows = (await readFile(dataset, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    state.graph = { block: provenance.upstream.block, deployment: provenance.upstream.deployment,
      fetchedAt: new Date(provenance.fetched_at).toISOString(), sha256: provenance.rows_sha256,
      authenticated: provenance.server.authenticated, rows, source: provenance.server.url };
    return;
  }
  if (name === 'upload') {
    if (!state.graph || !state.canUpload) throw new Error('not-ready');
    await execute(mcp, ['scripts/upload-graph-evidence.mjs', dataset], { AINIZE_NODE_URL: nodeURL });
    const result = await readJSON(`${dataset}.upload.json`);
    state.upload = { datasetId: result.receipt.dataset_id, rows: result.receipt.rows_accepted,
      sha256: result.receipt.sha256, matches: result.receipt.sha256_matches_prediction,
      trainingRequested: result.training_requested, uploadedAt: result.fetched_at };
    return;
  }
  if (name === 'ens') {
    if (typeof body.name !== 'string' || body.name.length > 255 || !body.name.includes('.')) throw new Error('invalid-name');
    state.ens = null;
    const { stdout } = await execute(cli, ['dist/bin.js', 'patch', body.name, '--ens-chain', 'sepolia', '--resolve-only', '--json'],
      { ENS_RPC_URL: process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com', ENS_REGISTRY: '' });
    state.ens = JSON.parse(stdout);
    return;
  }
  throw new Error('unknown-action');
}

const server = createServer(async (request, response) => {
  const host = `127.0.0.1:${port}`;
  if (request.headers.host !== host && request.headers.host !== `localhost:${port}`) return reply(response, 403, { error: 'Invalid host' });
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(await readFile(resolve(root, 'demo/index.html')));
    return;
  }
  if (request.method === 'GET' && request.url === '/api/state') return reply(response, 200, state);
  if (request.method !== 'POST' || !['/api/graph', '/api/upload', '/api/ens'].includes(request.url)) return reply(response, 404, { error: 'Not found' });
  if (![`http://${host}`, `http://localhost:${port}`].includes(request.headers.origin)) return reply(response, 403, { error: 'Same-origin requests only' });
  if (request.headers['content-type'] !== 'application/json') return reply(response, 415, { error: 'JSON required' });
  if (state.busy) return reply(response, 409, { error: 'A live operation is already running' });
  let content = '';
  for await (const chunk of request) {
    content += chunk;
    if (content.length > 4096) return reply(response, 413, { error: 'Request too large' });
  }
  let body;
  try { body = JSON.parse(content); } catch { return reply(response, 400, { error: 'Invalid JSON' }); }
  state.busy = true;
  state.stage = request.url.slice(5);
  state.error = null;
  try {
    await action(state.stage, body);
    state.stage = 'complete';
    reply(response, 200, { ok: true });
  } catch {
    state.error = state.stage === 'ens'
      ? 'ENS lookup did not return usable knowledge records. Check the name, Sepolia registration, and RPC; no fallback values were supplied.'
      : 'Live operation failed. Verify the imported builds, provider access, and server-side configuration; no success was recorded.';
    reply(response, 502, { error: state.error });
  } finally { state.busy = false; }
});
server.listen(port, '127.0.0.1', () => console.log(`Ainize live review demo: http://127.0.0.1:${port}`));
