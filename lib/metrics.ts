/**
 * 지표 — 우리 DB 에서 직접 계산한다. 외부 분석 도구도, 쿠키도, 개인 식별자도 쓰지 않는다.
 * 북극성은 "말하는 사람 수"다. 읽는 사람 수가 아니라.
 */
import { prisma } from "./db";
import { UNANSWERED_HOURS, TOPICS } from "./topics";

const DAY = 86400 * 1000;
const WEEK = 7 * DAY;

export type WeekPoint = { start: Date; end: Date; label: string; writers: number; posts: number; comments: number };

export type Metrics = {
  weeks: WeekPoint[];
  thisWeekWriters: number;
  lastWeekWriters: number;
  stickiness: { repeat: number; any: number; rate: number };
  queue: { pending: number; hidden: number; oldestPendingHours: number | null };
  unanswered: number;
  outingCaught: number;
  topics: Array<{ slug: string; label: string; posts: number }>;
  totals: { members: number; posts: number; comments: number };
};

function kstLabel(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}`;
}

export async function getMetrics(weekCount = 12): Promise<Metrics> {
  const now = Date.now();
  const since = new Date(now - weekCount * WEEK);

  const [posts, comments, pendingPosts, pendingComments, hiddenCount, unanswered, outingCaught, totals] =
    await Promise.all([
      prisma.post.findMany({
        where: { createdAt: { gte: since } },
        select: { authorId: true, createdAt: true, topic: true },
      }),
      prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { authorId: true, createdAt: true } }),
      prisma.post.findMany({ where: { flagged: true }, select: { createdAt: true } }),
      prisma.comment.findMany({ where: { flagged: true }, select: { createdAt: true } }),
      prisma.post.count({ where: { hidden: true } }),
      prisma.post.count({
        where: {
          hidden: false,
          createdAt: { lte: new Date(now - UNANSWERED_HOURS * 3600 * 1000) },
          comments: { none: {} },
          reactions: { none: {} },
        },
      }),
      prisma.post.count({ where: { modCategory: "outing", createdAt: { gte: new Date(now - 30 * DAY) } } }),
      Promise.all([
        prisma.user.count({ where: { status: "active" } }),
        prisma.post.count({ where: { hidden: false } }),
        prisma.comment.count({ where: { hidden: false } }),
      ]),
    ]);

  // 주 단위 버킷 — 오늘부터 뒤로 7일씩
  const weeks: WeekPoint[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const end = new Date(now - i * WEEK);
    const start = new Date(end.getTime() - WEEK);
    const wp = posts.filter((p) => p.createdAt >= start && p.createdAt < end);
    const wc = comments.filter((c) => c.createdAt >= start && c.createdAt < end);
    const writers = new Set([...wp.map((p) => p.authorId), ...wc.map((c) => c.authorId)]);
    weeks.push({ start, end, label: kstLabel(start), writers: writers.size, posts: wp.length, comments: wc.length });
  }

  // 꾸준함 — 최근 4주 중 2주 이상 쓴 사람의 비율
  const recent4 = weeks.slice(-4);
  const weeklySets = recent4.map((w) => {
    const s = new Set<string>();
    for (const p of posts) if (p.createdAt >= w.start && p.createdAt < w.end) s.add(p.authorId);
    for (const c of comments) if (c.createdAt >= w.start && c.createdAt < w.end) s.add(c.authorId);
    return s;
  });
  const counts = new Map<string, number>();
  for (const s of weeklySets) for (const id of s) counts.set(id, (counts.get(id) ?? 0) + 1);
  const any = counts.size;
  const repeat = [...counts.values()].filter((n) => n >= 2).length;

  const pendingDates = [...pendingPosts, ...pendingComments].map((x) => x.createdAt.getTime());
  const oldestPendingHours = pendingDates.length ? (now - Math.min(...pendingDates)) / 3600000 : null;

  const last30 = new Date(now - 30 * DAY);
  const topicCounts = TOPICS.map((t) => ({
    slug: t.slug,
    label: t.label,
    posts: posts.filter((p) => p.topic === t.slug && p.createdAt >= last30).length,
  })).sort((a, b) => b.posts - a.posts);

  return {
    weeks,
    thisWeekWriters: weeks[weeks.length - 1]?.writers ?? 0,
    lastWeekWriters: weeks[weeks.length - 2]?.writers ?? 0,
    stickiness: { repeat, any, rate: any ? repeat / any : 0 },
    queue: { pending: pendingPosts.length + pendingComments.length, hidden: hiddenCount, oldestPendingHours },
    unanswered,
    outingCaught,
    topics: topicCounts,
    totals: { members: totals[0], posts: totals[1], comments: totals[2] },
  };
}
