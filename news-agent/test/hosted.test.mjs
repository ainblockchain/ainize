/**
 * news-review as a hosted agent: the handler answers through `ctx`, and the packaged spec carries every module
 * the handler imports and nothing it does not.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import handler, { NEWS_REVIEW_MAX_ARTICLE_CHARS } from '../hosted/index.mjs';
import { newsReviewFiles, newsReviewSpec, relativeImportsOf } from '../hosted/news-review-spec.mjs';

const fakeCtx = (baseUrl = 'http://127.0.0.1:9/t/x/v1') => ({ llm: { baseUrl, model: 'M' } });

test('chat is met with silence, as before', async () => {
  assert.deepEqual(await handler.execute('good morning', fakeCtx()), { text: '', parts: [] });
});

test('an over-long article is refused in words', async () => {
  const long = 'word '.repeat(NEWS_REVIEW_MAX_ARTICLE_CHARS / 4);
  const out = await handler.execute(long, fakeCtx());
  assert.match(out.text, /reads up to 20000/);
});

test('the model is called at ctx.llm.baseUrl with the agent model', async () => {
  const seen = [];
  const server = createServer((req, res) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      seen.push({ url: req.url, model: JSON.parse(b).model });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: '{"query":""}' } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const article = `Headline here\n${'This is a sentence of the body of the article. '.repeat(10)}`;
    const out = await handler.execute(article, fakeCtx(`http://127.0.0.1:${server.address().port}/t/tok/v1`));
    assert.ok(seen.length >= 1, 'the model was asked');
    assert.equal(seen[0].url, '/t/tok/v1/chat/completions');
    assert.equal(seen[0].model, 'M');
    assert.match(out.text, /Readability|FK/i);
  } finally { server.close(); }
});

test('the spec packages exactly the modules the handler reaches', () => {
  const files = newsReviewFiles();
  assert.deepEqual(Object.keys(files).sort(), ['index.mjs', 'src/a2ui.mjs', 'src/evaluate.mjs', 'src/reference.mjs', 'src/reply.mjs', 'src/score.mjs', 'src/text.mjs']);
  for (const [key, source] of Object.entries(files)) {
    for (const imp of relativeImportsOf(source)) assert.ok(!imp.includes('server.mjs'), `${key} must not pull in the SDK-bound server`);
  }
  const spec = newsReviewSpec();
  assert.equal(spec.mode, 'handler');
  assert.equal(spec.id, 'news-review');
  assert.ok(JSON.stringify(spec).length < 1_000_000, 'under the node\'s code limit');
});
