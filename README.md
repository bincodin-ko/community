# 온다 (ONDA) — 한국 2030 게이를 위한 텍스트 우선 익명 커뮤니티

> "만남 앱이 아니라, 게이로 사는 마음을 이야기하는 곳."
> Cade Bradley가 진행한 *Intrinsically Ordered* 팟캐스트 에피소드 *The Mindset That Changed How I Saw Being Gay* (게스트: GayUnmasked 창업자 Sigurd Noe-Nygaard)에서 출발한 제품.
> 이름은 가칭이며 `NEXT_PUBLIC_APP_NAME` 하나로 바꿀 수 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01-interview-analysis.md](docs/01-interview-analysis.md) | 인터뷰 전사 기반 분석(타임코드), Sigurd의 핵심 마인드셋, 호스트의 심리학 프레임, 한국 맥락으로의 번역 |
| [docs/02-creator-product-analysis.md](docs/02-creator-product-analysis.md) | GayUnmasked 제품 해부: 계기, 기술(Skool), 초기 고객 확보, 어려움, 시장 진입에 필요한 이해 |
| [docs/03-korea-market-analysis.md](docs/03-korea-market-analysis.md) | 수요 통계, 경쟁 지형(이반시티·게이코리아·X·오픈채팅·데이팅 앱), 아픔의 증거, 문제 3층 분해 |
| [docs/04-users-and-jtbd.md](docs/04-users-and-jtbd.md) | 페르소나 3종, 반페르소나, 사용자 여정 ↔ 화면 매핑 |
| [docs/05-product-strategy.md](docs/05-product-strategy.md) | 포지셔닝, 제품 원칙, 기능 우선순위, 신뢰·안전 설계, 수익 모델, 법률 리스크, 로드맵, KPI |
| [docs/06-idea-validation.md](docs/06-idea-validation.md) | 1인 창업 아이디어 필터로 자기 반박한 15항목 카드 (약한 부분 포함) |
| [docs/stack-recommendation.md](docs/stack-recommendation.md) | 단계별 인프라 추천과 비용, 첫 주에 막힐 지점 |
| [docs/07-huggingface-opensource.md](docs/07-huggingface-opensource.md) | 허깅페이스 오픈소스: 한국어 혐오 분류(성소수자 라벨), 임베딩, 소형 LLM, 온디바이스, Jev 대체재 |
| [docs/08-jev-integration.md](docs/08-jev-integration.md) | Jev(TypeSafe System One)란 무엇인가, 온다의 자동 판정 설계, 자동 QA·Stop 훅·MCP DOM 컨트롤, 좋은 점과 한계 |
| [docs/09-success-playbook.md](docs/09-success-playbook.md) | 성공 정의, 원칙 5가지, 90일 실행 순서, 도구별 품질 향상 지도, 하지 말 것 |
| [docs/10-status-and-next.md](docs/10-status-and-next.md) | **된 것·안 된 것·남은 것과 각각을 어떻게 하면 되는지** |

**지금 상태가 궁금하면**: `docs/10-status-and-next.md` 한 장이면 된다.

**작업 방식을 재사용하려면**: `.claude/skills/source-to-product/` — 소스(영상·인터뷰·남의 제품) 하나에서 제품까지 가는 순서를 스킬로 만들어 뒀다. 다른 프로젝트에서 쓰려면 `~/.claude/skills/` 로 복사한다.

**가장 먼저 읽을 것**: `docs/06` 결론 — 이 제품은 단독 SaaS로 월 1만 달러가 되기 어렵고, 배포 전에 2주짜리 수요 실험(X 마인드셋 카드 + 익명 폼)을 먼저 해야 한다.

## MVP (v0.1)에 들어 있는 것

- 닉네임·비밀번호·출생연도만으로 가입 (이메일·전화·사진 미수집, 출생연도는 수정 불가)
- 주제별 글(마음·커밍아웃·가족·회사·군대·연애·일상), 익명 옵션, 비로그인 열람
- 댓글, "나도"(공감), 신고 → 3건이면 자동 숨김
- 오늘의 마인드셋(30일치 시드, 질문에 바로 답하기)
- 신규 계정 24시간 제한(글 1·댓글 5), 즉시 탈퇴(글은 "탈퇴한 사용자"로 익명화)
- 커뮤니티 약속 페이지, 위기 지원 연락처, 다크 모드, 모바일 대응
- **자동 판정(Jev)**: 글·댓글 제출 시 차단/검토대기/통과를 확률로 결정, 위기 신호면 상담 연락처 배너, 규칙 기반 신상 패턴은 항상 동작. 키가 없으면 규칙만으로 fail-open
- **운영자 검토 큐** `/mod` (역할 moderator·admin): 검토 대기·숨김 글/댓글, 최근 신고, 문제 없음/숨기기/복구

없는 것(의도적): 프로필 그리드, 거리순, 사진 업로드, DM, 광고.

## 실행

```bash
cp .env.example .env          # SESSION_SECRET 을 긴 임의 문자열로 교체
npm install
npm run db:reset              # SQLite 생성 + 시드 (마인드셋 30개, 예시 글 7개)
npm run dev                   # http://localhost:3000
```

예시 계정: `새벽산책` / `onda-demo-1234` (운영자 권한 포함). **데모 계정·예시 글은 `SEED_DEMO=1` 일 때만 만들어지고 프로덕션에서는 아예 생성되지 않는다.** 운영 DB 에는 `npm run db:seed` 로 마인드셋만 들어가고, 운영자는 `npm run grant:mod <닉네임>` 으로 따로 승격한다.

프로덕션: `npm run build && npm start`. Postgres로 옮기려면 `prisma/schema.prisma`의 `provider`와 `DATABASE_URL`만 바꾼다.

## 운영·성장 도구

```bash
npm run copy:lint   # UI 문구 검사 (시스템 용어·격식체·AI 티)
npm run cards       # 마인드셋 공유 카드 PNG → public/cards/<날짜>.png
npm run digest      # 주간 다이제스트 초안 (LLM 없이 결정적으로)
npm run grant:mod <닉네임> [moderator|admin]
npm run metrics     # 터미널에서 북극성·가드레일 지표
npm run calibrate   # 라벨된 78건으로 모더레이션 임계치 재보정
npm run browse -- "가족 주제의 이야기 목록을 연다"   # Jev가 DOM을 조작하며 탐색
```

- `/t/<주제>` 주제 아카이브, `/mindset/<날짜>` 공유 페이지(OG 카드), `sitemap.xml`, `robots.txt` — 검색 유입용
- 글 상세 하단 "비슷한 이야기" — `EMBEDDINGS_URL`(KURE-v1 등)이 있으면 임베딩 코사인, 없으면 문자 바이그램
- `/mod` 상단 "아직 아무도 답하지 않은 글" — 6시간 동안 댓글·"나도"가 없는 글
- 신고 가중치: 가입 72시간 미만이거나 기여가 없는 계정의 신고는 0.4점 (급조 계정 3개로 남의 글을 내리는 공격 차단)
- `/mod/stats` 지표 — 이번 주 작성자 수(북극성), 12주 추이, 꾸준함, 검토 대기, 답 없는 글, 주제 분포.
  우리 DB 에서 직접 계산하며 쿠키·외부 전송·개인 식별자가 없다. 외부 분석은 `NEXT_PUBLIC_ANALYTICS_SRC` 를 넣을 때만 켜진다.
- `fixtures/moderation-cases.jsonl` — 커뮤니티 정책을 라벨된 78건으로 고정한 데이터셋.
  정상 48건 중에는 "자기가 들은 혐오 발언을 인용한 글"처럼 **차단하면 안 되는 어려운 사례**가 들어 있다.

## 자동 QA와 Claude Code 연동

```bash
npm run jev:fake                     # 키 없이 시험할 가짜 Jev (127.0.0.1:4141)
JEV_BASE_URL=http://127.0.0.1:4141/v1/systemone npm run dev
JEV_BASE_URL=http://127.0.0.1:4141/v1/systemone npm run qa   # Playwright + Jev 워크 → qa-report.md
```

- `scripts/qa/walk.mjs`: 라우트별 결정적 검사(HTTP·콘솔·요청 실패·라벨 없는 입력·가로 스크롤) + Jev 문구 판정(개발자 흔적) + 목표 워크("가입해서 글 하나 올리기")를 Jev가 단계마다 결정. 확신이 낮으면 멈추고 사람에게 넘긴다.
- `.claude/settings.json`: `.ts/.tsx` 편집 직후 타입체크(PostToolUse), 검증 없는 "완료"를 Jev로 잡아 되돌리는 Stop 훅(`scripts/hooks/stop-gate.mjs`). 키가 없거나 Jev가 죽으면 항상 통과.
- `.githooks/`: `pre-commit`(API 키·개인키·.env·디버그 잔재 차단), `commit-msg`(Jev가 메시지↔diff 일치 확인, 경고만). `npm install` 시 자동 설치.
- `.github/workflows/qa.yml`: 푸시·PR·매일 03:00 KST에 타입체크·린트·포맷·빌드·E2E·QA 워크·문구 린트 실행, 리포트 업로드.
- `.mcp.json`: `jev-browser` MCP 서버 — Claude Code가 Jev 결정으로 실제 브라우저를 조작. `TYPESAFE_API_KEY` 와 `npx playwright install chromium` 이 필요하다(둘 중 하나라도 없으면 실행되지 않는다, `docs/08` §4).
- 글·댓글 입력 중 신상(전화·이메일·SNS·링크)이 감지되면 브라우저에서만 경고한다. 아무것도 전송하지 않고, 차단도 하지 않는다.
- 실제 키: `TYPESAFE_API_KEY`(console.typesafe.ai, early access) 또는 `OPENROUTER_API_KEY`(`~typesafe/jev-latest`). 설계·한계는 `docs/08`.

## 구조

```
app/            페이지 (홈, posts/[id], write, join, login, mindset, guide, settings)
components/     Nav, MindsetCard, TopicTabs, PostItem, ReactionButton, Forms(클라이언트 폼)
lib/            db(Prisma), auth(JWT 쿠키), actions(서버 액션), validation(zod), topics(주제·임계치), jev(자동 판정)
prisma/         schema.prisma, seed.ts
scripts/qa/     walk.mjs(QA 워크), fake-jev.mjs(가짜 Jev)
scripts/hooks/  stop-gate.mjs, post-edit-typecheck.mjs (Claude Code 훅)
docs/           분석·전략 문서
```

## 검증된 것

`next build` 통과. Playwright로 가입 → 글 작성 → 신규 계정 제한 → 댓글 → 나도 → 비로그인 열람 → 신고 3건 자동 숨김(404) → 탈퇴 흐름을 확인했다.
**여기까지 전부 가짜 Jev(`scripts/qa/fake-jev.mjs`, 규칙 기반 로컬 스텁)로 검증했다. 실제 Jev API 키는 이 레포에 없고 한 번도 호출하지 않았다.**
확인된 것은 배선과 루프이지 판정 품질이 아니다. 가짜 Jev로 혐오 글 차단, 전화번호 글 검토대기, 위기 글 상담 배너, 만남 목적 댓글 차단, 운영자 큐 숨기기, Stop 훅(검증 없는 완료 되돌림·fail-open), QA 워크(실패 0, 목표 달성)를 확인했다. **실제 Jev 모델로는 아직 검증하지 않았다** — 키를 넣고 임계치를 우리 글로 재보정해야 한다.

## 다음 단계 (v0.2)

초대코드, 소모임, 주간 질문 자동 게시, 검색, 운영자 검토 큐, 배포(Vultr 서울 + Coolify). 자세한 순서는 `docs/05` §7.
