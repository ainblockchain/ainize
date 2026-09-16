# 뉴스 적합도 평가 Agent — 요구사항

작성 2026-09-15 · 갱신 2026-09-16 · 상태: **요구사항 전부 확정**, 레퍼런스 파이프라인 검증 완료, agent 미구현

기사 하나를 받아 **뉴스로서 적합한지**를 네 가지 축으로 채점하는 A2A agent를 만든다. `ainize-node`에서 운영하고,
A2A URL을 발급받아 `ainize.ai`에 로그인하면 보이게 하며, 같은 화면에서 live test까지 되게 한다.

**확정된 선택**

| 항목 | 결정 |
|---|---|
| 레퍼런스 코퍼스 | **Google News RSS** (무료) — 원문 URL까지 해소해 본문을 가져온다 |
| 채점 주체 | **LLM — 노드의 `Qwen3.8-Flash-Next`**. ①② 판단, ③④는 계산 |
| 언어 | **영문 전용** (1차) |
| 입력 | 기사 URL 또는 평문. URL이면 원문을 fetch해 제목·본문을 추출한다 |
| 레퍼런스 최소 건수 | **1건** — 주제가 실제로 일치하기만 하면 충분하다 |

---

## 1. 전체 그림

```
기사(제목+본문)
   │
   ├─ 주제 키워드 추출 (LLM)
   │        │
   │        ▼
   │   Google News RSS 검색 ──▶ 기사 N건
   │                              │  ① Google 리다이렉트 해소 → 게시자 URL
   │                              │  ② 원문 fetch → 제목 · 첫 문장 추출
   │                              ▼
   │                        레퍼런스 코퍼스 (제목 N개 + 리드 N개)
   ▼                              │
[채점]  ◀──────────────────────────┘
   ├── ① 타이틀 적합도    LLM 비교 판단      0–100
   ├── ② 첫 문장 적합도   LLM 비교 판단      0–100
   ├── ③ 가독성          FK 계산            10–12 pass
   └── ④ 분량            단어수 계산         500 내외 pass
   │
   ▼
A2A message/send 응답
```

---

## 2. A2A 규격

정본은 **https://a2a-protocol.org/latest/** (Protocol Specification · Definitions).
AIN Teams 연동 요건은 https://ainteams.ainetwork.ai/docs/ko/a2a.

필요한 것은 **두 가지뿐**이다: agent card 하나와 `message/send` 하나.

### 2.1 Agent card

`GET /.well-known/agent-card.json` (폴백 `agent.json`) · 인증 헤더 없음 · `Accept: application/json`

```json
{ "name": "News Fitness", "url": "https://<a2a-url>", "protocolVersion": "0.3.0" }
```

`name` 없으면 초기화 실패. `url` 생략 시 base URL.

### 2.2 `message/send` — JSON-RPC 2.0 over HTTP POST

```json
{ "jsonrpc":"2.0", "id":"<uuid>", "method":"message/send",
  "params":{ "message":{ "kind":"message","messageId":"<uuid>","role":"user",
              "parts":[{"kind":"text","text":"<기사>"}], "contextId":"<세션 id|없음>" },
             "configuration":{ "blocking":true, "acceptedOutputModes":["text/plain"] } } }
```

응답은 `result.kind="message"`, `role="agent"`, `parts[]`, `contextId`, `id`는 요청 id 그대로.

**주의 두 가지**

1. **인증 헤더가 오지 않는다.** 공개 엔드포인트만 지원 → 남용 방지는 rate limit으로 직접.
2. **침묵 응답**: `parts`를 비우면 "들었지만 답하지 않음". 전체 수신 모드 스팸 방지 장치이므로 반드시 구현.

---

## 3. 레퍼런스 코퍼스 — 검증 완료

프로토타입: `news-agent/prototype/reference-corpus.mjs` · 2026-09-15 **4/4 성공**

### 3.1 검색

```
https://news.google.com/rss/search?q=<키워드>+when:7d&hl=en-US&gl=US&ceid=US:en
```

실측: 키워드만 → **100건**, `when:7d` 추가 → **64건**. 최신순 정렬이 아니므로 `pubDate`로 직접 정렬한다.

### 3.2 RSS가 주지 않는 것 세 가지 — 각각 한 단계씩 비용이 든다

| # | 문제 | 해법 |
|---|---|---|
| 1 | `<description>`에 **리드가 없다** — 같은 Google 링크의 앵커만 들어 있다 | 원문을 직접 fetch해야 한다 |
| 2 | `<link>`가 **서버에서 해소되지 않는다** — 따라가도 news.google.com에 머물고, id는 protobuf라 base64 디코딩으로도 URL이 안 나온다 | 기사 페이지의 `data-n-a-sg` / `data-n-a-ts`를 읽어 `POST /_/DotsSplashUi/data/batchexecute` 호출 → 게시자 URL |
| 3 | `<title>`에 **" - 매체명" 접미사**가 붙는다 | 채점 전 제거 |

### 3.3 리드 추출 — 3단 폴백

| 순위 | 방법 | 실측 |
|---|---|---|
| 1 | JSON-LD `articleBody` | 뉴스 사이트 표준 |
| 2 | `og:description` / `meta[name=description]` | 4건 중 3건이 여기서 해결 |
| 3 | `<article>` 안의 첫 15단어 이상 `<p>` (nav·header·footer 제거) | 1건 |

첫 문장은 `^.*?[.!?](?=\s|$)`로 자른다.

### 3.4 코퍼스 요건 — 건수가 아니라 주제 일치

**기준은 개수가 아니다. 주제가 같은 기사 1건이면 채점할 수 있다.**

- 목표 **3–5건**, 최소 **1건**. 각 항목에 제목·리드·게시자 URL·발행일·매체를 기록한다 (재현성)
- **주제 일치를 LLM이 확인한다.** 검색 결과는 키워드만 겹치고 주제가 다른 기사를 흔히 포함한다.
  일치하지 않는 건은 버린다 — 엉뚱한 기사와 비교한 점수가 적은 표본보다 나쁘다
- **일치하는 레퍼런스가 0건이면** ①②를 채점하지 않고 `insufficient_reference`로 응답한다
- fetch 실패·차단·유료벽은 정상 경로다. 상위 10건을 검색해 성공분에서 3–5건을 고른다
- 동일 URL·동일 매체 중복 제거
- 캐시: 같은 키워드 조합은 TTL 1시간

### 3.5 뉴스성 게이트 — RSS 건수

Google 웹 검색(`google.com/search`, `&tbm=nws` 포함)은 **`enablejs`로 막혀 있어 스크래핑이 불가능하다**(2026-09-15 확인).
Google News RSS가 사실상 그 news section이고, **결과 건수가 그대로 뉴스성 신호**가 된다.

| 질의 | 결과 | 해석 |
|---|---|---|
| `semiconductor export controls when:7d` | 64건 | 뉴스 주제 |
| `how to boil an egg` | 1건 | 뉴스 주제 아님 |
| `qwertyuiop asdfgh zxcvb` | 0건 | 주제 없음 |

0건이면 `not_a_news_topic`으로 응답한다 — 기사 자체가 뉴스가 아니라는 유의미한 결과다.

---

## 4. 채점

### 4.1 ① 타이틀 적합도 (0–100) — LLM

주제가 일치하는 레퍼런스 제목을 함께 제시하고 **비교 판단**을 시킨다. 절대 기준이 아니다.

LLM에게 채점시킬 항목:

| 항목 | 무엇을 보는가 |
|---|---|
| 구체성 | 고유명사·숫자·장소가 있는가 |
| 능동성 | 능동태 동사가 주어와 붙어 있는가 |
| 길이 | 레퍼런스 중앙값 대비 (영문 헤드라인 8–12 단어가 통상) |
| 낚시성 | 호기심 갭 표현 — **감점** |
| 시의성 | 사건 시점이 드러나는가 |

**출력:** 점수 + 항목별 내역 + "레퍼런스 N개 중 몇 번째" + 개선 제안 1–2개

### 4.2 ② 첫 문장(리드) 적합도 (0–100) — LLM

| 항목 | 무엇을 보는가 |
|---|---|
| 5W1H 충족 | 누가·무엇을·언제·어디서를 몇 개 담았는가 |
| 독립성 | 제목을 안 읽어도 이해되는가 |
| 길이 | 25–35 단어 권장, 레퍼런스 중앙값과 비교 |
| 역피라미드 | 가장 중요한 사실이 앞에 오는가 |
| 선행 종속절 | 리드를 늦추는 도입절 — **감점** |

### 4.3 LLM 채점 규약

- **점수와 근거를 함께** 내게 한다. 근거 없는 숫자는 재현이 안 된다
- `temperature: 0`
- 출력은 **구조화 JSON**으로 강제하고, 파싱 실패 시 1회 재시도 후 `scoring_failed`
- 프롬프트·모델 id·레퍼런스 목록을 응답에 함께 기록한다 (감사 가능성)
- 모델: **노드의 `Qwen3.8-Flash-Next`** — 외부 API 비용·지연 없이 노드 안에서 끝난다

### 4.4 ③ 가독성 — Flesch–Kincaid Grade Level

```
FK = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
```

| 판정 | 조건 |
|---|---|
| **pass** | 10.0 ≤ FK ≤ 12.0 |
| warn | 9.0–10.0 또는 12.0–13.0 |
| fail | 그 밖 |

FK 값·평균 문장 길이·평균 음절수를 함께 반환한다. 범위를 벗어나면 **기여도가 큰 문장 3개**를 지목한다.
음절 계산은 영어 휴리스틱이라 오차가 있다 — 표준 구현과 교차 검증할 것.

### 4.5 ④ 분량 — 500 단어 내외

| 판정 | 조건 |
|---|---|
| **pass** | 450 ≤ words ≤ 550 |
| warn | 400–450 또는 550–650 |
| fail | 그 밖 |

단어 수 규칙 고정: 공백 분리, 제목 제외, 사진 설명·바이라인 제외.

### 4.6 종합 점수

```
overall = 0.35 × title + 0.35 × lead + 0.15 × readability + 0.15 × length
```

③④는 pass/fail이므로 점수로 환산한다: **pass 100 · warn 60 · fail 20**.
①②가 `insufficient_reference`면 종합 점수를 내지 않고 ③④만 반환한다.
레퍼런스가 1–2건일 때는 점수와 함께 **`reference_count`를 명시**한다 — 표본이 작다는 사실을 숨기지 않는다.

### 4.7 응답 형식

`acceptedOutputModes`가 `text/plain`이므로 사람이 읽는 텍스트를 기본으로, 기계 파싱용 JSON을 함께 담는다.

```
News fitness — 71/100

  ① Title        68   (레퍼런스 4개 중 3번째)
  ② Lead         74   (2번째)
  ③ Readability  FK 13.4  ✗ fail   target 10.0–12.0
  ④ Length       612 words ✗ fail  target 450–550

Biggest win: three sentences carry the readability miss — …
```

```json
{ "overall": 71, "title": {...}, "lead": {...}, "readability": {...}, "length": {...},
  "references": [{ "title":"...", "lead":"...", "url":"...", "published":"...", "outlet":"..." }],
  "model": "...", "reference_count": 4 }
```

---

## 5. ainize-node 운영 + A2A URL 발급

| 항목 | 요구사항 |
|---|---|
| 실행 위치 | `ainize-node` 안, 또는 노드가 프록시하는 사이드카 |
| 공개 경로 | `/.well-known/agent-card.json`, `POST /` (카드의 `url`이 가리키는 경로) |
| **URL 형태** | **agent별 발급** — 노드 하나가 agent 여러 개를 운영할 수 있어야 한다 |
| 공개성 | 인증 헤더가 오지 않으므로 공개 엔드포인트 |
| 남용 방지 | IP·contextId 단위 rate limit · 본문 길이 상한 (권장 20,000자) |
| 타임아웃 | 레퍼런스 수집이 네트워크 다회 호출이다. 전체 예산 **60초**, 초과 시 부분 결과 반환 |
| 관측 | 요청/응답·사용한 레퍼런스·소요 시간·LLM 토큰을 노드 이벤트 로그에 기록 |

**자가 검증**

```bash
curl -s https://<a2a-url>/.well-known/agent-card.json

curl -s -X POST https://<a2a-url> -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"t1","method":"message/send","params":{"message":{"kind":"message",
       "messageId":"m1","role":"user","parts":[{"kind":"text","text":"<기사>"}]},
       "configuration":{"blocking":true,"acceptedOutputModes":["text/plain"]}}}'
```

---

## 6. ainize.ai 노출 + live test

### 6.1 로그인 시 목록

| 항목 | 요구사항 |
|---|---|
| 조건 | 로그인 사용자에게 **자기 노드가 운영 중인 agent 목록**이 보인다 |
| 표시 | agent 이름, A2A URL(복사 버튼), 상태, 최근 호출 수, 카드 원문 링크 |
| **위치** | **신규 `/agents`** — 지식(patch)과 agent는 다른 대상이라 기존 화면에 얹지 않는다 |
| 비로그인 | 비공개. 단 A2A URL 자체는 공개이므로 URL을 아는 사람은 호출 가능 — UI에 명시 |

### 6.2 live test

| 항목 | 요구사항 |
|---|---|
| 입력 | 기사 붙여넣기 textarea · 샘플 기사 3건 프리셋 |
| 실행 | 화면에서 A2A `message/send` 호출 |
| 표시 | 네 축 점수 · **레퍼런스 기사 목록(제목·매체·링크)** · FK·단어수 실측값 |
| A2A URL | 화면에 함께 노출, 복사 가능 |
| 진행 표시 | 수십 초 걸리므로 "레퍼런스 수집 중 3/5" 같은 단계 표시가 필요 |
| 실패 처리 | 무응답 · 타임아웃 · `insufficient_reference` · `scoring_failed`를 구분 |
| 침묵 | 빈 `parts`를 "무응답"이 아니라 "침묵"으로 구분 |

---

## 7. 남은 결정

전부 확정됐다.

| # | 항목 | 결정 |
|---|---|---|
| 1 | LLM 모델 | **노드의 `Qwen3.8-Flash-Next`** |
| 2 | 언어 범위 | **영문 전용** (1차) |
| 3 | 입력 처리 | **URL 또는 평문.** URL이면 §3.3의 추출기로 제목·본문을 뽑는다 (레퍼런스와 같은 코드) |
| 4 | `batchexecute` 의존 | **열화 모드를 넣는다** — 아래 |

### 7.1 열화 모드 (4번 결정)

`batchexecute`는 문서화되지 않은 경로이고 예고 없이 깨질 수 있다. 깨졌을 때 agent 전체가 죽으면 안 된다.

| 단계 | 가능한 것 | 불가능한 것 |
|---|---|---|
| 정상 | ① 제목 · ② 리드 · ③ · ④ | — |
| **URL 해소 실패** | ① 제목 (RSS `<title>`만으로 충분) · ③ · ④ | ② 리드 |
| RSS 자체 실패 | ③ · ④ | ① ② |

②를 건너뛸 때는 **응답에 `lead: {status: "skipped", reason: "…"}`으로 명시**하고 종합 점수를 ①③④로 재배분한다.
조용히 0점을 주거나 빼먹지 않는다 — 점수가 낮은 것과 채점하지 못한 것은 다른 사실이다.

이 설계의 이점: **① 제목 채점은 URL 해소가 전혀 필요 없다.** RSS `<title>`에서 " - 매체명"만 떼면 바로 쓸 수 있으므로,
비공식 경로가 깨져도 네 축 중 셋이 살아남는다.

---

## 8. 작업 순서

| # | 작업 | 산출물 | 의존 |
|---|---|---|---|
| 1 | **③④ 채점 코어** — FK·단어수 | 단위테스트 포함 모듈 | 없음 · **즉시 착수 가능** |
| 2 | 레퍼런스 수집기 정식화 | 프로토타입 → 캐시·재시도·동시성 포함 모듈 | 검증 완료 |
| 3 | ①② LLM 채점 + 주제 일치 확인 | 프롬프트 + 구조화 출력 파서 | 없음 · 모델 확정됨 |
| 4 | A2A 서버 (카드 + `message/send` + 침묵) | `curl` 자가검증 통과 | 1–3 |
| 5 | `ainize-node` 통합 · URL 발급 | 공개 URL | 4 |
| 6 | `/agents` 목록 | 로그인 후 확인 | 5 |
| 7 | live test 화면 | 화면에서 실행 | 5 |
| 8 | AIN Teams 워크스페이스 초대 · 실사용 검증 | 대화에서 동작 | 5 |

**막힌 것이 없다.** 1번은 외부 의존성이 전혀 없고, 2번은 동작이 확인됐고, 3번의 모델도 확정됐다.
1번부터 순서대로 진행한다.

---

## 참고

- A2A 정본 — https://a2a-protocol.org/latest/
- AIN Teams 연동 — https://ainteams.ainetwork.ai/docs/ko · A2A 상세 §2.2 자가검증, §12 예제 `coffee-bot.mjs` (의존성 없는 Node 서버 하나 — 구현 출발점)
- 레퍼런스 파이프라인 프로토타입 — `news-agent/prototype/reference-corpus.mjs`
