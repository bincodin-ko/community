// 마인드셋 공유 페이지 — X 카드 링크가 여기로 온다. OG 이미지는 scripts/growth/render-cards.mjs 가 만든 /cards/<date>.png
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { todayKST } from "@/lib/format";
import { MindsetCard } from "@/components/MindsetCard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ date: string }> };
const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "온다";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  const m = await prisma.mindset.findUnique({ where: { date } });
  if (!m || m.date > todayKST()) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    title: m.quote,
    description: m.question,
    openGraph: {
      title: m.quote,
      description: m.question,
      images: [{ url: `${base}/cards/${date}.png`, width: 1200, height: 630 }],
      siteName: APP,
    },
    twitter: {
      card: "summary_large_image",
      title: m.quote,
      description: m.question,
      images: [`${base}/cards/${date}.png`],
    },
  };
}

export default async function MindsetSharePage({ params }: Params) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const m = await prisma.mindset.findUnique({ where: { date } });
  if (!m || m.date > todayKST()) notFound();
  return (
    <div className="space-y-6">
      <MindsetCard m={m} />
      <p className="text-sm text-mute">
        {APP}는 만남 앱이 아니라, 게이로 사는 마음을 이야기하는 곳이에요.{" "}
        <Link href="/" className="text-teal underline underline-offset-4">
          다른 이야기 읽기
        </Link>
      </p>
    </div>
  );
}
