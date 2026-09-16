/**
 * The A2A surface (§2): one agent card and one `message/send`. Zero dependencies, so it runs beside
 * `ainize-node` as a plain Node process and needs nothing from a deploy platform.
 *
 * Two properties of the protocol shape this file more than the scoring does:
 *
 *  1. **No authentication headers arrive.** The spec supports public endpoints only, so anything that costs
 *     money or GPU has to be rationed here — by IP, by contextId and by body size — or the first crawler
 *     that finds the URL spends the node's budget for it (§5).
 *  2. **Silence is a valid answer.** Empty `parts` means "heard, not replying", which is what stops an agent
 *     in full-delivery mode from answering every message in a channel. A greeting gets silence, not a
 *     lecture about article formats.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { evaluate, renderText } from './evaluate.mjs';

export const SERVER_DEFAULTS = {
  port: Number(process.env.PORT ?? 4010),
  host: process.env.HOST ?? '0.0.0.0',
  name: process.env.AGENT_NAME ?? 'News Fitness',
  publicUrl: process.env.AGENT_URL ?? null,
  maxBodyBytes: 200_000,
  maxArticleChars: 20_000,
  rateLimit: { windowMs: 60_000, perIp: 6 },
};

/** §2.1 — the card. `name` is required; omitting it fails initialisation on the workspace side. */
export function agentCard(o) {
  return {
    name: o.name,
    description:
      'Scores whether an article works as news: headline and lead against other newsrooms covering the same '
      + 'story, plus Flesch–Kincaid grade and word count. Send the article text, or a URL to it.',
    protocolVersion: '0.3.0',
    ...(o.publicUrl ? { url: o.publicUrl } : {}),
    version: '0.1.0',
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    capabilities: { streaming: false, pushNotifications: false },
    skills: [{
      id: 'news-fitness',
      name: 'News fitness check',
      description: 'Four scores: headline, lead, readability (FK 10–12), length (about 500 words).',
      tags: ['news', 'editing', 'readability'],
      examples: ['Paste an article and ask how it reads as news', 'https://example.com/article'],
    }],
  };
}

/**
 * Per-server, not per-module: two servers in one process are two endpoints with two budgets, and a shared
 * counter would let traffic to one of them throttle the other. The map is swept rather than left to grow,
 * since the keys are attacker-controlled.
 */
function makeRateLimiter(o) {
  const seen = new Map();
  return (ip) => {
    const now = Date.now();
    const hits = (seen.get(ip) ?? []).filter((t) => now - t < o.rateLimit.windowMs);
    hits.push(now);
    seen.set(ip, hits);
    if (seen.size > 5000) {
      for (const [k, v] of seen) if (!v.some((t) => now - t < o.rateLimit.windowMs)) seen.delete(k);
    }
    return hits.length > o.rateLimit.perIp;
  };
}

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** A message result. `parts: []` is the silence §2 requires — the session stands, nothing is delivered. */
const rpcMessage = (id, contextId, text) => ({
  jsonrpc: '2.0',
  id,
  result: {
    kind: 'message',
    messageId: randomUUID(),
    role: 'agent',
    parts: text ? [{ kind: 'text', text }] : [],
    contextId: contextId ?? randomUUID(),
  },
});

/** Everything the caller sent, flattened. A client may split an article across several text parts. */
const textOf = (message) => (message?.parts ?? [])
  .filter((p) => p?.kind === 'text' && typeof p.text === 'string')
  .map((p) => p.text).join('\n').trim();

/**
 * Is this an article, or is it chat?
 *
 * In full-delivery mode the agent sees every message in a channel, and most of them are not articles.
 * Treating "morning!" as a 3-word article would produce a confident 20/100 and a suggestion to add a lead,
 * which is noise. Short input that is not a URL gets silence instead.
 */
const isSubmission = (text) => /^https?:\/\/\S+$/i.test(text) || text.split(/\s+/).length >= 40;

export async function handleMessageSend(params, o) {
  const message = params?.message;
  const contextId = message?.contextId;
  const text = textOf(message);

  if (!text) return { silent: true, contextId };
  if (!isSubmission(text)) return { silent: true, contextId };
  if (text.length > o.maxArticleChars) {
    return { contextId, text: `That is ${text.length} characters; this agent reads up to ${o.maxArticleChars}.` };
  }

  const result = await evaluate(text, o);
  return { contextId, text: `${renderText(result)}\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``, result };
}

/**
 * Read the body, refusing to buffer past `limit`.
 *
 * Over the limit it stops accumulating and answers immediately, but does NOT tear the socket down here: the
 * 413 has to reach the caller, and destroying the request first turns a clean refusal into a connection
 * reset that looks like the agent crashed. The remaining bytes are drained and discarded instead.
 */
function readBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0;
    let done = false;
    const chunks = [];
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => {
      if (done) return;                       // draining: past the limit, keep nothing
      size += c.length;
      if (size > limit) { finish({ tooLarge: true }); return; }
      chunks.push(c);
    });
    req.on('end', () => finish({ body: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', () => finish({ error: true }));
    req.on('aborted', () => finish({ error: true }));
  });
}

export function createA2AServer(opts = {}) {
  const o = { ...SERVER_DEFAULTS, ...opts, rateLimit: { ...SERVER_DEFAULTS.rateLimit, ...(opts.rateLimit ?? {}) } };
  const rateLimited = makeRateLimiter(o);

  const server = createServer(async (req, res) => {
    const send = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(payload));
    };
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }).end();
      return;
    }

    // §2.1 — the card, at both the well-known path and the legacy fallback
    if (req.method === 'GET' && ['/.well-known/agent-card.json', '/.well-known/agent.json', '/agent.json']
      .includes(url.pathname)) {
      return send(200, agentCard(o));
    }
    if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true, name: o.name });

    if (req.method !== 'POST') return send(404, { error: 'not found' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
    if (rateLimited(ip)) return send(429, rpcError(null, -32029, 'rate limit: try again in a minute'));

    const { body, tooLarge, error } = await readBody(req, o.maxBodyBytes);
    if (tooLarge) {
      send(413, rpcError(null, -32600, 'request body too large'));
      req.destroy();                          // only after the refusal is on the wire
      return;
    }
    if (error) return send(400, rpcError(null, -32700, 'could not read request'));

    let rpc;
    try { rpc = JSON.parse(body); } catch { return send(400, rpcError(null, -32700, 'parse error')); }
    if (rpc?.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
      return send(400, rpcError(rpc?.id, -32600, 'invalid request'));
    }
    if (rpc.method !== 'message/send') {
      return send(404, rpcError(rpc.id, -32601, `method not found: ${rpc.method}`));
    }

    try {
      const out = await handleMessageSend(rpc.params, o);
      return send(200, rpcMessage(rpc.id, out.contextId, out.silent ? '' : out.text));
    } catch (e) {
      // An internal failure is reported as an error, never as a score of zero.
      return send(500, rpcError(rpc.id, -32603, `evaluation failed: ${e.message}`));
    }
  });

  return { server, options: o };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { server, options } = createA2AServer();
  server.listen(options.port, options.host, () => {
    const base = options.publicUrl ?? `http://localhost:${options.port}`;
    console.log(`${options.name} — A2A on ${options.host}:${options.port}`);
    console.log(`  card   ${base}/.well-known/agent-card.json`);
    console.log(`  send   POST ${base}/   (jsonrpc 2.0, method "message/send")`);
  });
}
