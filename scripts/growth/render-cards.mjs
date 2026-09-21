#!/usr/bin/env node
// 마인드셋 카드 PNG 렌더 — DB 의 마인드셋을 1200×630 카드로 그려 public/cards/<date>.png 에 저장한다.
// X/OG 미리보기용. 사용: node scripts/growth/render-cards.mjs [--days 30] [--force]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1] || 30);
const force = args.includes("--force");
const outDir = path.join(process.cwd(), "public", "cards");
fs.mkdirSync(outDir, { recursive: true });
const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "온다";

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = (m) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&family=IBM+Plex+Sans+KR:wght@400;500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;background:#fbebc6;font-family:"IBM Plex Sans KR","WenQuanYi Zen Hei",sans-serif;color:#1c2333}
  .wrap{box-sizing:border-box;height:100%;padding:72px 84px;display:flex;flex-direction:column;justify-content:space-between}
  .date{font-size:26px;color:#5c6478}
  .quote{font-family:"Gowun Batang","WenQuanYi Zen Hei",serif;font-weight:700;font-size:${m.quote.length > 40 ? 52 : 62}px;line-height:1.3;word-break:keep-all}
  .q{font-size:30px;line-height:1.45;color:#1c2333;max-width:960px;word-break:keep-all}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:26px;color:#5c6478}
  .brand{font-family:"Gowun Batang","WenQuanYi Zen Hei",serif;font-weight:700;font-size:40px;color:#2f6f6d}
</style></head><body><div class="wrap">
  <div class="date">${esc(m.date)}의 마인드셋</div>
  <div class="quote">${esc(m.quote)}</div>
  <div class="q">${esc(m.question)}</div>
  <div class="foot"><span class="brand">${esc(APP)}</span><span>만남 앱이 아니라, 마음을 이야기하는 곳</span></div>
</div></body></html>`;

const prisma = new PrismaClient();
const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const list = await prisma.mindset.findMany({ where: { date: { lte: kst } }, orderBy: { date: "desc" }, take: days });
const launch = process.env.QA_CHROME_PATH ? { executablePath: process.env.QA_CHROME_PATH } : {};
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let made = 0;
for (const m of list) {
  const file = path.join(outDir, `${m.date}.png`);
  if (fs.existsSync(file) && !force) continue;
  await page.setContent(html(m), { waitUntil: "networkidle" }).catch(() => page.setContent(html(m)));
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, type: "png" });
  made++;
}
await browser.close();
await prisma.$disconnect();
console.log(`cards: ${made} rendered, ${list.length - made} skipped → ${outDir}`);
