/**
 * The two judged tests (§4.1, §4.2), the topical filter they depend on (§3.4), and the weighting that puts
 * them beside the two computed ones (§4.6).
 *
 * Everything here goes through one model call shape and one rule: **a score without its reasons is not a
 * result.** A number the agent cannot justify is a number nobody can argue with, and §4.3 requires the
 * reasoning to travel with the verdict for exactly that reason.
 *
 * The model is the node's own `Qwen3.8-Flash-Next` over an OpenAI-compatible endpoint, so the whole agent
 * runs without an external API key or an egress hop.
 */

import { VERDICT_SCORE } from './text.mjs';

export const MODEL_DEFAULTS = {
  endpoint: process.env.NEWS_AGENT_MODEL_URL ?? 'http://localhost:8000/v1/chat/completions',
  model: process.env.NEWS_AGENT_MODEL ?? 'Qwen3.8-Flash-Next',
  temperature: 0,
  maxTokens: 700,
  timeoutMs: 40_000,
  /**
   * This model puts its chain of thought in a separate `reasoning` field and leaves `content` null when the
   * token budget runs out mid-thought. Every call here wants a short structured answer, not deliberation,
   * so thinking is off — with it on, a 150-token budget returns `content: null` and looks like a refusal.
   */
  enableThinking: false,
};

/**
 * One model call that must come back as JSON.
 *
 * `response_format: json_object` does most of the work; the fenced-block strip is for the case where it is
 * ignored. One retry, then `scoring_failed` (§4.3) — a second failure is a broken prompt or a down model,
 * and retrying past that just turns one bad answer into three.
 */
export async function askJson(messages, opts = {}) {
  const o = { ...MODEL_DEFAULTS, ...opts };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), o.timeoutMs);
    try {
      const res = await fetch(o.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({
          model: o.model,
          temperature: o.temperature,
          max_tokens: o.maxTokens,
          response_format: { type: 'json_object' },
          chat_template_kwargs: { enable_thinking: o.enableThinking },
          messages,
        }),
      });
      if (!res.ok) { if (attempt) return { ok: false, error: `model http ${res.status}` }; continue; }
      const body = await res.json();
      const raw = body?.choices?.[0]?.message?.content;
      if (!raw) { if (attempt) return { ok: false, error: 'model returned no content' }; continue; }
      const text = String(raw).trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
      try {
        return { ok: true, value: JSON.parse(text), model: o.model };
      } catch {
        if (attempt) return { ok: false, error: 'model output was not JSON', raw: text.slice(0, 300) };
      }
    } catch (e) {
      if (attempt) return { ok: false, error: e.name === 'AbortError' ? 'model timeout' : e.message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: 'model failed twice' };
}

const clamp = (n, lo = 0, hi = 100) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null;
};

/**
 * Keep only the references that are about the same story (§3.4).
 *
 * A news search returns articles that share keywords and not a subject — "semiconductor export controls"
 * returns a Bengaluru factory opening beside a Seoul policy change. Scoring a headline against the wrong
 * story is worse than scoring it against fewer articles, which is why this runs before §4.1 rather than
 * being folded into it, and why one surviving reference is enough.
 */
export async function filterByTopic(article, references, opts = {}) {
  if (!references.length) return { ok: true, matched: [], dropped: [] };
  const numbered = references.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
  const res = await askJson([
    { role: 'system', content: 'You decide whether news articles cover the same story. Reply with JSON only.' },
    { role: 'user', content:
`Candidate article:
TITLE: ${article.title}
LEAD: ${article.lead ?? '(none)'}

Candidate reference headlines:
${numbered}

Which references are about the SAME story or the same specific development — not merely the same broad
industry or keyword? Be strict: a different company, a different country's policy, or a different event is
NOT the same story.

Return JSON: {"matched":[<1-based indexes>],"why":{"<index>":"<one short reason>"}}` },
  ], opts);

  if (!res.ok) return { ok: false, error: res.error, matched: [], dropped: [] };
  const picked = new Set((res.value?.matched ?? []).map(Number).filter((n) => n >= 1 && n <= references.length));
  return {
    ok: true,
    matched: references.filter((_, i) => picked.has(i + 1)),
    dropped: references.filter((_, i) => !picked.has(i + 1)).map((r) => r.title),
    why: res.value?.why ?? {},
  };
}

const TITLE_CRITERIA = `- specificity: does it name people, places, numbers, organisations?
- active voice: is there a real verb attached to a real subject?
- length: compare against the reference headlines, not an absolute rule
- clickbait: curiosity gaps, "you won't believe", withheld subjects — PENALISE
- timeliness: is it clear when this happened?`;

const LEAD_CRITERIA = `- 5W1H: how many of who / what / when / where does it carry?
- standalone: does it make sense without reading the headline?
- length: 25-35 words is typical; compare against the reference leads
- inverted pyramid: is the most important fact first?
- throat-clearing: a subordinate clause before the news — PENALISE`;

async function judge({ kind, candidate, references, criteria, opts }) {
  if (!candidate) {
    return { status: 'skipped', reason: `no ${kind} in the submitted article` };
  }
  if (!references.length) {
    return { status: 'skipped', reason: 'no topically matched reference to compare against' };
  }
  const numbered = references.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const res = await askJson([
    { role: 'system', content:
      `You judge whether a news ${kind} works AS NEWS, compared against ${kind}s other newsrooms published `
      + 'on the same story. Reply with JSON only. Never give a score without a reason for it.' },
    { role: 'user', content:
`Reference ${kind}s published on this story:
${numbered}

Candidate ${kind}:
${candidate}

Judge the candidate against those references on:
${criteria}

Return JSON:
{"score": <0-100>,
 "rank": <1 = better than every reference, ${references.length + 1} = worse than all of them>,
 "reasons": {"<criterion>": "<one sentence>"},
 "suggestions": ["<one or two concrete rewrites>"]}` },
  ], opts);

  if (!res.ok) return { status: 'scoring_failed', error: res.error, raw: res.raw };
  const v = res.value ?? {};
  const score = clamp(v.score);
  if (score === null) return { status: 'scoring_failed', error: 'model gave no usable score' };
  return {
    status: 'ok',
    score,
    rank: clamp(v.rank, 1, references.length + 1),
    of: references.length + 1,
    reasons: v.reasons ?? {},
    suggestions: Array.isArray(v.suggestions) ? v.suggestions.slice(0, 2) : [],
  };
}

/** §4.1 — the headline, against the headlines. */
export const scoreTitle = (title, references, opts = {}) =>
  judge({ kind: 'headline', candidate: title, references: references.map((r) => r.title).filter(Boolean),
    criteria: TITLE_CRITERIA, opts });

/** §4.2 — the lead, against the leads that could actually be read (§7.1). */
export const scoreLead = (lead, references, opts = {}) =>
  judge({ kind: 'lead', candidate: lead, references: references.map((r) => r.lead).filter(Boolean),
    criteria: LEAD_CRITERIA, opts });

/**
 * §4.6 — one number out of two scores and two verdicts.
 *
 * Weights are redistributed across whatever actually ran rather than scoring a missing axis as zero. Failing
 * a test and being unable to run it are different facts, and an overall that conflates them would punish an
 * article for a blocked paywall on somebody else's site.
 */
export function overall({ title, lead, readability, length }) {
  const parts = [
    { key: 'title', weight: 0.35, score: title?.status === 'ok' ? title.score : null },
    { key: 'lead', weight: 0.35, score: lead?.status === 'ok' ? lead.score : null },
    { key: 'readability', weight: 0.15, score: readability?.verdict ? VERDICT_SCORE[readability.verdict] : null },
    { key: 'length', weight: 0.15, score: length?.verdict ? VERDICT_SCORE[length.verdict] : null },
  ];
  const scored = parts.filter((p) => p.score !== null);
  if (!scored.length) return { score: null, scored_on: [], skipped: parts.map((p) => p.key) };
  const total = scored.reduce((s, p) => s + p.weight, 0);
  return {
    score: Math.round(scored.reduce((s, p) => s + p.weight * p.score, 0) / total),
    scored_on: scored.map((p) => p.key),
    skipped: parts.filter((p) => p.score === null).map((p) => p.key),
    // the weights actually used, so a partial score can be read for what it is
    weights: Object.fromEntries(scored.map((p) => [p.key, Math.round((p.weight / total) * 100) / 100])),
  };
}
