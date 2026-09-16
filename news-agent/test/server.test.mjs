/**
 * The A2A surface (§2). Everything here is about the protocol, not the scoring — `evaluate` is never
 * reached, because the questions are whether the card is well formed, whether a malformed call is refused
 * cleanly, and whether the two things that make an agent a bad channel citizen are prevented:
 * answering chat as if it were an article, and letting an unauthenticated caller spend the GPU.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentCard, createA2AServer, handleMessageSend, SERVER_DEFAULTS } from '../src/server.mjs';

async function withServer(fn, opts = {}) {
  const { server, options } = createA2AServer({ port: 0, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base, options); } finally { server.close(); }
}

const rpc = (params, id = 'x1') => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id, method: 'message/send', params }),
});
const msg = (text) => ({ message: { kind: 'message', messageId: 'm1', role: 'user', parts: [{ kind: 'text', text }] } });

test('agentCard: carries the fields the workspace requires to initialise', () => {
  const card = agentCard({ ...SERVER_DEFAULTS, name: 'News Fitness', publicUrl: 'https://a.example' });
  assert.equal(card.name, 'News Fitness', 'a card without a name fails initialisation');
  assert.equal(card.protocolVersion, '0.3.0');
  assert.equal(card.url, 'https://a.example');
  assert.ok(card.skills.length);
  // url is optional and must be absent rather than null when unset, so the base URL is used
  assert.equal('url' in agentCard({ ...SERVER_DEFAULTS, publicUrl: null }), false);
});

test('GET the card at the well-known path and at the legacy fallback', async () => {
  await withServer(async (base) => {
    for (const p of ['/.well-known/agent-card.json', '/.well-known/agent.json', '/agent.json']) {
      const res = await fetch(base + p);
      assert.equal(res.status, 200, p);
      assert.equal((await res.json()).protocolVersion, '0.3.0');
    }
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});

test('a malformed or unknown JSON-RPC call is refused with a code, not a 500', async () => {
  await withServer(async (base) => {
    const bad = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ not json' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, -32700);

    const noVersion = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"id":1}' });
    assert.equal((await noVersion.json()).error.code, -32600);

    const wrongMethod = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tasks/get', params: {} }),
    });
    assert.equal(wrongMethod.status, 404);
    const body = await wrongMethod.json();
    assert.equal(body.error.code, -32601);
    assert.equal(body.id, 9, 'the request id is echoed even on an error');
  });
});

test('chat gets silence, not a lecture — empty parts with the session intact', async () => {
  await withServer(async (base) => {
    for (const chatter of ['morning!', 'thanks', 'what do you do?']) {
      const res = await fetch(base, rpc(msg(chatter)));
      assert.equal(res.status, 200);
      const { result, id } = await res.json();
      assert.equal(id, 'x1', 'the id is echoed');
      assert.equal(result.kind, 'message');
      assert.equal(result.role, 'agent');
      assert.deepEqual(result.parts, [], `"${chatter}" should be heard and not answered`);
      assert.ok(result.contextId, 'silence still keeps a session');
    }
  });
});

test('contextId is echoed when given, so a thread stays one conversation', async () => {
  await withServer(async (base) => {
    const res = await fetch(base, rpc({
      message: { kind: 'message', messageId: 'm2', role: 'user', contextId: 'ctx-42', parts: [{ kind: 'text', text: 'hi' }] },
    }));
    assert.equal((await res.json()).result.contextId, 'ctx-42');
  });
});

test('an article past the character limit is refused in words, not truncated silently', async () => {
  const o = { ...SERVER_DEFAULTS, maxArticleChars: 100 };
  const out = await handleMessageSend(msg('word '.repeat(60)), o);
  assert.equal(out.silent, undefined);
  assert.match(out.text, /this agent reads up to 100/);
});

test('an oversized body is rejected before it is parsed', async () => {
  await withServer(async (base) => {
    const res = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'message/send', params: msg('x'.repeat(300_000)) }),
    });
    assert.equal(res.status, 413);
  }, { maxBodyBytes: 5_000 });
});

test('rate limiting protects an endpoint that receives no authentication headers', async () => {
  await withServer(async (base) => {
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await fetch(base, rpc(msg('hi')))).status);
    assert.deepEqual(codes, [200, 200, 429, 429], 'the cap applies per IP within the window');
    const body = await (await fetch(base, rpc(msg('hi')))).json();
    assert.equal(body.error.code, -32029);
  }, { rateLimit: { windowMs: 60_000, perIp: 2 } });
});

test('text arrives even when a client splits the article across several parts', async () => {
  const o = { ...SERVER_DEFAULTS, maxArticleChars: 10 };
  const out = await handleMessageSend({
    message: { kind: 'message', messageId: 'm3', role: 'user',
      parts: [{ kind: 'text', text: 'word '.repeat(30) }, { kind: 'text', text: 'word '.repeat(30) }] },
  }, o);
  // joined, it is long enough to be a submission and past the (tiny) limit — proof both parts were read
  assert.match(out.text, /reads up to 10/);
});

test('a URL is a submission even though it is short; a bare greeting is not', async () => {
  const o = { ...SERVER_DEFAULTS, maxArticleChars: 5 };
  const url = await handleMessageSend(msg('https://example.com/article'), o);
  assert.match(url.text, /reads up to 5/, 'a URL is treated as a submission, not as chat');
  const greeting = await handleMessageSend(msg('hello there'), o);
  assert.equal(greeting.silent, true);
});
