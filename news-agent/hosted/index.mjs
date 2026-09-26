/**
 * news-review as an Ainize hosted agent (handler mode).
 *
 * The node's runtime owns the protocol (card, JSON-RPC, v1.0 + v0.3); this file only answers a message. The
 * model is the agent's own, reached through `ctx.llm.baseUrl` — the node pins it to the spec's model — and the
 * reference corpus (Google News, then each publisher's page) is fetched through the node's egress door, which is
 * what the global `fetch` is inside the container.
 *
 * Packaged by hosted/news-review-spec.mjs: this file becomes `index.mjs` at the image root (its `../src/` imports rewritten to `./src/`) with src/ beside it.
 */
import { replyFor } from '../src/reply.mjs';

export const NEWS_REVIEW_MAX_ARTICLE_CHARS = 20_000;

export default {
  async execute(input, ctx) {
    const reply = await replyFor(input, {
      maxArticleChars: NEWS_REVIEW_MAX_ARTICLE_CHARS,
      endpoint: `${ctx.llm.baseUrl}/chat/completions`,
      model: ctx.llm.model,
    });
    // Silence (not an article) is an empty text part, as before: the channel it sits in sees every message.
    return { text: reply.text, parts: reply.parts };
  },
};
