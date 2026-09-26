/**
 * What this agent says to one message — the part that does not depend on how it is served.
 *
 * Kept free of the SDK and express so it runs in two places: behind src/server.mjs (the standalone A2A server)
 * and inside an Ainize hosted-agent container (hosted/index.mjs), where the node's runtime owns the protocol.
 */
import { evaluate, renderText } from './evaluate.mjs';
import { a2uiParts } from './a2ui.mjs';

/**
 * Is this an article, or is it chat?
 *
 * In full-delivery mode the agent sees every message in a channel and most are not articles. Scoring
 * "morning!" would produce a confident 20/100 and advice to add a lead, which is noise. A URL counts
 * however short it is; anything else has to look like prose.
 */
export const isSubmission = (text) => /^https?:\/\/\S+$/i.test(text) || text.split(/\s+/).length >= 40;

/**
 * The reply for one submission: the text answer, and the A2UI surface that renders it.
 *
 * Returns `{ text, parts }` rather than a string because a scored result has two representations and both
 * are sent. `parts` is empty for silence and for the refusals, which have nothing structured to draw.
 */
export async function replyFor(input, o) {
  if (!input || !isSubmission(input)) return { text: '', parts: [] };
  if (input.length > o.maxArticleChars) {
    return { text: `That is ${input.length} characters; this agent reads up to ${o.maxArticleChars}.`, parts: [] };
  }
  const result = await evaluate(input, o);
  return {
    text: `${renderText(result)}\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
    parts: result.status === 'ok' ? a2uiParts(result) : [],
    result,
  };
}
