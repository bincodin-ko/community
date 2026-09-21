#!/usr/bin/env node
// 주간 다이제스트 초안 — 지난 7일 글 중 "나도"+댓글이 많은 글과 이번 주 마인드셋을 모아 마크다운 초안을 만든다.
// LLM 은 쓰지 않는다(결정적). 운영자가 읽고 고쳐서 보낸다. DIGEST_LLM_URL 이 있으면 문장 다듬기만 맡길 수 있다(선택).
// 사용: node scripts/growth/digest.mjs [--out digest.md]
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "digest.md";
const prisma = new PrismaClient();
const since = new Date(Date.now() - 7 * 86400 * 1000);
const posts = await prisma.post.findMany({
  where: { hidden: false, createdAt: { gte: since } },
  include: {
    author: { select: { nickname: true, status: true } },
    _count: { select: { comments: true, reactions: true } },
  },
});
const ranked = posts
  .map((p) => ({ ...p, score: p._count.reactions * 2 + p._count.comments * 3 }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const weekAgo = new Date(since.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const mindsets = await prisma.mindset.findMany({
  where: { date: { gte: weekAgo, lte: kst } },
  orderBy: { date: "asc" },
});
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const name = (p) => (p.author.status === "deleted" ? "탈퇴한 사용자" : p.anonymous ? "익명" : p.author.nickname);
const md = [
  `# 이번 주 온다 (${weekAgo} ~ ${kst})`,
  ``,
  `이번 주에는 ${posts.length}개의 이야기가 올라왔어요.`,
  ``,
  `## 많이 "나도" 한 이야기`,
  ...(ranked.length
    ? ranked.map(
        (p) =>
          `- [${p.title}](${base}/posts/${p.id}) — ${name(p)} · 나도 ${p._count.reactions} · 댓글 ${p._count.comments}`,
      )
    : ["- (이번 주 글이 없어요)"]),
  ``,
  `## 이번 주 마인드셋`,
  ...mindsets.map((m) => `- ${m.date}: ${m.quote}`),
  ``,
  `## 다음 주 질문`,
  `- (운영자가 채워 주세요)`,
  ``,
  `---`,
  `*이 초안은 자동으로 만들어졌어요. 보내기 전에 운영자가 읽고 고칩니다.*`,
  ``,
].join("\n");
fs.writeFileSync(out, md);
await prisma.$disconnect();
console.log(md);
