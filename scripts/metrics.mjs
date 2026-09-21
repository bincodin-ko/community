#!/usr/bin/env node
// 터미널에서 지표 보기 — 브라우저를 열지 않고 북극성과 가드레일을 확인한다.
// 사용: node scripts/metrics.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const DAY = 86400000;
const WEEK = 7 * DAY;
const prisma = new PrismaClient();
const now = Date.now();
const since = new Date(now - 12 * WEEK);

const [posts, comments, pendingPosts, pendingComments, unanswered, members] = await Promise.all([
  prisma.post.findMany({ where: { createdAt: { gte: since } }, select: { authorId: true, createdAt: true } }),
  prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { authorId: true, createdAt: true } }),
  prisma.post.count({ where: { flagged: true } }),
  prisma.comment.count({ where: { flagged: true } }),
  prisma.post.count({
    where: {
      hidden: false,
      createdAt: { lte: new Date(now - 6 * 3600000) },
      comments: { none: {} },
      reactions: { none: {} },
    },
  }),
  prisma.user.count({ where: { status: "active" } }),
]);

const rows = [];
for (let i = 11; i >= 0; i--) {
  const end = now - i * WEEK;
  const start = end - WEEK;
  const w = new Set([
    ...posts.filter((p) => p.createdAt >= new Date(start) && p.createdAt < new Date(end)).map((p) => p.authorId),
    ...comments.filter((c) => c.createdAt >= new Date(start) && c.createdAt < new Date(end)).map((c) => c.authorId),
  ]);
  const k = new Date(start + 9 * 3600000);
  rows.push({ label: `${k.getUTCMonth() + 1}/${k.getUTCDate()}`, writers: w.size });
}
const max = Math.max(1, ...rows.map((r) => r.writers));
console.log("주간 작성자 (최근 12주)");
for (const r of rows)
  console.log(
    `  ${r.label.padStart(5)} ${String(r.writers).padStart(3)} ${"█".repeat(Math.round((r.writers / max) * 30))}`,
  );
console.log(
  `\n이번 주 ${rows[rows.length - 1].writers}명 · 지난주 ${rows[rows.length - 2]?.writers ?? 0}명 · 목표 300명`,
);
console.log(`검토 대기 ${pendingPosts + pendingComments}건 · 답 없는 글 ${unanswered}건 · 활동 계정 ${members}명`);
await prisma.$disconnect();
