/**
 * Judged scoring (§4.1, §4.2, §4.6) with a stubbed model.
 *
 * The model is stubbed because the property under test is not whether Qwen has taste — it is whether a
 * broken, slow or lying model can produce a number that looks like a verdict. §4.3 says a score without
 * reasons is not a result; §4.6 says a test that could not run is not a test that failed. Both are
 * assertions about this file, not about the model.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { overall, scoreLead, scoreTitle } from '../src/score.mjs';

/** A stand-in for the OpenAI-compatible endpoint. `reply` gets the request body and returns the content. */
async function withModel(reply, fn) {
  const calls = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      const parsed = JSON.parse(body);
      calls.push(parsed);
      const out = await reply(parsed, calls.length);
      if (out === 'HTTP_500') { res.writeHead(500).end('{}'); return; }
      if (out === 'HANG') return;                       // never answers — exercises the timeout
      res.writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ choices: [{ message: { content: out } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const endpoint = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
  try { return await fn({ endpoint, calls }); } finally { server.close(); }
}

const refs = [
  { title: 'Teradyne Opens Bengaluru Semiconductor Hub', lead: 'Teradyne inaugurated a hub on Tuesday.' },
  { title: 'Bank of America sees $3.2T chip market', lead: 'Bank of America raised its forecast on Monday.' },
];

test('scoreTitle: a well-formed answer keeps the score, the rank and the reasons together', async () => {
  await withModel(
    () => JSON.stringify({ score: 72, rank: 2, reasons: { specificity: 'names the company' }, suggestions: ['Add the number'] }),
    async ({ endpoint, calls }) => {
      const r = await scoreTitle('Teradyne opens chip hub in Bengaluru', refs, { endpoint });
      assert.equal(r.status, 'ok');
      assert.equal(r.score, 72);
      assert.equal(r.rank, 2);
      assert.equal(r.of, 3, 'rank is out of the references plus the candidate');
      assert.deepEqual(r.suggestions, ['Add the number']);
      assert.ok(r.reasons.specificity, 'a score without its reason is not a result');
      // the reference headlines must actually reach the model, or the comparison is imaginary
      assert.match(calls[0].messages[1].content, /Teradyne Opens Bengaluru/);
      assert.equal(calls[0].temperature, 0);
      assert.equal(calls[0].response_format.type, 'json_object');
      assert.equal(calls[0].chat_template_kwargs.enable_thinking, false,
        'thinking on returns content:null when the budget runs out and reads as a refusal');
    });
});

test('scoreTitle: an out-of-range score is clamped rather than passed through', async () => {
  await withModel(() => JSON.stringify({ score: 140, rank: 99, reasons: {} }), async ({ endpoint }) => {
    const r = await scoreTitle('x', refs, { endpoint });
    assert.equal(r.score, 100);
    assert.equal(r.rank, 3, 'rank cannot exceed references + 1');
  });
});

test('scoreTitle: non-JSON is retried once, then reported as scoring_failed', async () => {
  await withModel(() => 'I think it is pretty good, honestly.', async ({ endpoint, calls }) => {
    const r = await scoreTitle('x', refs, { endpoint });
    assert.equal(r.status, 'scoring_failed');
    assert.match(r.error, /not JSON/);
    assert.equal(calls.length, 2, 'one retry, not three');
  });
});

test('scoreTitle: a fenced JSON block is still JSON', async () => {
  await withModel(() => '```json\n{"score":55,"rank":2,"reasons":{"length":"fine"}}\n```', async ({ endpoint }) => {
    const r = await scoreTitle('x', refs, { endpoint });
    assert.equal(r.status, 'ok');
    assert.equal(r.score, 55);
  });
});

test('scoreTitle: a model that answers but gives no score fails loudly instead of scoring 0', async () => {
  await withModel(() => JSON.stringify({ reasons: { length: 'ok' } }), async ({ endpoint }) => {
    const r = await scoreTitle('x', refs, { endpoint });
    assert.equal(r.status, 'scoring_failed');
    assert.match(r.error, /no usable score/);
  });
});

test('scoreTitle: an HTTP error is retried once and then named', async () => {
  await withModel(() => 'HTTP_500', async ({ endpoint, calls }) => {
    const r = await scoreTitle('x', refs, { endpoint });
    assert.equal(r.status, 'scoring_failed');
    assert.match(r.error, /http 500/);
    assert.equal(calls.length, 2);
  });
});

test('scoreTitle: a model that never answers times out instead of hanging the request', async () => {
  await withModel(() => 'HANG', async ({ endpoint }) => {
    const r = await scoreTitle('x', refs, { endpoint, timeoutMs: 150 });
    assert.equal(r.status, 'scoring_failed');
    assert.match(r.error, /timeout/);
  });
});

test('scoreLead: with no readable reference lead the axis is skipped, not scored zero (§7.1)', async () => {
  let called = false;
  await withModel(() => { called = true; return '{}'; }, async ({ endpoint }) => {
    const leadless = refs.map((r) => ({ ...r, lead: null }));
    const r = await scoreLead('Seoul tightened controls on Tuesday.', leadless, { endpoint });
    assert.equal(r.status, 'skipped');
    assert.match(r.reason, /no topically matched reference/);
    assert.equal(called, false, 'no point paying for a model call with nothing to compare against');
  });
});

test('scoreLead: an article with no lead of its own is skipped with a different reason', async () => {
  await withModel(() => '{}', async ({ endpoint }) => {
    const r = await scoreLead(null, refs, { endpoint });
    assert.equal(r.status, 'skipped');
    assert.match(r.reason, /no lead in the submitted article/);
  });
});

test('overall: weights redistribute across what ran — a skipped axis is not a zero', () => {
  const full = overall({
    title: { status: 'ok', score: 80 }, lead: { status: 'ok', score: 60 },
    readability: { verdict: 'pass' }, length: { verdict: 'fail' },
  });
  // 0.35*80 + 0.35*60 + 0.15*100 + 0.15*20 = 28 + 21 + 15 + 3 = 67
  assert.equal(full.score, 67);
  assert.deepEqual(full.scored_on, ['title', 'lead', 'readability', 'length']);
  assert.deepEqual(full.skipped, []);

  const noLead = overall({
    title: { status: 'ok', score: 80 }, lead: { status: 'skipped' },
    readability: { verdict: 'pass' }, length: { verdict: 'pass' },
  });
  // (0.35*80 + 0.15*100 + 0.15*100) / 0.65 = (28 + 15 + 15) / 0.65 = 89
  assert.equal(noLead.score, 89);
  assert.deepEqual(noLead.skipped, ['lead']);
  assert.ok(noLead.score > 67, 'a lead that could not be fetched must not drag the article down');
  assert.equal(Math.round(Object.values(noLead.weights).reduce((a, b) => a + b, 0)), 1);

  const nothing = overall({});
  assert.equal(nothing.score, null, 'no axis ran, so there is no overall to report');
  assert.deepEqual(nothing.scored_on, []);
});
