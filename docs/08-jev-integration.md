# 08. Jev(TypeSafe AI System One) — 온다에 어떻게 쓰나

## 1. Jev가 무엇인가 (2026-09-21 기준 확인 사실)

| 항목 | 내용 | 출처 |
|---|---|---|
| 만든 곳 | TypeSafe AI. 창업자 Diogo Almeida(전 OpenAI, InstructGPT 공저), Erik Gafni, Sasha Sheng. 2026-09-15 스텔스 해제, 시드 $40M(DCVC 리드), 기업가치 약 $200M | SiliconANGLE, Yahoo Finance, heise |
| 정체 | "System One 모델". **텍스트를 생성하지 않는다.** 상태(state) + 타입이 정해진 질문을 넣으면 **타입이 정해진 답 + 보정된 확률**을 한 번의 forward로 돌려준다(비자기회귀). 학습법은 RLCD(Reinforcement Learning for Calibrated Decisions) | heise, DataCamp, LangChain |
| 질문 3종 | **Choice**(최대 255개 옵션 중 선택, 옵션별 확률 + confidence), **Score**(2~10단계 순서 척도, 연속 점수 + 분포 + confidence), **Noul**(참일 확률 하나) | refix.ai, jev-cookbook |
| API | `POST https://api.typesafe.ai/v1/systemone`, 모델 `jev-latest`(현재 `jev-1.13`). 한 요청에 여러 질문을 같은 state에 대해 묻는다. 채팅 completions 형식이 아니라 전용 형식 | docs.typesafe.ai, LiteLLM |
| SDK | Python `typesafe-sdk`(0.7.0, `client.system_one(state=..., questions={...})`), JS `@typesafe-ai/sdk`(0.6.0, `client.systemOne(...)`), Node 20+ | PyPI, npm |
| 게이트웨이 | OpenRouter `/api/alpha/decisions` 모델 `~typesafe/jev-latest`(틸드 필수), Vercel AI Gateway `typesafe-ai/jev`, Cloudflare AI, LiteLLM pass-through | jev-cookbook, limpet |
| 가격·속도 | **$0.042 / 1M 입력 토큰, 출력 무료**(보조금 가격, 인하 예정). 실측 중앙값 180~450ms. 1,000건 판정에 2~8센트 | jev-cookbook, jev-belay, mastra-jev-moderation |
| 접근 | 직접 API는 대기열(early access). OpenRouter 경유는 키만 있으면 됨 | typesafe-jev-examples |

### 못 하는 것 (공식 문서·커뮤니티 보고)
산술·개수 세기, 날짜 비교, 다단계 간접 추론, 무관한 문맥·적대적 텍스트, 모순된 기준, **텍스트 생성**, **이미지 보기**. "환각 0"은 스키마 밖 답이 없다는 뜻이지 **틀린 옵션을 높은 확신으로 고를 수 있다**(95% 확신 1만 건이면 약 500건 오답). 설명이 없어서 감사가 어렵다. 독립 보정 테스트에서는 Choice·Score는 과신, Noul은 과소확신 경향.

### 설계 원칙 (커뮤니티 합의)
> **"Code owns the loop."** Jev는 결정만 하고, 예산·재시도·정지·실행은 코드가 소유한다. 낮은 confidence는 사람에게 보낸다. 장애 시 fail-open(사용자 경험을 막지 않음) 또는 fail-closed(안전 게이트)를 명시적으로 고른다.

## 2. 온다 제품 안에서의 Jev — "사람이 잘 이용하도록"

| 위치 | 질문 | 타입 | 코드가 하는 일 |
|---|---|---|---|
| 글·댓글 제출 | 이 글은 커뮤니티 약속을 위반해 차단해야 하는가 | Noul `block` | ≥0.85 차단(사유 안내), 0.55~0.85 게시하되 `flagged`=검토 대기, <0.55 게시 |
| 〃 | 위반 유형 | Choice `category` (ok/outing/hate/sexual_or_hookup/spam/self_harm) | 로그·검토 큐 라벨. **결정에는 쓰지 않는다** |
| 〃 | 작성자가 자해·자살 위험 신호를 보이는가 | Noul `crisis` | ≥0.6이면 글 저장 후 상담 연락처 배너 노출. 차단·진단 아님 |
| 〃 | 주제 자동 제안 | Choice `topic` | 사용자가 고른 주제와 다르고 confidence ≥0.8이면 "'가족' 주제가 더 맞을 수 있어요" 안내(강제 없음) |
| 신고 접수 | 신고 사유와 글이 일치하는가 | Noul `report_valid` | 신고 남용 계정 탐지, 검토 큐 정렬 |
| 운영자 큐 | 긴급도 | Score `urgency`(low/med/high) | 아웃팅·위기 우선 처리 |

장애 정책: 타임아웃 3초, HTTP 오류·키 없음 → **fail-open**(게시하고 `flagged` 표시 없이 로그만). 안전 게이트를 fail-closed로 하면 벤더 장애가 곧 서비스 장애가 된다. 단 `outing` 규칙 기반 탐지(전화·이메일·URL)는 Jev와 무관하게 항상 동작.

구현: `lib/jev.ts`(fetch 기반, TypeSafe 직결 또는 OpenRouter), `lib/actions.ts`에서 호출, `app/mod/page.tsx` 검토 큐.

## 3. "내가 말 안 해도 스스로 이상한 점을 찾고 고치는" 자동화 — 무엇이 진짜 가능한가

Jev 단독으로는 안 된다. Jev는 **판정기**이고, 찾기(탐색)·고치기(생성)는 Claude Code 같은 LLM 에이전트와 Playwright 같은 실행기가 한다. 실제로 돌아가는 구성은 세 층이다.

```
[탐색·실행]  Playwright가 화면을 돌아다니고, 텍스트·DOM·콘솔·네트워크·스크린샷을 수집
[판정]       Jev가 타입 질문에 답함: "다음에 어디를 눌러야 목표에 가까운가", "이 문구는 개발자 흔적인가",
             "목표에 도달했는가", "막혔는가", "이 커밋 메시지는 diff와 맞는가", "테스트 없이 done이라 했는가"
[생성·수정]  Claude Code가 리포트를 읽고 코드를 고침. 훅(Stop/PostToolUse)이 "확인 없이 끝내기"를 막음
```

### 3.1 지금 바로 쓸 수 있는 공개 도구 (검증된 숫자 포함)

| 도구 | 하는 일 | 근거 |
|---|---|---|
| **jev-belay** (Claude Code Stop 훅) | 파일이 바뀌었는데 테스트가 돈 흔적이 없으면 Jev에 4개 질문 → "검증 없는 done"이면 턴을 끝내지 않고 테스트를 돌리게 함 | 100건 라벨 AUROC 0.976, 346ms, 건당 $0.00005 |
| **limpet** (Stop 훅) | 자연어 규칙("테스트 안 돌리고 done 금지", "'시작할까요?' 묻지 말 것")을 Jev Noul로 채점, 위반 시 되돌려 보냄 | 0.7초, 파이썬 표준 라이브러리만 |
| **jevaluate** (Maykana) | Playwright 워크: Jev가 다음 클릭을 고르고(<80% 확신이면 멈추고 사람에게), 페이지마다 스크린샷을 비전 모델(DeepSeek)에 보내 시각 결함 탐지, UI 문구 판정(미번역 키, `// TODO` 노출), 첫 클릭 트리 테스트 | 숨긴 결함 3/3 발견, 1센트 미만; 60건 중 10건 오답이 모두 "불확실" 표시 |
| **taste-lint / slop-grader / Sniff Test** | UI 카피·문서의 "AI 티"·헤지·군더더기를 Jev 확률로 잡음 | Sniff Test 182ms, 오탐 1/54 |
| **jev-axi / jev-guard** (PreToolUse) | 에이전트가 실행하려는 셸 명령의 파괴성·유출 위험 채점 | 44/44 |
| **jev-commit** (pre-commit) | 커밋 메시지가 diff와 맞는지, 디버그 잔재·자격증명 여부 | — |
| **ClaudeWatch** | Playwright 스크린샷·a11y·콘솔·링크 검사 + 자동 수정(alt 텍스트 등). Jev 미사용 | — |

### 3.2 온다에 실제로 넣은 것 (이 커밋)

1. `.claude/settings.json` — **PostToolUse(Edit/Write)** 에 타입체크, **Stop 훅**에 `scripts/hooks/stop-gate.mjs`(jev-belay 축소판: 파일이 바뀌었는데 검증 흔적이 없으면 Jev 3문항 → 되돌림, 키 없으면 통과).
2. `scripts/qa/walk.mjs` — 온다 전용 QA 워크: 라우트별로 (a) 결정적 검사(콘솔 오류, 4xx/5xx, 라벨 없는 입력, 빈 링크) (b) Jev 문구 판정(개발자 흔적·미번역·영어 누출·약속 위반 카피) (c) 목표 기반 탐색("가입해서 글 하나 올리기")에서 Jev가 매 단계 클릭 대상을 고름. 결과는 `qa-report.md`.
3. `scripts/qa/fake-jev.mjs` — 키 없이 훅·워크를 시험할 가짜 Jev 서버(규칙 기반). CI와 이 샌드박스에서 사용.
4. `.mcp.json` — Claude Code에서 `jev-browser` MCP 서버 등록. 키를 넣으면 에이전트가 실제 브라우저를 Jev 결정으로 조작.

### 3.3 "진짜 자동"이 되려면 (권장 루프)

```
매일 03:00 (cron 또는 Routine)
  1. staging 배포본에 scripts/qa/walk.mjs 실행 → qa-report.md
  2. 결함이 있으면 Claude Code 세션 시작: "qa-report.md의 항목을 고치고 PR을 열어라"
  3. Stop 훅(jev-belay식)이 테스트 없는 done을 막음
  4. PR에 jev-review/Blink 식 diff 판정 → 위험도 라벨
  5. 사람은 PR만 승인
```
사람이 남는 지점: **PR 승인**, 임계치 재보정, Jev가 "불확실"로 멈춘 케이스. 이걸 없애면 오답 5%가 그대로 배포된다.

## 4. MCP로 "영상처럼 빠른 DOM 컨트롤"이 되는가

**된다. 단, 텍스트 결정에 한해서.** 구조는 모두 같다: 페이지의 상호작용 요소(최대 ~240개)를 목록으로 뽑아 state로 넣고, Jev Choice가 "어느 요소에 어떤 동작"을 고르고, Noul 두 개("목표 도달?", "막힘?")가 조기 종료를 막는다. 텍스트 입력이 필요할 때만 소형 LLM을 부른다.

| 구현 | 특징 | 숫자 |
|---|---|---|
| `@jkudish/jev-browser` (MCP·CLI·라이브러리) | Playwright 헤드리스, 8개 동작(click/search/type/select/submit/scroll/back/done), 비밀번호는 모델에 절대 안 보냄 | 위키 Coffee→Espresso 4초, $0.0016. 섀도 DOM·iframe·hover 메뉴·파일 입력 불가 |
| `browser-use/jev-ultrafast` | browser-use의 초고속 에이전트 | 에이전트 시간 25% 단축 |
| `BrowserClaw` (Chrome MCP) | 로그인된 실제 크롬 세션, DOM 85% 가지치기, 섀도 DOM·iframe 관통, 네이티브 CDP 이벤트 | — |
| `public-browser`, KofanLabs `jev-browser-chrome` | Claude Code/Cursor가 내 크롬 프로필을 조작 | 토큰 30%↓, 비용 25%↓ |
| Stagehand + Jev | 접근성 트리를 state로 | 1과제 약 $0.001 |

**이 레포에서 실제로 돌린 결과 (2026-09-21)**: `npm run browse -- "가족 주제의 이야기 목록을 연다"` 로 네 개 목표를 시험했고
모두 2회의 Jev 호출, 약 1.3초 만에 정확한 페이지(`/t/family`, `/guide`, `/mindset`, `/t/military`)에 도달했다.
이 과정에서 **우리 앱의 실제 결함 두 개**를 찾았다. (1) 주제 탭의 `title` 속성이 접근성 이름을 가로채, 보조기술과 에이전트가
"마음" 대신 "수치심, 자기수용, 불안, 외로움"으로 읽고 있었다. (2) 주제 필터가 `/?topic=` 이라 화면 제목이 항상 "온다"였다.
둘 다 고쳐서 이제 주제 탭은 제목이 있는 `/t/<주제>` 아카이브로 간다. 판정기를 붙이면 UI 결함이 드러난다는 것이 이 도구의 값이다.

**실행 전제 (이 레포에서 확인한 것)**: `.mcp.json` 에 `jev-browser` 를 등록해 두었지만 실제로 돌리려면 두 가지가 필요하다.
(1) `TYPESAFE_API_KEY` — 없으면 `jev_provider: null` 로 바로 실패한다. (2) 그 패키지가 기대하는 버전의 Playwright Chromium —
`npx playwright install chromium` 을 MCP 서버가 쓰는 환경에서 한 번 실행해야 한다. 기존에 다른 버전이 깔려 있으면
`Executable doesn't exist at .../chromium_headless_shell-XXXX` 로 실패한다. 이미 다른 빌드가 있다면
`PLAYWRIGHT_BROWSERS_PATH` 를 별도 디렉터리로 두고 기대 버전 이름으로 심볼릭 링크를 걸어도 된다
(헤드리스 셸 바이너리는 몇 버전 차이에서 호환됐다). 이 두 가지가 없는 환경에서는
`npm run qa`(우리 워크)가 대체재다 — 같은 결정 루프를 우리가 직접 돌린다.
| WebMCP 벤치 | Jev + 소형 LLM이 49/49 과제 해결, 프론티어 모델 대비 비용 약 1/112 | 벤치 저자 보고 |

한계: Jev는 **화면을 못 본다**. 레이아웃 깨짐·색 대비·겹침은 비전 모델(jevaluate처럼 페이지당 1장) 또는 결정적 검사(Playwright의 bounding box 겹침 계산, axe-core)가 필요하다. 그리고 각 단계 300~500ms는 빠르지만 "영상"처럼 보이는 것은 대개 편집이다.

## 5. 개발자 입장에서 Jev를 잘 쓰는 법과 좋은 점

**좋은 점**
1. **파싱이 없다** — 답이 항상 스키마 안. 적대적 입력에서 "빈 답 → fail-open"이 사라진다(Mastra 사례: 9/9 차단, 0/49 오탐, 0.4초, LLM 대비 1/4 비용).
2. **확률이 곧 라우팅 규칙** — 0.85 이상 자동, 0.55~0.85 사람, 그 이하 통과. 임계치 하나로 운영 부담을 조절.
3. **싸고 빨라서 "모든 곳"에 둘 수 있다** — 글마다, 커밋마다, 에이전트 턴마다. 1,000건에 몇 센트.
4. **재보정이 공짜** — 정책 문장을 바꾸면 재학습 없이 재채점(CV 스크리너 사례).
5. **에이전트의 "거짓 done"을 잡는다** — 코딩 에이전트의 가장 큰 실패 모드를 5센트/1,000회로 막는다.

**잘 쓰는 법**
- 질문은 **관찰 가능한 사실**로: "이 글은 좋은가"(X) → "이 글은 특정인을 식별할 수 있는 정보를 담고 있다"(O).
- criteria에 **정의를 문장으로** 쓴다. 옵션 이름만 주면 과신한다.
- **한 요청에 여러 질문**(같은 state). 왕복이 줄고 싸다.
- confidence를 저장하고 **주기적으로 표본 검수**해 임계치를 재보정한다(우리 데이터로 ECE 측정).
- 규칙으로 잡히는 것(정규식·길이·속도 제한)은 규칙으로. Jev는 규칙이 못 잡는 의미 판단에만.
- 비밀·개인정보는 state에 넣지 않는다. 본문만, 익명화해서.
- fail-open/closed를 **함수 시그니처 수준에서** 고정한다.

**하지 말 것**: 요약·설명·문장 생성을 기대하기, 산술·날짜 비교, 컨텍스트 압축(compaction)에 쓰기(Theo 등 강한 반론), 임계치 없이 답을 그대로 실행하기.

## 6. 비용 추정 (온다 기준, `내가 가정함`)
글+댓글 월 3,000건 × ~800토큰 = 2.4M 토큰 ≈ **$0.10/월**. QA 워크 매일 30단계 × 30일 ≈ $0.05. Stop 훅 하루 50회 ≈ $0.08/월. 합쳐도 **월 1달러 미만**. 병목은 비용이 아니라 대기열(early access)과 오답 검수 시간이다.
