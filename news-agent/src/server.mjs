/**
 * The A2A surface, on the official SDK (`@a2a-js/sdk` v1.1, protocol v1.0.0).
 *
 * Written against the SDK rather than by hand so that conformance is the SDK's problem: request shapes,
 * task storage, event ordering and the JSON-RPC envelope all come from the reference implementation. What
 * is left here is the part only this agent can supply — turning an article into four scores.
 *
 * ## Two protocol versions at once
 *
 * The SDK speaks v1.0. AIN Teams initialises against **v0.3** (`protocolVersion: "0.3.0"`, `message/send`),
 * so the v0.3 compatibility layer is switched on and the card declares BOTH interfaces. A v0.3 client and a
 * v1.0 client reach the same executor over the same URL and neither has to know about the other, which is
 * what lets the workspace upgrade without a flag day.
 *
 * ## Why this publishes a message and not a task
 *
 * A2A has two result kinds. A task is the right shape for work a caller comes back to; a message is the
 * right shape for an answer that arrives in the same turn. Scoring takes seconds, AIN Teams sends
 * `blocking: true`, and a workspace renders a message — so one `message` event is published and nothing
 * else. The ordering rule the SDK enforces (the first event must be `task` or `message`) is then satisfied
 * by construction.
 *
 * ## Silence
 *
 * A message whose text part is empty means "heard, not replying". It is what keeps the agent quiet in a
 * channel where it sees every message, and it is a deliberate answer rather than a failure — so chat gets
 * it, and only something article-shaped is scored.
 */

import { randomUUID } from 'node:crypto';
import express from 'express';
import { AgentEvent, DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
import { UserBuilder, agentCardHandler, jsonRpcHandler } from '@a2a-js/sdk/server/express';
import { evaluate, renderText } from './evaluate.mjs';
import { a2uiExtension, a2uiParts } from './a2ui.mjs';

export const SERVER_DEFAULTS = {
  port: Number(process.env.PORT ?? 4010),
  host: process.env.HOST ?? '0.0.0.0',
  name: process.env.AGENT_NAME ?? 'News Fitness',
  /** The address callers should use. Behind ainize-node this is the node's `/agents/<id>` URL. */
  publicUrl: process.env.AGENT_URL ?? null,
  maxBodyBytes: 200_000,
  maxArticleChars: 20_000,
  rateLimit: { windowMs: 60_000, perIp: 6 },
};

/** v1.0 Role enum: 0 unspecified, 1 user, 2 agent. */
const ROLE_AGENT = 2;

const DESCRIPTION =
  'Scores whether an article works as news: headline and lead against other newsrooms covering the same '
  + 'story, plus Flesch-Kincaid grade and word count. Send the article text, or a URL to it.';

/**
 * The v1.0 card. `supportedInterfaces` declares v1.0 AND v0.3 at the same URL — the compat layer will not
 * route legacy method names unless the legacy interface is actually advertised.
 */
export function agentCard(o) {
  const url = o.publicUrl ?? `http://localhost:${o.port}`;
  const iface = (protocolVersion) => ({ url, protocolBinding: 'JSONRPC', protocolVersion, tenant: '' });
  return {
    name: o.name,
    description: DESCRIPTION,
    version: '0.2.0',
    // Two-part, matching the SDK's own A2A_PROTOCOL_VERSION / A2A_LEGACY_PROTOCOL_VERSION constants. A
    // three-part "1.0.0" here is compared literally against the "1.0" a client asks for and is refused with
    // -32009 — the card looks right and every call fails.
    supportedInterfaces: [iface('1.0'), iface('0.3')],
    provider: undefined,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      // A2UI: the score also travels as a renderable surface (a2ui.mjs). Declared so a client knows to look
      // for the data parts; never required, because the text part always carries the same answer.
      extensions: [a2uiExtension()],
    },
    securitySchemes: {},
    securityRequirements: [],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [{
      id: 'news-fitness',
      name: 'News fitness check',
      description: 'Four scores: headline, lead, readability (FK 10-12), length (about 500 words).',
      tags: ['news', 'editing', 'readability'],
      examples: ['Paste an article and ask how it reads as news', 'https://example.com/article'],
      inputModes: ['text/plain'],
      outputModes: ['text/plain'],
    }],
  };
}

/**
 * Everything the caller sent, flattened — a client may split an article across several text parts.
 *
 * Reads BOTH part shapes. v1.0 carries `content: { $case: 'text', value }`; v0.3 carries `kind: 'text'` with
 * a sibling `text`. The executor always sees v1.0 (the compat layer converts on the way in), but the v0.3
 * branch keeps this function usable directly from tests and from a v0.3 client that reaches it unconverted.
 */
export const textOf = (message) => (message?.parts ?? [])
  .map((p) => {
    if (p?.content?.$case === 'text' && typeof p.content.value === 'string') return p.content.value;
    if ((p?.kind === 'text' || p?.type === 'text') && typeof p.text === 'string') return p.text;
    return null;
  })
  .filter((t) => t !== null)
  .join('\n').trim();

/** A v1.0 text part. The compat layer turns this into `{ kind: 'text', text }` for a v0.3 caller. */
export const textPart = (text) => ({ content: { $case: 'text', value: text } });

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

/** The only part the SDK cannot supply: what this agent does with a message. */
export class NewsFitnessExecutor {
  constructor(options) { this.o = options; }

  async execute(requestContext, eventBus) {
    const { contextId, taskId } = requestContext;
    let text = '';
    let extra = [];
    try {
      const reply = await replyFor(textOf(requestContext.userMessage), this.o);
      text = reply.text;
      extra = reply.parts;
    } catch (e) {
      // An internal failure is reported as one. Scoring zero would claim a measurement we do not have.
      text = `Could not score this article: ${e.message}`;
    }
    // Wrapped with `AgentEvent.message`, not published bare: the bus carries `{ kind, data }` and reads the
    // message out of `data`. A bare message arrives with `data` undefined and the turn ends as "finished
    // without a result" (-32603) — the executor looks correct and every call fails.
    eventBus.publish(AgentEvent.message({
      kind: 'message',
      messageId: randomUUID(),
      // v1.0 types `role` as a NUMERIC enum (0 unspecified, 1 user, 2 agent). Neither 'agent' nor the string
      // 'ROLE_AGENT' survives `roleToJSON`, which switches on the number — both serialise as UNRECOGNIZED.
      // The v0.3 compat layer renders this same value back as `role: "agent"`.
      role: ROLE_AGENT,
      // Silence is an EMPTY TEXT PART, not an empty parts array: a message with no parts is "no result" to
      // the SDK, while the AIN Teams rule is "empty or whitespace-only text parts". One shape satisfies both.
      parts: [textPart(text), ...extra],
      contextId,
      taskId,
    }));
    eventBus.finished();
  }

  /** Nothing here runs long enough to cancel: one message is published and the turn is over. */
  async cancelTask() { /* no-op */ }
}

/**
 * Per-server, not per-module: two servers in one process are two endpoints with two budgets. The map is
 * swept rather than left to grow, since the keys are attacker-controlled.
 */
function makeRateLimiter(o) {
  const seen = new Map();
  return (ip) => {
    const now = Date.now();
    const hits = (seen.get(ip) ?? []).filter((t) => now - t < o.rateLimit.windowMs);
    hits.push(now);
    seen.set(ip, hits);
    if (seen.size > 5000) {
      for (const [k, v] of seen) if (!v.some((t) => now - t < o.rateLimit.windowMs)) seen.delete(k);
    }
    return hits.length > o.rateLimit.perIp;
  };
}

export function createA2AApp(opts = {}) {
  const o = { ...SERVER_DEFAULTS, ...opts, rateLimit: { ...SERVER_DEFAULTS.rateLimit, ...(opts.rateLimit ?? {}) } };
  const card = agentCard(o);
  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), new NewsFitnessExecutor(o));

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, A2A-Version');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true, name: o.name }));

  // §2.1 — discovery. The handler serves the v1.0 card; the compat layer answers legacy-range requests with
  // a v0.3-shaped one. `agent.json` is the older spelling some clients still try first.
  //
  // Mounted with `use`, not `get`: the compat layer hands non-legacy requests on with `next('router')`,
  // which only reaches the v1.0 handler when the pair is mounted as a router. With `get` the legacy card
  // answers every request and a v1.0 client silently receives a v0.3 document.
  // A FRESH handler per path: `agentCardHandler` returns a Router, and one Router mounted at three points
  // keeps the mount state of whichever matched first — which made every request answer with the v0.3 card,
  // including the ones that asked for v1.0.
  for (const path of ['/.well-known/agent-card.json', '/.well-known/agent.json', '/agent.json']) {
    app.use(path, agentCardHandler({
      agentCardProvider: requestHandler,
      // A2A sends no authentication headers, so every caller is the same anonymous one (§2).
      userBuilder: UserBuilder.noAuthentication,
      legacyCompat: { enabled: true },
    }));
  }

  // A2A sends no authentication headers, so these are the only defences there are.
  const rateLimited = makeRateLimiter(o);
  app.use(express.json({ limit: o.maxBodyBytes }));
  app.post('/', (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({
        jsonrpc: '2.0', id: req.body?.id ?? null,
        error: { code: -32029, message: 'rate limit: try again in a minute' },
      });
    }
    next();
  }, jsonRpcHandler({
    requestHandler,
    userBuilder: UserBuilder.noAuthentication,
    legacyCompat: { enabled: true },
  }));

  return { app, options: o, card, requestHandler };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { app, options } = createA2AApp();
  app.listen(options.port, options.host, () => {
    const base = options.publicUrl ?? `http://localhost:${options.port}`;
    console.log(`${options.name} — A2A (sdk 1.1, protocol 1.0.0 + 0.3.0) on ${options.host}:${options.port}`);
    console.log(`  card   ${base}/.well-known/agent-card.json`);
    console.log(`  send   POST ${base}/   (message/send)`);
  });
}
