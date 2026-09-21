#!/usr/bin/env node
// 온다 QA 워크 — Playwright가 돌아다니고, Jev가 판정하고, 코드가 루프를 소유한다.
//  (a) 결정적 검사: HTTP 상태, 콘솔 오류, 실패한 요청, 라벨 없는 입력, 빈 링크, alt 없는 이미지, 가로 스크롤
//  (b) Jev 문구 판정: 화면 텍스트 줄마다 "개발자 흔적·미번역 키·깨진 값"인지 Noul
//  (c) 목표 워크: "닉네임으로 가입해 글 하나를 올린다" — 매 단계 Jev Choice가 누를 요소를 고르고, 확신이 낮으면 멈춰 사람에게 넘긴다
// 사용: node scripts/qa/walk.mjs --base http://localhost:3000 --out qa-report.md [--no-walk] [--headed]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import { ask, noul as noulOf, provider } from "../lib/jev.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, arr) =>
      a.startsWith("--")
        ? [a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? true : arr[i + 1]]
        : [],
    )
    .filter((x) => x.length),
);
const BASE = String(args.base ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = String(args.out ?? "qa-report.md");
const ROUTES = ["/", "/guide", "/mindset", "/join", "/login"];
const CONF_MIN = 0.6;
const findings = [];
let jevCalls = 0,
  jevTokens = 0;

const JEV = provider();

async function jev(state, questions) {
  if (!JEV) return null;
  const { answers, usage, error } = await ask(state, questions, { timeoutMs: 8000 });
  if (!answers) {
    findings.push({ sev: "warn", where: "jev", msg: error ?? "no answer" });
    return null;
  }
  jevCalls++;
  jevTokens += Number(usage?.input_tokens ?? 0);
  return answers;
}
const noul = (a, k) => noulOf(a, k);

async function checkRoute(ctx, route) {
  const page = await ctx.newPage();
  const consoleErrors = [],
    failed = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  // Next.js 링크 프리페치(_rsc)는 취소(ERR_ABORTED)가 정상이라 제외한다
  page.on("requestfailed", (r) => {
    const u = r.url();
    const err = r.failure()?.errorText ?? "";
    // Next 링크 프리페치와 집계 비콘은 이동 중 취소가 정상이다
    const intentionalAbort = err === "net::ERR_ABORTED" && (/[?&]_rsc=/.test(u) || u.endsWith("/api/hit"));
    if (u.startsWith(BASE) && !intentionalAbort) failed.push(`${err} ${u}`);
  });
  page.on("response", (r) => {
    if (r.url().startsWith(BASE) && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  const res = await page.goto(BASE + route, { waitUntil: "networkidle" });
  const where = route;
  if (!res || res.status() >= 400) findings.push({ sev: "fail", where, msg: `HTTP ${res?.status()}` });
  for (const e of consoleErrors.filter((t) => !/fonts\.g|ERR_CERT/.test(t)))
    findings.push({ sev: failed.length ? "fail" : "warn", where, msg: `console: ${e.slice(0, 160)}` });
  for (const f of failed) findings.push({ sev: "fail", where, msg: `request: ${f}` });

  const dom = await page.evaluate(() => {
    const out = {
      unlabeled: [],
      emptyLinks: [],
      noAlt: [],
      hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      lines: [],
    };
    for (const el of document.querySelectorAll(
      "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select",
    )) {
      const id = el.id;
      const labelled =
        (id && document.querySelector(`label[for="${id}"]`)) ||
        el.closest("label") ||
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder");
      if (!labelled) out.unlabeled.push(el.getAttribute("name") ?? el.tagName);
    }
    for (const a of document.querySelectorAll("a")) {
      const h = a.getAttribute("href");
      if (!h || h === "#") out.emptyLinks.push(a.textContent.trim().slice(0, 40));
    }
    for (const img of document.querySelectorAll("img"))
      if (!img.getAttribute("alt")) out.noAlt.push(img.getAttribute("src") ?? "img");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const p = n.parentElement;
      if (!p) continue;
      const cs = getComputedStyle(p);
      if (cs.display === "none" || cs.visibility === "hidden" || p.closest("script,style,noscript")) continue;
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (t.length < 2 || seen.has(t)) continue;
      seen.add(t);
      out.lines.push(t.slice(0, 200));
    }
    return out;
  });
  for (const u of dom.unlabeled) findings.push({ sev: "fail", where, msg: `라벨 없는 입력: ${u}` });
  for (const l of dom.emptyLinks) findings.push({ sev: "warn", where, msg: `빈 링크: "${l}"` });
  for (const i of dom.noAlt) findings.push({ sev: "warn", where, msg: `alt 없는 이미지: ${i}` });
  if (dom.hscroll) findings.push({ sev: "fail", where, msg: "가로 스크롤 발생" });

  // 모바일 가로 스크롤
  await page.setViewportSize({ width: 390, height: 844 });
  const hs = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (hs) findings.push({ sev: "fail", where, msg: "모바일(390px) 가로 스크롤 발생" });

  // Jev 문구 판정: 16줄씩
  const lines = dom.lines.slice(0, 80);
  for (let i = 0; i < lines.length; i += 16) {
    const batch = lines.slice(i, i + 16);
    const questions = {};
    batch.forEach((_, j) => {
      questions[`dev_${j}`] = {
        type: "noul",
        instructions: `\`lines[${j}]\`는 사용자가 보면 안 되는 개발자 흔적이다: TODO, 미번역 키(예: crm.title), 플레이스홀더(lorem), undefined/null/NaN, 코드 조각, 깨진 템플릿.`,
      };
    });
    const a = await jev({ page: route, lines: batch }, questions);
    if (!a) break;
    batch.forEach((line, j) => {
      const p = noul(a, `dev_${j}`);
      if (p >= 0.7)
        findings.push({ sev: "fail", where, msg: `개발자 흔적 (${Math.round(p * 100)}%): "${line.slice(0, 80)}"` });
    });
  }
  await page.close();
  return { route, lines: dom.lines.length };
}

const FIXTURES = {
  nickname: () => "qa_" + Math.random().toString(36).slice(2, 7),
  password: () => "qa-pass-1234",
  birthYear: () => "1997",
  title: () => "QA 워크 글: 명절 앞두고 마음이 복잡하다",
  body: () =>
    "QA 워크가 남기는 글입니다. 부모님 결혼 이야기가 다시 나올 것 같아서 미리 마음을 정리해 보려고요. 비슷한 분 계신가요.",
};

async function goalWalk(ctx, goal) {
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const trace = [];
  let lastUrl = "",
    same = 0,
    loggedIn = false;
  for (let step = 1; step <= 14; step++) {
    const url = page.url();
    same = url === lastUrl ? same + 1 : 0;
    lastUrl = url;
    const elements = await page.evaluate(() => {
      for (const old of document.querySelectorAll("[data-qa]")) old.removeAttribute("data-qa"); // 이전 단계의 표식 제거
      const els = [
        ...document.querySelectorAll("a[href], button, input:not([type=hidden]), textarea, select, [role=button]"),
      ].filter((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden";
      });
      return els.slice(0, 120).map((e, i) => {
        e.setAttribute("data-qa", String(i));
        const label = (
          e.getAttribute("aria-label") ||
          e.textContent ||
          e.getAttribute("placeholder") ||
          e.getAttribute("name") ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);
        return {
          id: i,
          tag: e.tagName.toLowerCase(),
          type: e.getAttribute("type") ?? "",
          name: e.getAttribute("name") ?? "",
          label,
          href: e.getAttribute("href") ?? "",
        };
      });
    });
    loggedIn = elements.some((e) => e.label === "나가기");
    const criteria = Object.fromEntries(
      elements.map((e) => [
        `e${e.id}`,
        `${e.tag}${e.type ? `[${e.type}]` : ""}${e.name ? ` name=${e.name}` : ""} "${e.label}"${e.href ? ` → ${e.href}` : ""}`,
      ]),
    );
    criteria.done = "목표를 이미 달성했다";
    const a = await jev(
      { goal, url, logged_in: loggedIn, steps_without_url_change: same, elements },
      {
        next_action: {
          type: "choice",
          instructions:
            "`goal`에 가까워지기 위해 지금 눌러야 할 요소 하나를 고른다. 폼이 있으면 제출 버튼을, 입력은 코드가 채운다.",
          criteria,
        },
        goal_reached: { type: "noul", instructions: "`url`과 `elements`로 볼 때 `goal`이 이미 달성되었다." },
        stuck: { type: "noul", instructions: "같은 화면에서 진전이 없다." },
      },
    );
    if (!a) {
      trace.push(`${step}. Jev 응답 없음 → 중단`);
      break;
    }
    const choice = a.next_action?.choice,
      conf = Number(a.next_action?.confidence ?? 0);
    const picked = elements.find((e) => `e${e.id}` === choice);
    trace.push(
      `${step}. ${url.replace(BASE, "") || "/"} → ${choice}${picked ? ` "${picked.label}"` : ""} (${Math.round(conf * 100)}%) goal=${noul(a, "goal_reached").toFixed(2)} stuck=${noul(a, "stuck").toFixed(2)}`,
    );
    if (noul(a, "goal_reached") >= 0.85 || choice === "done") {
      trace.push("목표 달성");
      break;
    }
    if (noul(a, "stuck") >= 0.85) {
      findings.push({ sev: "fail", where: "walk", msg: `막힘: ${url}` });
      break;
    }
    if (conf < CONF_MIN) {
      findings.push({
        sev: "warn",
        where: "walk",
        msg: `확신 낮음(${Math.round(conf * 100)}%) — 사람이 확인: ${url} 에서 ${choice}`,
      });
      break;
    }
    const target = elements.find((e) => `e${e.id}` === choice);
    if (!target) {
      findings.push({ sev: "warn", where: "walk", msg: `선택한 요소 없음: ${choice}` });
      break;
    }
    // 폼이면 먼저 채운다 (입력 값은 모델이 아니라 fixture가 만든다)
    const form = page.locator(`[data-qa="${target.id}"]`).locator("xpath=ancestor::form[1]");
    if (await form.count()) {
      for (const [name, make] of Object.entries(FIXTURES)) {
        const f = form.locator(`[name="${name}"]`);
        if (await f.count()) {
          const v = make();
          const tag = await f.evaluate((el) => el.tagName.toLowerCase());
          if (tag === "input" || tag === "textarea") await f.fill(v);
        }
      }
      for (const cb of await form.locator('input[type="checkbox"][required]').all()) await cb.check();
    }
    const before = page.url();
    await page.locator(`[data-qa="${target.id}"]`).first().click();
    // URL이 바뀌거나(서버 액션 리다이렉트 포함) 4초가 지날 때까지 기다린다 — 경합 방지
    await page.waitForURL((u) => u.toString() !== before, { timeout: 4000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  const shot = path.join(path.dirname(OUT) || ".", "qa-last.png");
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  await page.close();
  return trace;
}

(async () => {
  const launch = { headless: !args.headed };
  if (process.env.QA_CHROME_PATH) launch.executablePath = process.env.QA_CHROME_PATH;
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "ko-KR" });
  const routes = [];
  for (const r of ROUTES) routes.push(await checkRoute(ctx, r));
  // 첫 글 상세도 검사
  const home = await ctx.newPage();
  await home.goto(BASE + "/");
  const first = await home
    .locator('a[href^="/posts/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  await home.close();
  if (first) routes.push(await checkRoute(ctx, first));
  const trace = args["no-walk"]
    ? ["(생략)"]
    : await goalWalk(ctx, "닉네임으로 가입하고 글을 하나 올려서 글 상세 페이지에 도착한다");
  await browser.close();

  const fails = findings.filter((f) => f.sev === "fail"),
    warns = findings.filter((f) => f.sev === "warn");
  const md = [
    `# 온다 QA 리포트`,
    ``,
    `- 기준: ${BASE}`,
    `- 시각: ${new Date().toISOString()}`,
    `- Jev: ${JEV ? `${JEV.url} (${jevCalls}회, 입력 ${jevTokens} 토큰 ≈ $${((jevTokens * 0.042) / 1e6).toFixed(5)})` : "미연결 — 결정적 검사만"}`,
    `- 결과: 실패 ${fails.length} · 경고 ${warns.length}`,
    ``,
    `## 실패`,
    ...(fails.length ? fails.map((f) => `- [${f.where}] ${f.msg}`) : ["- 없음"]),
    ``,
    `## 경고`,
    ...(warns.length ? warns.map((f) => `- [${f.where}] ${f.msg}`) : ["- 없음"]),
    ``,
    `## 검사한 화면`,
    ...routes.map((r) => `- ${r.route} (텍스트 ${r.lines}줄)`),
    ``,
    `## 목표 워크`,
    ...trace.map((t) => `- ${t}`),
    ``,
  ].join("\n");
  fs.writeFileSync(OUT, md);
  console.log(md);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
