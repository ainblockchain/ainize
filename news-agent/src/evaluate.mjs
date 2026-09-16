/**
 * The whole evaluation, end to end: take an article, produce the four scores (§4).
 *
 * This is the file that decides what "could not be measured" means, and it keeps that distinct from "scored
 * badly" at every step. A blocked paywall on somebody else's site, a search index with nothing in it, and a
 * genuinely weak headline are three different findings; collapsing them into one number would make the
 * agent confidently wrong in the one case where being wrong costs the user an edit they did not need.
 */

import { buildCorpus, extractArticle, firstSentenceOf } from './reference.mjs';
import { fleschKincaid, lengthCheck, splitSentences } from './text.mjs';
import { askJson, filterByTopic, overall, scoreLead, scoreTitle } from './score.mjs';

export const EVALUATE_DEFAULTS = {
  budgetMs: 60_000,       // §5 — the whole turn, not one call
  want: 5,
  searchLimit: 8,
  window: '7d',
};

/**
 * Split submitted text into a headline and a body.
 *
 * The first line is the headline, which is how people paste articles and what §7-3 settles. It is treated
 * as a headline only if it looks like one: a first line that runs to forty words is a lead with no headline
 * above it, and calling it a title would score the article for a headline it never had.
 */
export function parseArticle(text) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { title: null, body: '', lead: null };

  const lines = raw.split('\n');
  let title = null;
  let rest = raw;

  const first = lines[0].replace(/^#+\s*/, '').trim();
  const looksLikeHeadline = first.length > 0 && first.split(/\s+/).length <= 25 && !/[.!?]$/.test(first);
  if (looksLikeHeadline && lines.length > 1) {
    title = first;
    rest = lines.slice(1).join('\n').trim();
  }
  return { title, body: rest, lead: firstSentenceOf(rest) };
}

const looksLikeUrl = (s) => /^https?:\/\/\S+$/i.test(String(s ?? '').trim());

/** Fetch a submitted URL with the same extractor the references use, so both sides are read alike. */
async function loadFromUrl(url, opts) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36' },
    });
    if (!res.ok) return { ok: false, error: `http ${res.status}` };
    const a = extractArticle(await res.text());
    if (!a.title && !a.body) return { ok: false, error: 'nothing readable at that URL' };
    return { ok: true, title: a.title, body: a.body ?? '', lead: a.lead, source_url: url, via: a.via };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The search terms for the reference corpus.
 *
 * Asked of the model rather than taken from the headline, because a headline is written to be interesting
 * and a query has to be findable: "Chips are the new oil" retrieves nothing, while the story it describes
 * retrieves plenty. Falls back to the headline's own longest words if the model is unavailable — a worse
 * query is better than no comparison at all.
 */
export async function topicQuery(article, opts = {}) {
  const res = await askJson([
    { role: 'system', content: 'You turn a news article into a news-search query. Reply with JSON only.' },
    { role: 'user', content:
`TITLE: ${article.title ?? '(none)'}
LEAD: ${article.lead ?? '(none)'}

Give the search query that would find OTHER newsrooms' coverage of this same story. Use the proper nouns and
the event, not adjectives. Three to eight words.

Return JSON: {"query":"<words>"}` },
  ], opts);

  if (res.ok && typeof res.value?.query === 'string' && res.value.query.trim()) {
    return { query: res.value.query.trim(), via: 'model' };
  }
  const fallback = String(article.title ?? '').split(/\s+/)
    .filter((w) => w.length > 3).slice(0, 6).join(' ');
  return { query: fallback, via: 'title-fallback', model_error: res.ok ? 'empty query' : res.error };
}

/**
 * Score one article.
 *
 * Order matters and is load-bearing: the computed tests run FIRST and unconditionally, so that a network
 * failure, an empty index or a down model still returns something true about the article (§7.1). Everything
 * after that is best-effort and says so.
 */
export async function evaluate(input, opts = {}) {
  const o = { ...EVALUATE_DEFAULTS, ...opts };
  const started = Date.now();
  const notes = [];

  // ── the article itself
  let article;
  if (looksLikeUrl(input)) {
    const loaded = await loadFromUrl(input.trim(), o);
    if (!loaded.ok) return { status: 'input_unreadable', error: loaded.error, input_kind: 'url' };
    article = { title: loaded.title, body: loaded.body, lead: loaded.lead, source_url: loaded.source_url };
    notes.push(`article read from URL via ${loaded.via}`);
  } else {
    article = parseArticle(input);
    if (!article.body) return { status: 'input_unreadable', error: 'empty article', input_kind: 'text' };
    if (!article.title) notes.push('no headline found: the first line reads as prose, so §4.1 is skipped');
  }

  // ── §4.4 and §4.5 — always, no network, no model
  const readability = fleschKincaid(article.body);
  const length = lengthCheck(article.body);

  // ── §3 — the comparison set
  const topic = await topicQuery(article, o);
  if (topic.via !== 'model') notes.push(`topic query fell back to the headline (${topic.model_error})`);

  const corpus = topic.query
    ? await buildCorpus(topic.query, o)
    : { status: 'insufficient_reference', references: [], failures: [], feed_items: 0 };

  let matched = [];
  let title = { status: 'skipped', reason: 'no reference corpus' };
  let lead = { status: 'skipped', reason: 'no reference corpus' };

  if (corpus.status === 'not_a_news_topic') {
    notes.push('the news index has no coverage of this topic at all — §3.5 says that is a finding about the article');
  } else if (corpus.status === 'ok') {
    // §3.4 — same keywords is not the same story
    const topical = await filterByTopic(article, corpus.references, o);
    if (!topical.ok) {
      notes.push(`topic filter unavailable (${topical.error}); comparing against unfiltered search results`);
      matched = corpus.references;
    } else {
      matched = topical.matched;
      if (topical.dropped.length) notes.push(`${topical.dropped.length} search result(s) dropped as a different story`);
    }

    if (matched.length) {
      [title, lead] = await Promise.all([
        scoreTitle(article.title, matched, o),
        scoreLead(article.lead, matched, o),
      ]);
    } else {
      const why = 'search returned articles but none cover this story';
      title = { status: 'skipped', reason: why };
      lead = { status: 'skipped', reason: why };
    }
  } else {
    notes.push(`no usable reference (${corpus.status})`);
  }

  if (lead.status === 'skipped' && matched.length && !matched.some((r) => r.lead)) {
    notes.push('reference leads could not be fetched, so §4.2 was skipped rather than scored against nothing');
  }

  const summary = overall({ title, lead, readability, length });
  const elapsed = Date.now() - started;
  if (elapsed > o.budgetMs) notes.push(`took ${(elapsed / 1000).toFixed(1)}s, over the ${o.budgetMs / 1000}s budget`);

  return {
    status: 'ok',
    overall: summary.score,
    scored_on: summary.scored_on,
    skipped: summary.skipped,
    weights: summary.weights,
    article: {
      title: article.title,
      lead: article.lead,
      source_url: article.source_url ?? null,
      words: length.words,
      sentences: splitSentences(article.body).length,
    },
    title,
    lead,
    readability,
    length,
    reference: {
      query: topic.query,
      query_via: topic.via,
      status: corpus.status,
      feed_items: corpus.feed_items ?? 0,
      matched: matched.map((r) => ({
        title: r.title, outlet: r.outlet, url: r.url, published: r.published, lead: r.lead,
      })),
      failures: corpus.failures ?? [],
    },
    notes,
    elapsed_ms: elapsed,
  };
}

/** The human-readable half of §4.7. The JSON is the same object, rendered by the caller. */
export function renderText(r) {
  if (r.status === 'input_unreadable') return `Could not read the article: ${r.error}`;
  const L = [];
  L.push(`News fitness — ${r.overall === null ? 'not scored' : `${r.overall}/100`}`);
  L.push('');

  const axis = (label, v) => {
    if (!v) return `  ${label.padEnd(14)} —`;
    if (v.status === 'skipped') return `  ${label.padEnd(14)} skipped — ${v.reason}`;
    if (v.status === 'scoring_failed') return `  ${label.padEnd(14)} could not score — ${v.error}`;
    return `  ${label.padEnd(14)} ${String(v.score).padStart(3)}   (rank ${v.rank}/${v.of})`;
  };
  L.push(axis('① Title', r.title));
  L.push(axis('② Lead', r.lead));
  L.push(`  ${'③ Readability'.padEnd(14)} FK ${r.readability.fk ?? '—'}  ${mark(r.readability.verdict)}`
    + `   target ${r.readability.target?.[0]}–${r.readability.target?.[1]}`);
  L.push(`  ${'④ Length'.padEnd(14)} ${r.length.words} words  ${mark(r.length.verdict)}`
    + `   target ${r.length.target[0]}–${r.length.target[1]}`);

  const tips = [...(r.title?.suggestions ?? []), ...(r.lead?.suggestions ?? [])];
  if (tips.length) { L.push(''); L.push(`Biggest win: ${tips[0]}`); }
  if (r.readability.hardest_sentences?.length) {
    L.push(`Readability is carried by: "${r.readability.hardest_sentences[0].sentence.slice(0, 90)}…"`);
  }
  if (r.reference.matched.length) {
    L.push('');
    L.push(`Compared against ${r.reference.matched.length} article(s) on the same story:`);
    for (const m of r.reference.matched.slice(0, 5)) L.push(`  · ${m.outlet ?? '?'} — ${m.title}`);
  }
  if (r.notes.length) { L.push(''); for (const n of r.notes) L.push(`note: ${n}`); }
  return L.join('\n');
}

const mark = (v) => (v === 'pass' ? '✓ pass' : v === 'warn' ? '~ warn' : '✗ fail');
