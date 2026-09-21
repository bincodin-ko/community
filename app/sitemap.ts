import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { TOPICS } from "@/lib/topics";
import { todayKST } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [posts, mindsets] = await Promise.all([
    prisma.post.findMany({
      where: { hidden: false },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.mindset.findMany({ where: { date: { lte: todayKST() } }, select: { date: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/mindset`, changeFrequency: "daily", priority: 0.8 },
    ...TOPICS.map((t) => ({ url: `${base}/t/${t.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...mindsets.map((m) => ({ url: `${base}/mindset/${m.date}`, changeFrequency: "yearly" as const, priority: 0.4 })),
    ...posts.map((p) => ({ url: `${base}/posts/${p.id}`, lastModified: p.createdAt, priority: 0.6 })),
  ];
}
