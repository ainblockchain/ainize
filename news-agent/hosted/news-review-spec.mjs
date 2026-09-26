/**
 * The hosted-agent spec for news-review: what `POST /api/hosted-agents` on an Ainize node takes.
 *
 * `files` is every module the handler imports, collected by following relative imports from hosted/index.mjs —
 * so a new module under src/ is packaged without anyone remembering to list it, and the SDK-bound server.mjs,
 * which the handler never imports, is left out.
 *
 *   node hosted/news-review-spec.mjs            # print the spec as JSON
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** Relative imports of one module, as written (`./x.mjs`, `../src/y.mjs`). */
export const relativeImportsOf = (source) => [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm)].map((m) => m[1]);

/**
 * The file map, keyed by path inside the agent image. The handler lives at hosted/index.mjs in this repo and at
 * the image root there, so its `../src/` imports are rewritten to `./src/`; every other module keeps its path
 * relative to the news-agent directory, which is also its path in the image.
 */
export function newsReviewFiles() {
  const files = { 'index.mjs': readFileSync(join(HERE, 'index.mjs'), 'utf8').replace(/(['"])\.\.\/src\//g, '$1./src/') };
  const queue = relativeImportsOf(readFileSync(join(HERE, 'index.mjs'), 'utf8')).map((p) => relative(ROOT, join(HERE, p)));
  while (queue.length) {
    const key = normalize(queue.shift());
    if (files[key]) continue;
    const source = readFileSync(join(ROOT, key), 'utf8');
    files[key] = source;
    for (const next of relativeImportsOf(source)) queue.push(relative(ROOT, join(ROOT, dirname(key), next)));
  }
  return files;
}

export function newsReviewSpec({ model = 'Qwen3.8-Flash-Next' } = {}) {
  return {
    id: 'news-review',
    name: '동아사이언스 기사 리뷰',
    description: 'Scores whether an article works as news: headline and lead against other newsrooms covering the same story, plus Flesch-Kincaid grade and word count. Send the article text, or a URL to it.',
    model,
    mode: 'handler',
    systemPrompt: '',
    a2ui: true,
    // The corpus is whatever newsroom covered the story, which cannot be listed in advance. The node still
    // refuses every private, loopback and metadata address whatever this says.
    allowedHosts: ['*'],
    secretNames: [],
    skills: [{
      id: 'news-fitness',
      name: 'News fitness check',
      description: 'Four scores: headline, lead, readability (FK 10-12), length (about 500 words).',
      examples: ['Paste an article and ask how it reads as news', 'https://example.com/article'],
    }],
    files: newsReviewFiles(),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(newsReviewSpec(), null, 2));
}
