/**
 * Readability and length (§4.4, §4.5).
 *
 * The property that matters is that the sentence split survives news copy. Money, initials and courtesy
 * titles all end in a period, and every false split shortens the mean sentence length — which lowers the
 * FK grade, which is the number the whole test reports. So the splitter gets the hard cases and the grade
 * gets checked against a hand-computed value rather than against itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VERDICT_SCORE, fleschKincaid, hardestSentences, lengthCheck, splitSentences, splitWords, syllablesIn,
} from '../src/text.mjs';

test('splitSentences: a period inside money, an initial or a courtesy title does not end a sentence', () => {
  assert.deepEqual(splitSentences('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
  assert.equal(splitSentences('Revenue rose to $4.2 billion last quarter.').length, 1);
  assert.equal(splitSentences('Mr. Lee said the plant would close.').length, 1);
  assert.equal(splitSentences('The vote was held in Washington, D.C. on Tuesday.').length, 1);
  assert.equal(splitSentences('J. R. R. Tolkien wrote it.').length, 1);
  assert.equal(splitSentences('Sales fell 3.5% in July. Analysts expected worse.').length, 2);
  // a quote closing after the stop belongs to the sentence it ends
  assert.deepEqual(splitSentences('"We will appeal." The company said so.'),
    ['"We will appeal."', 'The company said so.']);
  assert.deepEqual(splitSentences('   '), []);
});

test('splitWords: punctuation-only tokens are not words, hyphens and digits are', () => {
  assert.deepEqual(splitWords('the 42 state-owned firms — all of them'),
    ['the', '42', 'state-owned', 'firms', 'all', 'of', 'them']);
  assert.deepEqual(splitWords('  '), []);
  assert.equal(splitWords('$4.2bn').length, 1);
});

test('syllablesIn: the three corrections that matter at news vocabulary', () => {
  for (const [w, n] of [['code', 1], ['table', 2], ['rates', 1], ['the', 1], ['a', 1],
    ['semiconductor', 5], ['export', 2], ['government', 3], ['people', 2]]) {
    assert.equal(syllablesIn(w), n, `${w} should be ${n}, got ${syllablesIn(w)}`);
  }
  assert.equal(syllablesIn(''), 0);
  assert.equal(syllablesIn('!!!'), 0);
  assert.ok(syllablesIn('Tolkien') >= 1, 'a name still counts at least one');
});

test('fleschKincaid: the grade matches the formula computed by hand, and the terms travel with it', () => {
  const text = 'The cat sat on the mat. The dog ran to the park.';
  const r = fleschKincaid(text);
  assert.equal(r.sentences, 2);
  assert.equal(r.words, 12);
  const expected = 0.39 * (r.words / r.sentences) + 11.8 * (r.syllables / r.words) - 15.59;
  assert.equal(r.fk, Math.round(expected * 100) / 100);
  assert.equal(r.verdict, 'fail', 'six-word sentences of one-syllable words are not grade 10-12');
  assert.equal(r.syllable_method, 'english-heuristic', 'the grade says what its syllable count is worth');
});

test('fleschKincaid: pass, warn and fail are a band around the target, and only a miss names sentences', () => {
  // a band wide enough to admit anything — including the negative grades very short text produces
  const inBand = fleschKincaid('The cat sat.', { target: [-20, 100] });
  assert.equal(inBand.verdict, 'pass');
  assert.deepEqual(inBand.hardest_sentences, [], 'nothing to fix when it passes');

  // a miss on the hard side reports the hardest sentences; on the easy side, the easiest
  const hard = fleschKincaid(
    'The Commission subsequently promulgated supplementary administrative determinations concerning '
    + 'extraterritorial semiconductor manufacturing equipment licensing obligations.', { target: [10, 12] });
  assert.equal(hard.verdict, 'fail');
  assert.ok(hard.fk > 12);
  assert.ok(hard.hardest_sentences.length >= 1);

  const easy = fleschKincaid('I go. You go. We go. They go.', { target: [10, 12] });
  assert.equal(easy.verdict, 'fail');
  assert.ok(easy.fk < 10);
});

test('fleschKincaid: empty input fails with a reason instead of dividing by zero', () => {
  const r = fleschKincaid('   ');
  assert.equal(r.verdict, 'fail');
  assert.equal(r.fk, null);
  assert.match(r.reason, /no measurable text/);
});

test('hardestSentences: ranks by each sentence own grade, not by length alone', () => {
  const text = 'A short sentence of plain words that anyone could read without any trouble at all here. '
    + 'Extraterritorial administrative determinations necessitate supplementary jurisdictional considerations.';
  const [worst] = hardestSentences(text, 'hard', 2);
  assert.match(worst.sentence, /Extraterritorial/,
    'the shorter sentence of long words is harder than the longer sentence of short ones');
});

test('lengthCheck: the band is the verdict and the exact count always travels with it', () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
  assert.equal(lengthCheck(words(500)).verdict, 'pass');
  assert.equal(lengthCheck(words(450)).verdict, 'pass', 'the boundary is inclusive');
  assert.equal(lengthCheck(words(550)).verdict, 'pass');
  assert.equal(lengthCheck(words(420)).verdict, 'warn');
  assert.equal(lengthCheck(words(600)).verdict, 'warn');
  assert.equal(lengthCheck(words(200)).verdict, 'fail');
  assert.equal(lengthCheck(words(900)).verdict, 'fail');

  const short = lengthCheck(words(300));
  assert.equal(short.words, 300);
  assert.equal(short.delta, -150, 'how far outside the band, signed');
  assert.equal(lengthCheck(words(700)).delta, 150);
  assert.equal(lengthCheck(words(500)).delta, 0);
});

test('VERDICT_SCORE: pass/fail becomes a number so §4.6 can weight it beside the 0-100 scores', () => {
  assert.deepEqual(VERDICT_SCORE, { pass: 100, warn: 60, fail: 20 });
});
