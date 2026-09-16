/**
 * Reference corpus parsing (§3). Network-free: `stripOutlet`, `firstSentenceOf` and `extractArticle` are
 * the parts that decide whether a comparison is honest, and they are pure.
 *
 * The extraction order is the thing under test. `og:description` is what most newsrooms put the lead in —
 * three of four on the live sample — but a page's first long `<p>` is as likely to be a consent notice, so
 * the fallback is last and scoped to `<article>`. A test that only checked "some text came back" would pass
 * on the consent notice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractArticle, firstSentenceOf, stripOutlet } from '../src/reference.mjs';

test('stripOutlet: the feed appends " - Outlet"; judging headline length with it attached is wrong', () => {
  assert.equal(stripOutlet('Chips fall as export rules bite - Reuters', 'Reuters'),
    'Chips fall as export rules bite');
  // the outlet name is matched case-insensitively, as feeds are inconsistent about it
  assert.equal(stripOutlet('Chips fall - REUTERS', 'Reuters'), 'Chips fall');
  // no outlet given: fall back to the shape, but only for a plausible suffix
  assert.equal(stripOutlet('Chips fall as export rules bite - Global Sources'),
    'Chips fall as export rules bite');
  // a hyphen inside the headline is not an outlet suffix
  assert.equal(stripOutlet('Seoul-Beijing talks resume'), 'Seoul-Beijing talks resume');
  assert.equal(stripOutlet(''), '');
});

test('firstSentenceOf: keeps the terminator, collapses whitespace, survives a lead with no full stop', () => {
  assert.equal(firstSentenceOf('One two three. Four five.'), 'One two three.');
  assert.equal(firstSentenceOf('  Spread   out\n  words here. Next.'), 'Spread out words here.');
  assert.equal(firstSentenceOf('No terminator here'), 'No terminator here');
  assert.equal(firstSentenceOf('   '), null);
});

test('extractArticle: ld+json articleBody is trusted first — it is what the newsroom declared', () => {
  const html = `<html><head>
    <meta property="og:title" content="Chips fall as export rules bite">
    <meta property="og:description" content="A summary that is not the lead but is long enough to qualify.">
    <script type="application/ld+json">${JSON.stringify({
      '@type': 'NewsArticle',
      articleBody: 'Seoul tightened export controls on Tuesday, delaying shipments. A second sentence follows.',
    })}</script></head><body></body></html>`;
  const r = extractArticle(html);
  assert.equal(r.via, 'ld+json articleBody');
  assert.equal(r.lead, 'Seoul tightened export controls on Tuesday, delaying shipments.');
  assert.equal(r.title, 'Chips fall as export rules bite');
  assert.ok(r.body.includes('second sentence'));
});

test('extractArticle: a malformed ld+json block does not stop the search', () => {
  const html = `<html><head>
    <script type="application/ld+json">{ not json at all</script>
    <meta property="og:description" content="Seoul tightened export controls on Tuesday, delaying shipments.">
    </head><body></body></html>`;
  const r = extractArticle(html);
  assert.equal(r.via, 'og:description');
  assert.equal(r.lead, 'Seoul tightened export controls on Tuesday, delaying shipments.');
});

test('extractArticle: nested ld+json (@graph) is walked rather than required at the top level', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@graph': [{ '@type': 'WebSite' },
      { '@type': 'NewsArticle', articleBody: 'Seoul tightened export controls on Tuesday and officials '
        + 'said shipments would be delayed. A second sentence follows here.' }],
  })}</script>`;
  const r = extractArticle(html);
  assert.equal(r.via, 'ld+json articleBody');
  assert.equal(r.lead, 'Seoul tightened export controls on Tuesday and officials said shipments would be delayed.');
});

test('extractArticle: the <p> fallback is scoped to <article>, so a consent notice is not read as a lead', () => {
  const html = `<html><body>
    <nav><p>We use cookies and similar technologies to improve your experience on this website today.</p></nav>
    <article>
      <p>Short one.</p>
      <p>Seoul tightened export controls on advanced chipmaking equipment on Tuesday, delaying shipments for
         several global manufacturers and raising costs across the supply chain, officials said.</p>
    </article></body></html>`;
  const r = extractArticle(html);
  assert.equal(r.via, '<article> p');
  assert.match(r.lead, /^Seoul tightened/, 'the nav paragraph is outside <article> and is not the lead');
  assert.doesNotMatch(r.lead, /cookies/);
});

test('extractArticle: a page with nothing readable says so rather than inventing a lead', () => {
  const r = extractArticle('<html><body><div>no paragraphs here</div></body></html>');
  assert.equal(r.lead, null);
  assert.equal(r.via, null);
});

test('extractArticle: entities are decoded to the characters actually written, not to ASCII lookalikes', () => {
  const html = '<meta property="og:description" content="Seoul&#8217;s new rules &amp; tariffs took effect '
    + 'on Tuesday, according to officials.">';
  const r = extractArticle(html);
  // a curly apostrophe is what the newsroom published; flattening it would change the text being judged
  assert.match(r.lead, /Seoul\u2019s new rules & tariffs/);
  // the named and numeric forms of the same character must decode the same way
  assert.equal(extractArticle('<meta name="description" content="A&rsquo;s and B&#8217;s are the same here always.">').lead,
    'A\u2019s and B\u2019s are the same here always.');
});
