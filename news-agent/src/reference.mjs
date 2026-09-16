/**
 * The reference corpus (§3): Google News RSS → publisher URL → title + lead.
 *
 * Scoring a headline against an absolute rubric would be a taste test. §4.1 and §4.2 compare it against
 * what other newsrooms published on the same story, so this module's only job is to produce that
 * comparison set honestly — and to say clearly when it could not.
 *
 * ## What the feed does not give you, and what each omission costs
 *
 * Verified 2026-09-15. Three gaps, each costing a network round trip:
 *
 *  1. `<description>` carries an anchor to the same Google link and no lead text, so §4.2 cannot be scored
 *     from the feed alone — the article itself has to be fetched.
 *  2. `<link>` is a Google redirect that does NOT resolve server-side (following it lands back on
 *     news.google.com) and does NOT decode (the id is protobuf, not a base64 URL). It resolves only through
 *     the batchexecute call the article page itself makes, keyed by the `data-n-a-sg` / `data-n-a-ts` pair
 *     printed into that page.
 *  3. `<title>` is suffixed with " - Outlet", which has to come off before any wording or length is judged.
 *
 * ## Degrading rather than failing (§7.1)
 *
 * batchexecute is undocumented and may break without notice. When it does, `title` survives — it comes
 * straight from the feed and needs no resolution — and only `lead` is lost. Every reference therefore
 * carries its own `lead: null` rather than being dropped, so the caller can score §4.1 on a full set and
 * skip §4.2 explicitly instead of silently scoring it against a smaller one.
 */

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const RSS = 'https://news.google.com/rss/search';
const BATCH = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';

/** Feed results are not ordered by date, so `pubDate` is sorted on rather than trusted. */
export const DEFAULTS = {
  window: '7d',
  searchLimit: 10,      // how many feed items to attempt
  want: 5,              // how many complete references to aim for
  minimum: 1,           // §3.4 — one topically matched article is enough
  concurrency: 4,
  timeoutMs: 12_000,
  cacheTtlMs: 60 * 60_000,
};

const cache = new Map();

const decode = (s) => String(s ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
  .replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d')
  .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')) : null;
};

/** " - Outlet" is the feed's, not the newsroom's. Judging headline length with it attached is wrong. */
export function stripOutlet(title, outlet) {
  let t = String(title ?? '').trim();
  if (outlet) {
    const suffix = ` - ${outlet}`;
    if (t.toLowerCase().endsWith(suffix.toLowerCase())) return t.slice(0, -suffix.length).trim();
  }
  return t.replace(/\s+-\s+[^-]{2,60}$/, '').trim();
}

/** First sentence of a paragraph, keeping the terminator. */
export function firstSentenceOf(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim() || null;
}

async function get(url, { timeoutMs, ...init } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs ?? DEFAULTS.timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', ...init, signal: ctl.signal, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
    return { ok: res.ok, status: res.status, text: await res.text(), url: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search the news index. The result count is itself the signal §3.5 uses: a query no newsroom has written
 * about returns nothing, and that is a finding about the article rather than a failure of the search.
 */
export async function searchFeed(query, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const q = o.window ? `${query} when:${o.window}` : query;
  const url = `${RSS}?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await get(url, { timeoutMs: o.timeoutMs });
  if (!res.ok) return { ok: false, error: res.error ?? `http ${res.status}`, items: [] };

  const items = [...res.text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, block]) => {
    const outlet = tag(block, 'source');
    const published = tag(block, 'pubDate');
    return {
      title: stripOutlet(tag(block, 'title'), outlet),
      outlet,
      published,
      published_at: published ? Date.parse(published) : null,
      google_url: tag(block, 'link'),
    };
  }).filter((i) => i.title && i.google_url);

  items.sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0));
  return { ok: true, query: q, items };
}

/**
 * Turn a Google redirect into the publisher's URL.
 *
 * The signature pair is printed into the article page and changes; it cannot be cached across articles or
 * guessed. Two requests per reference is the floor, and it is why `want` defaults to 5 rather than 20.
 */
export async function resolveUrl(googleUrl, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = String(googleUrl).split('/articles/')[1]?.split('?')[0];
  if (!id) return { ok: false, error: 'not a google news article url' };

  const page = await get(googleUrl, { timeoutMs: o.timeoutMs });
  if (!page.ok) return { ok: false, error: page.error ?? `http ${page.status}` };
  const sig = page.text.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = page.text.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sig || !ts) return { ok: false, error: 'no signature on article page (batchexecute shape changed)' };

  const inner = JSON.stringify(['garturlreq',
    [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, ts, sig]);
  const res = await get(BATCH, {
    method: 'POST',
    timeoutMs: o.timeoutMs,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ 'f.req': JSON.stringify([[['Fbv4je', inner, null, 'generic']]]) }),
  });
  if (!res.ok) return { ok: false, error: res.error ?? `http ${res.status}` };

  const m = res.text.match(/garturlres\\",\\"(https?:[^\\"]+)/);
  if (!m) return { ok: false, error: 'no url in batchexecute response' };
  return { ok: true, url: m[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&') };
}

/**
 * Title and lead from a publisher page, by three methods in descending order of trust.
 *
 * `articleBody` is what the newsroom declared the article to be. `og:description` is what it declared the
 * summary to be — in practice the lead, and on the sample it carried three of four. Reading `<p>` out of
 * `<article>` is the fallback, and it is last because a page's first long paragraph is as likely to be a
 * cookie notice as a lead unless the wrapper is trimmed first.
 */
export function extractArticle(html) {
  const clean = (s) => decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

  let title = null;
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{4,})["']/i)
    ?? html.match(/<meta[^>]+name=["']og:title["'][^>]+content=["']([^"']{4,})["']/i);
  if (ogTitle) title = decode(ogTitle[1]);
  else {
    const h1 = html.match(/<h1[^>]*>([\s\S]{4,300}?)<\/h1>/i);
    if (h1) title = clean(h1[1]);
  }

  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => {
        if (!o || typeof o !== 'object') return null;
        if (typeof o.articleBody === 'string' && o.articleBody.trim().length > 80) return o.articleBody;
        for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
        return null;
      };
      const body = walk(JSON.parse(m[1].trim()));
      if (body) return { title, lead: firstSentenceOf(decode(body)), body: decode(body), via: 'ld+json articleBody' };
    } catch { /* a malformed block is not a reason to stop looking */ }
  }

  const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{40,})["']/i)
    ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{40,})["']/i);
  if (og) return { title, lead: firstSentenceOf(decode(og[1])), body: null, via: 'og:description' };

  const scope = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
  const paragraphs = [...scope.replace(/<(script|style|nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, '')
    .matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, p]) => clean(p))
    .filter((t) => t.split(/\s+/).length >= 15 && /[.!?]/.test(t));
  if (!paragraphs.length) return { title, lead: null, body: null, via: null };
  return { title, lead: firstSentenceOf(paragraphs[0]), body: paragraphs.join('\n\n'), via: '<article> p' };
}

/** Fetch one publisher page and read it. Blocks, paywalls and timeouts are ordinary, not exceptional. */
export async function fetchArticle(url, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const res = await get(url, { timeoutMs: o.timeoutMs });
  if (!res.ok) return { ok: false, error: res.error ?? `http ${res.status}` };
  return { ok: true, url: res.url ?? url, ...extractArticle(res.text) };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i], i);
  }));
  return out;
}

/**
 * The whole corpus for one query.
 *
 * Returns every attempt, not just the wins: `references` are usable, `failures` say what went wrong and
 * where. §4 needs both — a score computed from two references and a score computed from five are different
 * claims, and the caller can only make the honest one if it knows which it has.
 *
 * `status` distinguishes the two ways of having nothing, because they mean opposite things:
 *   `not_a_news_topic`     the index has no articles at all — evidence about the article (§3.5)
 *   `insufficient_reference` articles exist but none could be read — evidence about us
 */
export async function buildCorpus(query, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const key = `${query}|${o.window}|${o.want}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < o.cacheTtlMs) return { ...hit.value, cached: true };

  const feed = await searchFeed(query, o);
  if (!feed.ok) return { status: 'search_failed', error: feed.error, references: [], failures: [] };
  if (!feed.items.length) {
    return { status: 'not_a_news_topic', query: feed.query, references: [], failures: [], feed_items: 0 };
  }

  const seenOutlet = new Set();
  const candidates = feed.items.filter((i) => {
    const o2 = (i.outlet || '').toLowerCase();
    if (o2 && seenOutlet.has(o2)) return false;      // one voice per newsroom
    if (o2) seenOutlet.add(o2);
    return true;
  }).slice(0, o.searchLimit);

  const failures = [];
  const results = await pool(candidates, o.concurrency, async (item) => {
    const r = await resolveUrl(item.google_url, o);
    // §7.1 — resolution is the undocumented step. Losing it costs the lead, never the headline.
    if (!r.ok) {
      failures.push({ title: item.title, stage: 'resolve', error: r.error });
      return { ...item, url: null, lead: null, degraded: 'url_unresolved' };
    }
    const a = await fetchArticle(r.url, o);
    if (!a.ok) {
      failures.push({ title: item.title, url: r.url, stage: 'fetch', error: a.error });
      return { ...item, url: r.url, lead: null, degraded: 'fetch_failed' };
    }
    return { ...item, url: r.url, lead: a.lead, lead_via: a.via, degraded: a.lead ? null : 'no_lead_found' };
  });

  const references = results.slice(0, o.want);
  const withLead = references.filter((r) => r.lead).length;
  const value = {
    status: references.length >= o.minimum ? 'ok' : 'insufficient_reference',
    query: feed.query,
    feed_items: feed.items.length,
    references,
    with_lead: withLead,
    // §7.1 — the caller must know this before it decides whether §4.2 can be scored at all
    lead_scoring_available: withLead >= o.minimum,
    failures,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearCache() { cache.clear(); }
