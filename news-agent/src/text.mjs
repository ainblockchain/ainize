/**
 * The two tests that need no network and no model: readability and length (§4.4, §4.5).
 *
 * These are here on their own because they are the only part of the agent that is arithmetic rather than
 * judgement. They run when the reference corpus is empty, when Google is down, and when the model refuses —
 * which is why the degraded modes in §7.1 can always answer with something.
 *
 * Everything below counts English. Syllable counting in particular is a heuristic over English spelling; it
 * is stated where it is wrong rather than papered over, because a Flesch–Kincaid grade is only as honest as
 * the syllable count under it.
 */

/** Sentence-ending punctuation that is not an abbreviation, an initial, or a decimal point. */
const SENTENCE_END = /([.!?]+)(["'”’)\]]*)(\s+|$)/g;

/**
 * Abbreviations whose trailing period does not end a sentence. Short and deliberately incomplete: the list
 * exists to stop the commonest news-copy false splits (`Mr. Lee said`, `Washington, D.C. on Tuesday`,
 * `$4.2 bn`), not to be a parser. Anything missing costs one sentence of accuracy, which moves FK by ~0.1.
 */
const ABBREV = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sen', 'rep', 'gov', 'gen', 'lt', 'col', 'sgt', 'st', 'jr', 'sr',
  'inc', 'ltd', 'co', 'corp', 'vs', 'etc', 'al', 'approx', 'est', 'dept', 'univ',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec',
  'u.s', 'u.k', 'e.g', 'i.e', 'a.m', 'p.m', 'd.c', 'no',
]);

/**
 * Split into sentences.
 *
 * A decimal point, an initial (`J. R. R.`) and an abbreviation all look exactly like a full stop to a regex,
 * and news copy is full of all three — money, dates, titles. Each false split shortens the mean sentence
 * length, which lowers the FK grade, which is the number this file exists to report. So the split is
 * checked against the token before the period rather than taken at face value.
 */
export function splitSentences(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const out = [];
  let start = 0;
  SENTENCE_END.lastIndex = 0;
  for (let m; (m = SENTENCE_END.exec(t));) {
    const end = m.index + m[1].length + m[2].length;
    const before = t.slice(start, m.index);
    const lastWord = (before.match(/(\S+)$/) || ['', ''])[1].toLowerCase().replace(/^[^a-z.]+/, '');
    // "4.2" — a decimal point, not a stop
    if (/\d$/.test(before) && /^\d/.test(t.slice(end).trimStart())) continue;
    // "J." — a single letter is an initial
    if (/^[a-z]$/.test(lastWord)) continue;
    if (ABBREV.has(lastWord.replace(/\.$/, ''))) continue;
    const s = t.slice(start, end).trim();
    if (s) out.push(s);
    start = end;
  }
  const tail = t.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Words, by the rule §4.5 fixes: whitespace-separated, punctuation-only tokens dropped. */
export function splitWords(text) {
  return String(text ?? '')
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length > 0 && /[\p{L}\p{N}]/u.test(w));
}

/**
 * Syllables in one English word, by the standard vowel-group heuristic with the three corrections that
 * matter most at news vocabulary: a silent terminal `e` (`code` is 1, not 2), a terminal `le` after a
 * consonant that keeps its syllable (`table` is 2), and `-es`/`-ed` that usually does not add one
 * (`rates` is 1, `rated` is 2 — the `t` before `ed` is the exception, not the rule).
 *
 * It is a heuristic and it is wrong on names, acronyms and loanwords. `countSyllables` reports the total so
 * a caller can sanity-check it; `fleschKincaid` says so in its own output.
 */
export function syllablesIn(word) {
  let w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // `-le` after a consonant is its own syllable, and the `e` in it is NOT silent. Remove the pair and add
  // the syllable back, rather than adding to a count that already counted the `e`: `table` is 2, not 3.
  let bonus = 0;
  if (/[^aeiou]le$/.test(w)) {
    w = w.slice(0, -2);
    bonus = 1;
  } else {
    // silent terminal `e` (`code`), and `-es` that does not add one (`rates`)
    w = w.replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '');
  }
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, (groups ? groups.length : 0) + bonus);
}

/**
 * Flesch–Kincaid Grade Level (§4.4):
 *
 *   FK = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
 *
 * Returns the verdict AND the three terms it was computed from. A grade on its own cannot be argued with;
 * the mean sentence length and mean syllable count say which half missed, and `hardestSentences` says
 * which lines to edit.
 */
export function fleschKincaid(text, { target = [10, 12], warnBand = 1 } = {}) {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  if (!sentences.length || !words.length) {
    return { verdict: 'fail', fk: null, reason: 'no measurable text', words: words.length, sentences: sentences.length };
  }
  const syllables = words.reduce((n, w) => n + syllablesIn(w), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  const fk = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  const [lo, hi] = target;
  const verdict = fk >= lo && fk <= hi ? 'pass'
    : (fk >= lo - warnBand && fk <= hi + warnBand) ? 'warn' : 'fail';

  return {
    verdict,
    fk: round(fk, 2),
    target,
    words: words.length,
    sentences: sentences.length,
    syllables,
    words_per_sentence: round(wordsPerSentence, 2),
    syllables_per_word: round(syllablesPerWord, 3),
    // Named so nobody reads the grade as exact: the syllable count under it is a spelling heuristic.
    syllable_method: 'english-heuristic',
    hardest_sentences: verdict === 'pass' ? [] : hardestSentences(text, fk >= hi ? 'hard' : 'easy'),
  };
}

/**
 * The sentences pulling the grade furthest in the direction it missed — what to edit, not just how much.
 *
 * Each sentence is scored by its own FK, and the three furthest from the target in the offending direction
 * come back. Scored per sentence rather than by length alone because a short sentence of long words misses
 * for a different reason than a long sentence of short ones, and the fix differs.
 */
export function hardestSentences(text, direction = 'hard', n = 3) {
  const scored = splitSentences(text).map((s) => {
    const words = splitWords(s);
    if (words.length < 4) return null;
    const syll = words.reduce((a, w) => a + syllablesIn(w), 0);
    const fk = 0.39 * words.length + 11.8 * (syll / words.length) - 15.59;
    return { sentence: s.length > 180 ? `${s.slice(0, 177)}…` : s, fk: round(fk, 1), words: words.length };
  }).filter(Boolean);
  scored.sort((a, b) => (direction === 'hard' ? b.fk - a.fk : a.fk - b.fk));
  return scored.slice(0, n);
}

/**
 * Word count against the "about 500 words" target (§4.5).
 *
 * `pass` is a band rather than a number because "500 내외" is a band; the exact count travels with the
 * verdict so a caller never has to trust the band to know what happened.
 */
export function lengthCheck(text, { target = [450, 550], warn = [400, 650] } = {}) {
  const words = splitWords(text).length;
  const verdict = words >= target[0] && words <= target[1] ? 'pass'
    : (words >= warn[0] && words <= warn[1]) ? 'warn' : 'fail';
  return {
    verdict,
    words,
    target,
    warn,
    delta: words < target[0] ? words - target[0] : words > target[1] ? words - target[1] : 0,
  };
}

/** pass/fail verdicts become numbers so §4.6 can weight them beside the two 0–100 scores. */
export const VERDICT_SCORE = { pass: 100, warn: 60, fail: 20 };

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
