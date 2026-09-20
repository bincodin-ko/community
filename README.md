# 온다 (ONDA) — 한국 2030 게이를 위한 텍스트 우선 익명 커뮤니티

> "만남 앱이 아니라, 게이로 사는 마음을 이야기하는 곳."
> Cade Bradley(@GayExTrad)의 인터뷰 *The Mindset That Changed How I Saw Being Gay* 에서 출발한 제품.
> 이름은 가칭이며 `NEXT_PUBLIC_APP_NAME` 하나로 바꿀 수 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01-interview-analysis.md](docs/01-interview-analysis.md) | 인터뷰·인물 분석, 핵심 마인드셋, 한국 맥락으로의 번역 |
| [docs/02-creator-product-analysis.md](docs/02-creator-product-analysis.md) | Cade의 콘텐츠 퍼널(숏폼→롱폼→팟캐스트→뉴스레터→$1 디스코드) 해부와 한계 |
| [docs/03-korea-market-analysis.md](docs/03-korea-market-analysis.md) | 수요 통계, 경쟁 지형(이반시티·게이코리아·X·오픈채팅·데이팅 앱), 아픔의 증거, 문제 3층 분해 |
| [docs/04-users-and-jtbd.md](docs/04-users-and-jtbd.md) | 페르소나 3종, 반페르소나, 사용자 여정 ↔ 화면 매핑 |
| [docs/05-product-strategy.md](docs/05-product-strategy.md) | 포지셔닝, 제품 원칙, 기능 우선순위, 신뢰·안전 설계, 수익 모델, 법률 리스크, 로드맵, KPI |
| [docs/06-idea-validation.md](docs/06-idea-validation.md) | 1인 창업 아이디어 필터로 자기 반박한 15항목 카드 (약한 부분 포함) |
| [docs/stack-recommendation.md](docs/stack-recommendation.md) | 단계별 인프라 추천과 비용, 첫 주에 막힐 지점 |

**가장 먼저 읽을 것**: `docs/06` 결론 — 이 제품은 단독 SaaS로 월 1만 달러가 되기 어렵고, 배포 전에 2주짜리 수요 실험(X 마인드셋 카드 + 익명 폼)을 먼저 해야 한다.

## MVP (v0.1)에 들어 있는 것

- 닉네임·비밀번호·출생연도만으로 가입 (이메일·전화·사진 미수집, 출생연도는 수정 불가)
- 주제별 글(마음·커밍아웃·가족·회사·군대·연애·일상), 익명 옵션, 비로그인 열람
- 댓글, "나도"(공감), 신고 → 3건이면 자동 숨김
- 오늘의 마인드셋(30일치 시드, 질문에 바로 답하기)
- 신규 계정 24시간 제한(글 1·댓글 5), 즉시 탈퇴(글은 "탈퇴한 사용자"로 익명화)
- 커뮤니티 약속 페이지, 위기 지원 연락처, 다크 모드, 모바일 대응

없는 것(의도적): 프로필 그리드, 거리순, 사진 업로드, DM, 광고.

## 실행

```bash
cp .env.example .env          # SESSION_SECRET 을 긴 임의 문자열로 교체
npm install
npm run db:reset              # SQLite 생성 + 시드 (마인드셋 30개, 예시 글 7개)
npm run dev                   # http://localhost:3000
```

예시 계정: `새벽산책` / `onda-demo-1234` (배포 전 시드의 예시 글·계정은 삭제할 것).

프로덕션: `npm run build && npm start`. Postgres로 옮기려면 `prisma/schema.prisma`의 `provider`와 `DATABASE_URL`만 바꾼다.

## 구조

```
app/            페이지 (홈, posts/[id], write, join, login, mindset, guide, settings)
components/     Nav, MindsetCard, TopicTabs, PostItem, ReactionButton, Forms(클라이언트 폼)
lib/            db(Prisma), auth(JWT 쿠키), actions(서버 액션), validation(zod), topics(주제·임계치)
prisma/         schema.prisma, seed.ts
docs/           분석·전략 문서
```

## 검증된 것

`next build` 통과. Playwright로 가입 → 글 작성 → 신규 계정 제한 → 댓글 → 나도 → 비로그인 열람 → 신고 3건 자동 숨김(404) → 탈퇴 흐름을 확인했다.

## 다음 단계 (v0.2)

초대코드, 소모임, 주간 질문 자동 게시, 검색, 운영자 검토 큐, 배포(Vultr 서울 + Coolify). 자세한 순서는 `docs/05` §7.
