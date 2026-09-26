/**
 * Create or update news-review on an Ainize node.
 *
 *   AINIZE_SESSION=<token> node hosted/deploy.mjs https://ainize.ai [--model Qwen3.8-Flash-Next]
 *
 * The token is a site session (`ainize login` prints one; the web's `ainize_session` cookie is the same thing).
 * The node must have `agentHost.docker.enabled`, and `news-review` must not also be a `config.json` agent — the
 * hosted one cannot take an id the node already proxies (remove it with `ainize agent rm news-review` first).
 */
import { newsReviewSpec } from './news-review-spec.mjs';

const [node, ...rest] = process.argv.slice(2);
const token = process.env.AINIZE_SESSION;
if (!node || !token) {
  console.error('usage: AINIZE_SESSION=<token> node hosted/deploy.mjs <node-url> [--model <id>]');
  process.exit(2);
}
const modelFlag = rest.indexOf('--model');
const spec = newsReviewSpec(modelFlag >= 0 ? { model: rest[modelFlag + 1] } : {});
const base = node.replace(/\/+$/, '');
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const existing = await fetch(`${base}/api/hosted-agents/${spec.id}`, { headers });
const res = existing.status === 404
  ? await fetch(`${base}/api/hosted-agents`, { method: 'POST', headers, body: JSON.stringify(spec) })
  : await fetch(`${base}/api/hosted-agents/${spec.id}`, { method: 'PUT', headers, body: JSON.stringify(spec) });
const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`${res.status}: ${body?.error?.message ?? JSON.stringify(body)}`);
  process.exit(1);
}
console.log(`${existing.status === 404 ? 'created' : 'updated'} ${spec.id} v${body.agent?.version ?? '?'} — ${base}/agents/${spec.id} (status ${body.agent?.status})`);
console.log(`build log: GET ${base}/api/hosted-agents/${spec.id}/logs`);
