# news-fitness

An A2A agent that scores whether an article works **as news**. Four axes, two of them judged against what
other newsrooms published on the same story and two of them computed.

Implements `../NEWS-AGENT-REQUIREMENTS.md`. Zero runtime dependencies — Node ≥ 24 and nothing else.

```
① Title         85   (rank 2/6)
② Lead          95   (rank 1/6)
③ Readability  FK 14.05  ✗ fail   target 10–12
④ Length       265 words  ✗ fail  target 450–550
```

## What it does

1. Reads the submission — pasted text (headline on the first line) or a URL it fetches itself.
2. Asks the model for a search query, then pulls **Google News RSS**, resolves each result to the
   publisher's real URL, and reads the title and lead off the page.
3. Drops the results that share keywords but not the story, so the comparison is against coverage of the
   same event.
4. Scores the headline and the lead against that set, and computes Flesch–Kincaid grade and word count.

## What it refuses to guess

The four axes fail independently and say which happened, because "scored badly" and "could not be measured"
call for different actions from a writer:

| Outcome | Meaning |
|---|---|
| `not_a_news_topic` | the news index has no coverage of this at all — a finding about the article |
| `insufficient_reference` | articles exist, none could be read |
| `skipped` | that axis had nothing to compare against; it is left out of the overall, not scored zero |
| `scoring_failed` | the model answered twice and never usably |

③ and ④ need no network and no model, so they are reported even when everything else fails.

## Run it

```sh
node src/server.mjs                 # A2A on :4010
npm test                            # 37 tests, no network
```

```sh
curl -s localhost:4010/.well-known/agent-card.json

curl -s -X POST localhost:4010 -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":"t1","method":"message/send",
  "params":{"message":{"kind":"message","messageId":"m1","role":"user",
            "parts":[{"kind":"text","text":"<your article>"}]},
            "configuration":{"blocking":true,"acceptedOutputModes":["text/plain"]}}}'
```

| Variable | Default |
|---|---|
| `PORT` | `4010` |
| `AGENT_URL` | unset — the card omits `url`, so the base URL is used |
| `NEWS_AGENT_MODEL_URL` | `http://localhost:8000/v1/chat/completions` |
| `NEWS_AGENT_MODEL` | `Qwen3.8-Flash-Next` |

The model is an OpenAI-compatible endpoint; by default the node's own, so no key leaves the machine.

## Behind ainize-node

Declare it in the node's `config.json` and restart:

```json
"agents": [
  { "id": "news-fitness", "name": "News Fitness", "upstream": "http://127.0.0.1:4010" }
]
```

The node serves `/agents/news-fitness` publicly, rewrites the card's `url` to that address (upstream says
`localhost`, which is useless to a caller), adds a per-IP rate limit, and lists the agent at **`/agents`**
in the web UI with a live test. Give a workspace the node's URL, not this process's.

## Layout

| File | |
|---|---|
| `src/text.mjs` | FK grade and word count — arithmetic, no network |
| `src/reference.mjs` | RSS → publisher URL → title + lead |
| `src/score.mjs` | the judged axes, the topical filter, the weighting |
| `src/evaluate.mjs` | the whole turn, and what to do when a piece is missing |
| `src/server.mjs` | the A2A surface |

## Two things that will bite

**The Google redirect is undocumented.** RSS `<link>` does not resolve server-side and does not decode; it
goes through the `batchexecute` call the article page itself makes. If that shape changes, URL resolution
stops — the headline axis keeps working (it needs only the feed) and the lead axis is skipped and says so.

**The syllable count is a spelling heuristic.** Flesch–Kincaid is only as exact as it, and it is wrong on
names and acronyms. The grade travels with `syllable_method`, the sentence count and the word count so the
number can be checked rather than believed.
