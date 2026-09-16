/**
 * The A2A surface on the official SDK, and the A2UI surface it emits.
 *
 * Conformance to the protocol is the SDK's job, so these tests do not re-check the JSON-RPC envelope. What
 * they check is the part the SDK cannot supply and the four places the migration to it went wrong — each of
 * which produced a server that started cleanly and failed every call:
 *
 *   1. `jsonRpcHandler` needs a `userBuilder`; without one every request is -32603.
 *   2. The event bus carries `{ kind, data }`; a bare message is "finished without a result".
 *   3. v1.0 parts are `{ content: { $case, value } }`; the v0.3 spelling is "missing content".
 *   4. `role` is a NUMERIC enum; both 'agent' and 'ROLE_AGENT' serialise as UNRECOGNIZED.
 *
 * The scoring itself is not exercised — that needs the network and a model, and it has its own tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A2UI_MIME, a2uiMessages, a2uiParts } from '../src/a2ui.mjs';
import { SERVER_DEFAULTS, agentCard, createA2AApp, isSubmission, replyFor, textOf, textPart } from '../src/server.mjs';

async function withServer(fn, opts = {}) {
  const { app, options } = createA2AApp(opts);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base, options); } finally { server.close(); }
}

const send = (text, extra = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(extra.headers ?? {}) },
  body: JSON.stringify({
    jsonrpc: '2.0', id: extra.id ?? 'x1', method: extra.method ?? 'message/send',
    params: {
      message: { kind: 'message', messageId: 'm1', role: 'user', parts: [{ kind: 'text', text }] },
      configuration: { blocking: true, acceptedOutputModes: ['text/plain'] },
    },
  }),
});

test('the card declares both protocol versions at the same URL, in the SDK two-part spelling', () => {
  const card = agentCard({ ...SERVER_DEFAULTS, publicUrl: 'https://a.example/agents/news' });
  const versions = card.supportedInterfaces.map((i) => i.protocolVersion);
  assert.deepEqual(versions, ['1.0', '0.3']);
  // three-part "1.0.0" is compared literally against the "1.0" a client asks for and refused with -32009
  for (const v of versions) assert.match(v, /^\d+\.\d+$/);
  assert.equal(new Set(card.supportedInterfaces.map((i) => i.url)).size, 1, 'one URL serves both');
  assert.equal(card.supportedInterfaces[0].url, 'https://a.example/agents/news');
  assert.equal(card.name, 'News Fitness', 'a card without a name fails workspace initialisation');
});

test('the card advertises the A2UI extension so a client knows to look for the data parts', () => {
  const ext = agentCard(SERVER_DEFAULTS).capabilities.extensions;
  assert.equal(ext.length, 1);
  assert.match(ext[0].uri, /a2ui/);
  assert.equal(ext[0].required, false, 'the text part always carries the same answer, so it is never required');
  assert.ok(ext[0].params.supportedCatalogIds.length);
});

test('a v0.3 client gets a v0.3 card; asking for 1.0 gets the v1.0 one', async () => {
  await withServer(async (base) => {
    const legacy = await (await fetch(`${base}/.well-known/agent-card.json`)).json();
    assert.equal(legacy.protocolVersion, '0.3', 'absent header means legacy');

    const modern = await (await fetch(`${base}/.well-known/agent-card.json`, { headers: { 'A2A-Version': '1.0' } })).json();
    assert.equal(modern.protocolVersion, undefined, 'the v1.0 card has no top-level protocolVersion');
    assert.ok(modern.supportedInterfaces.length);

    // the legacy spelling some clients try first
    assert.equal((await fetch(`${base}/agent.json`)).status, 200);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

test('chat is answered with silence: an empty TEXT PART, not an empty parts array', async () => {
  await withServer(async (base) => {
    const body = await (await fetch(base, send('good morning'))).json();
    assert.equal(body.error, undefined, 'an empty parts array here is -32603 "finished without a result"');
    const r = body.result;
    assert.equal(r.kind, 'message');
    assert.equal(r.role, 'agent', 'the numeric enum renders back as "agent" for a v0.3 caller');
    assert.deepEqual(r.parts, [{ kind: 'text', text: '' }]);
    assert.ok(r.contextId, 'silence still keeps a session');
    assert.equal(body.id, 'x1');
  });
});

test('an unknown method is refused by the SDK rather than reaching the executor', async () => {
  await withServer(async (base) => {
    const res = await fetch(base, send('x', { method: 'nonsense/method' }));
    const body = await res.json();
    assert.ok(body.error, 'the envelope is the SDK\'s to police');
  });
});

test('an over-long article is refused in words, and never scored', async () => {
  const out = await replyFor('word '.repeat(60), { ...SERVER_DEFAULTS, maxArticleChars: 100 });
  assert.match(out.text, /this agent reads up to 100/);
  assert.deepEqual(out.parts, [], 'a refusal has nothing structured to draw');
});

test('textOf reads both part spellings, and joins a split article', () => {
  assert.equal(textOf({ parts: [{ kind: 'text', text: 'a' }, { kind: 'text', text: 'b' }] }), 'a\nb');
  assert.equal(textOf({ parts: [{ content: { $case: 'text', value: 'v1 text' } }] }), 'v1 text');
  assert.equal(textOf({ parts: [{ kind: 'file', file: {} }] }), '', 'a non-text part contributes nothing');
  assert.equal(textOf(undefined), '');
});

test('textPart emits the v1.0 shape — the v0.3 spelling is rejected as missing content', () => {
  assert.deepEqual(textPart('hi'), { content: { $case: 'text', value: 'hi' } });
});

test('isSubmission: a URL counts however short, prose needs to look like prose', () => {
  assert.equal(isSubmission('https://example.com/a'), true);
  assert.equal(isSubmission('morning!'), false);
  assert.equal(isSubmission('word '.repeat(40)), true);
  assert.equal(isSubmission('word '.repeat(10)), false);
});

test('a2uiMessages: createSurface, updateComponents, updateDataModel — in that order and all v0.9', () => {
  const result = {
    status: 'ok', overall: 71,
    title: { status: 'ok', score: 68, rank: 2, of: 6 },
    lead: { status: 'skipped', reason: 'no reference lead' },
    readability: { fk: 13.4, verdict: 'fail', target: [10, 12] },
    length: { words: 612, verdict: 'fail', target: [450, 550] },
    reference: { matched: [{ outlet: 'Reuters', title: 'A headline', url: 'https://r.example/a' }] },
  };
  const [create, comps, data] = a2uiMessages(result);
  assert.ok(create.createSurface && comps.updateComponents && data.updateDataModel, 'order is load-bearing');
  for (const m of [create, comps, data]) assert.equal(m.version, 'v0.9');
  assert.match(create.createSurface.catalogId, /catalogs\/basic\/catalog\.json$/);

  const byId = new Map(comps.updateComponents.components.map((c) => [c.id, c]));
  assert.ok(byId.has('root'));
  // every child named by the tree must exist, or a renderer draws a gap
  for (const c of byId.values()) {
    for (const k of Array.isArray(c.children) ? c.children : []) assert.ok(byId.has(k), `missing child ${k}`);
    if (c.child) assert.ok(byId.has(c.child), `missing child ${c.child}`);
  }

  const model = data.updateDataModel.value;
  assert.match(model.title, /68\/100/);
  assert.match(model.lead, /^skipped —/, 'a skipped axis says so rather than showing a zero');
  assert.match(model.read, /FK 13\.4/);
  assert.match(model.len, /612 words/);
  assert.equal(model.references.length, 1);
  assert.equal(model.references[0].outlet, 'Reuters');
});

test('a2uiParts wraps each message as a v1.0 data part carrying the A2UI mime type', () => {
  const parts = a2uiParts({ status: 'ok', overall: 50, readability: {}, length: {}, reference: { matched: [] } });
  assert.equal(parts.length, 3);
  for (const p of parts) {
    assert.equal(p.content.$case, 'data', 'the v0.3 { kind, data } spelling is "missing content" to v1.0');
    assert.equal(p.metadata.mimeType, A2UI_MIME);
    assert.equal(p.mediaType, A2UI_MIME);
  }
});
