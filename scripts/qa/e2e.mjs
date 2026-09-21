#!/usr/bin/env node
// 온다 E2E — 핵심 흐름과 자동 판정을 실제 브라우저로 확인한다.
// 사용: node scripts/qa/e2e.mjs --base http://localhost:3000   (서버는 JEV_BASE_URL 로 가짜/실제 Jev 에 연결되어 있어야 한다)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (
  process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000"
).replace(/\/$/, "");
const launch = process.env.QA_CHROME_PATH ? { executablePath: process.env.QA_CHROME_PATH } : {};
const browser = await chromium.launch(launch);
let failed = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failed++;
};
const rnd = () => Math.random().toString(36).slice(2, 7);

async function join(nick) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(base + "/join");
  await p.fill('input[name="nickname"]', nick);
  await p.fill('input[name="password"]', "testpass-1234");
  await p.fill('input[name="birthYear"]', "1996");
  await p.check('input[name="agree"]');
  await p.click('main button[type="submit"]');
  await p.waitForURL(/welcome=1/);
  return p;
}
async function post(p, title, body) {
  await p.goto(base + "/write");
  await p.fill('input[name="title"]', title);
  await p.fill('textarea[name="body"]', body);
  await p.click('main button[type="submit"]');
  await Promise.race([p.waitForURL(/\/posts\//), p.waitForSelector('p[role="alert"]')]);
  return p.url().includes("/posts/") ? { url: p.url() } : { error: await p.textContent('p[role="alert"]') };
}

// 1. 가입 → 글 → 제한 → 댓글 → 나도 → 비로그인 열람
const a = await join("e2e_" + rnd());
const r1 = await post(
  a,
  "e2e: 명절이 무섭다",
  "명절마다 결혼 얘기가 나온다. 올해는 어떻게 넘길지 모르겠다. 먼저 겪은 분들 이야기 듣고 싶다.",
);
ok("글 작성", !!r1.url, r1.error);
const r2 = await post(a, "두 번째 글", "이건 막혀야 정상입니다. 신규 계정 제한 테스트.");
ok("신규 계정 24시간 제한", !!r2.error && /24시간/.test(r2.error));
await a.goto(r1.url);
await a.fill('textarea[name="body"]', "e2e 댓글입니다. 나도 그랬어요.");
await a.click('form:has(textarea[name="body"]) button[type="submit"]');
ok(
  "댓글",
  await a
    .waitForSelector("text=e2e 댓글입니다")
    .then(() => true)
    .catch(() => false),
);
await a.click('button:has-text("나도")');
ok(
  "나도",
  await a
    .waitForSelector('button[aria-pressed="true"]')
    .then(() => true)
    .catch(() => false),
);
const g = await (await browser.newContext()).newPage();
const gr = await g.goto(r1.url);
ok("비로그인 열람", gr.status() === 200);

// 2. 자동 판정
const b = await join("e2e_" + rnd());
const hate = await post(b, "테스트", "게이새끼들 다 죽어라 병신들아 진짜 역겹다 다들");
ok("혐오 글 차단", !!hate.error, hate.error);
const c = await join("e2e_" + rnd());
const pii = await post(c, "연락 주세요", "고민 상담 해드려요 010-1234-5678 로 연락 주세요 편하게요");
ok("신상 글 게시(검토 대기)", !!pii.url);
const d = await join("e2e_" + rnd());
const cri = await post(d, "요즘 너무 힘들다", "아무한테도 말 못하고 요즘은 그냥 죽고 싶다는 생각이 자꾸 든다.");
ok("위기 글 상담 배너", !!cri.url && (await d.locator("text=자살예방상담 109(24시간)").count()) > 0);
await d.fill('textarea[name="body"]', "형 서울이면 오늘 만나실 분 사진 교환해요");
await d.click('form:has(textarea[name="body"]) button[type="submit"]');
ok(
  "만남 댓글 차단",
  await d
    .waitForSelector('p[role="alert"]')
    .then(() => true)
    .catch(() => false),
);

// 3. 신고 3건 → 숨김
for (let i = 0; i < 3; i++) {
  const r = await join("rep_" + rnd());
  await r.goto(r1.url);
  await r.click("summary:has-text('신고')");
  await r.selectOption('select[name="reason"]', "spam");
  await r.click('button:has-text("신고 보내기")');
  await Promise.race([r.waitForSelector("text=신고했어요"), r.waitForSelector("text=가려졌어요")]);
}
ok("신고 3건 자동 숨김", (await g.goto(r1.url)).status() === 404);

// 4. 운영자 큐
const m = await (await browser.newContext()).newPage();
await m.goto(base + "/login");
await m.fill('input[name="nickname"]', "새벽산책");
await m.fill('input[name="password"]', "onda-demo-1234");
await m.click('main button[type="submit"]');
await m.waitForURL(base + "/");
await m.goto(base + "/mod");
const hideBefore = await m.locator('main form button[value="hide"]').count();
ok("운영자 큐에 검토 대기 항목", hideBefore >= 1, `${hideBefore}개`);
if (hideBefore) {
  await m.locator('main form button[value="hide"]').first().click();
  await m.waitForLoadState("networkidle");
}
const hideAfter = await m.locator('main form button[value="hide"]').count();
ok("큐 처리(숨기기 1건 반영)", hideBefore >= 1 && hideAfter === hideBefore - 1, `${hideBefore} → ${hideAfter}`);

// 5. 탈퇴
await a.goto(base + "/settings");
a.once("dialog", (dl) => dl.accept());
await a.click('button:has-text("지금 탈퇴하기")');
ok(
  "즉시 탈퇴",
  await a
    .waitForURL(/bye=1/)
    .then(() => true)
    .catch(() => false),
);

await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
process.exit(failed ? 1 : 0);
