# 스택 추천 — 온다(ONDA) MVP

**추천: 지금은 로컬 SQLite + Next.js(0원) → 첫 사용자부터 Cloudflare 없이 단일 VPS(Vultr 서울 $6) + Coolify + Postgres → 활성 1,000명 넘으면 관리형 Postgres(Supabase Pro $25)로 DB만 이관.**
이유 한 줄: 텍스트 게시판은 부하가 거의 없고, 한국 사용자에게 서울 리전이 필요하며, 성적 지향이라는 민감정보를 다루므로 데이터 층을 표준(Postgres)으로 두어 언제든 옮길 수 있어야 한다.

| 단계 | 전환 조건 | 무엇을 | 월 현금 | 운영 시간 | 실질 합계(3만원/h) | 매출 대비 |
|---|---|---|---:|---:|---:|---:|
| 지금 | 검증 중, 사용자 0 | 로컬 SQLite, X 카드 실험 | $0 | 0h | $0 | — |
| 첫 사용자 | 폼 응답 50건 통과 | Vultr 서울 1vCPU/1GB + Coolify + Postgres + Caddy | $6 | 1h | 약 $27 | 매출 0 → 감수 |
| 활성 300명 | 주간 작성자 100명 | 동일 + Cloudflare(무료 DNS/CDN) + R2(이미지 도입 시) | $6~12 | 2h | 약 $50 | 유료 50명 기준 15% |
| 활성 1,000명+ | 운영 시간 월 3h 초과 or DB 백업 실패 1회 | DB만 Supabase Pro(서울) 이관 | $31 | 1h | 약 $52 | 유료 250명 기준 5% |

가격 확인(2026-09-20 검색): Vultr 서울 $2.5~6/월 시작, Cloudflare Workers Paid $5, Vercel Hobby 상업 사용 금지·Pro $20/seat, Railway Hobby $5, Fly.io 무료 티어 폐지·최소 ~$5, Supabase Free 500MB/Pro $25, Neon Free 0.5GB, Hetzner 싱가포르 CPX22 €30.84(2026-06 인상 → 탈락).

## 이 추천이 틀리는 조건
- 이미지 업로드를 P0로 올리면 → 스토리지·egress가 첫 비용이 된다. R2(egress 무료)를 그때 붙인다.
- 실시간 채팅을 v0.2에 넣으면 → 웹소켓 때문에 서버리스(Cloudflare/Vercel)가 아니라 VPS가 더 맞다. 이 추천은 그 경우에도 유효.
- 정지 내성이 낮아지면(유료 멤버십·결제) → Coolify 자동 백업 + 외부 오브젝트 스토리지 백업 필수.

## 가장 큰 비용 함정 하나
**Vercel Hobby로 시작하는 것.** 상업 사용 금지 조항 + 100GB 대역폭 초과 시 서비스 정지. 후원 멤버십을 받는 순간 Pro $20이 되고, 이후 종량제 청구가 상한 없이 늘어난다. 처음부터 VPS.

## 사지 말아야 할 것
유료 모니터링(Sentry 무료 티어면 충분), 관리형 Redis, 멀티리전, 전용 DB 인스턴스, 앱스토어 개발자 계정(v1.0까지 웹/PWA).

## 첫 주에 막힐 지점 (이 서비스 고유)

1. **SQLite → Postgres 전환 시 `datetime` 기본값.** Prisma에서 `@default(now())`는 양쪽 다 동작하지만, 시드 스크립트에서 `new Date()`를 문자열로 넣으면 SQLite에서만 통과한다. `prisma/schema.prisma`의 `provider`와 `DATABASE_URL`만 바꾸면 이관되도록 이미 작성되어 있다.
2. **세션 쿠키가 HTTP에서 안 잡힘.** `secure: true`로 두면 로컬 http에서 로그인이 안 된다. 코드에 `process.env.NODE_ENV === "production"` 조건이 들어 있다.
3. **한글 폰트 로딩.** Google Fonts `Gowun Batang`·`IBM Plex Sans KR`을 `next/font/google`로 불러오면 빌드 시 다운로드가 필요하다. 오프라인 빌드 환경에서는 실패하므로 `app/layout.tsx`는 `<link>` 태그 방식을 쓴다(CSS 폰트 폴백 지정됨).
4. **신고 임계치 자동 숨김을 트랜잭션으로.** 동시 신고 3건이 동시에 들어오면 카운트 경합이 난다. `lib/actions.ts`의 `reportPost`는 `updateMany`+재조회로 처리한다.

## 첫 주에 할 일
1. `npm run db:reset && npm run dev`로 로컬 실행, 시드 글 확인
2. X 계정 개설 → 마인드셋 카드 30개 예약 발행 + 익명 폼(Tally 무료) 링크
3. Vultr 서울 인스턴스 + Coolify 설치, `.env`에 `DATABASE_URL`(Postgres)·`SESSION_SECRET` 설정
4. 도메인(.kr 또는 .app) + Cloudflare 무료 DNS
5. 커뮤니티 가이드 페이지 문구를 당사자 3명에게 검토받기
