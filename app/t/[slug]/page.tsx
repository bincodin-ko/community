// 주제 아카이브 — 검색 유입용 정적 주소 (/t/family 등). 홈의 ?topic= 필터와 같은 데이터, 다른 메타데이터.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { TOPICS } from "@/lib/topics";
import { PostItem } from "@/components/PostItem";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };
const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "온다";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPICS.find((t) => t.slug === slug);
  if (!topic) return {};
  return {
    title: `${topic.label} 이야기`,
    description: `${topic.hint}. 한국 2030 게이들이 익명으로 남긴 ${topic.label} 이야기 — ${APP}`,
    alternates: { canonical: `/t/${slug}` },
  };
}

export default async function TopicPage({ params }: Params) {
  const { slug } = await params;
  const topic = TOPICS.find((t) => t.slug === slug);
  if (!topic) notFound();
  const posts = await prisma.post.findMany({
    where: { hidden: false, topic: slug },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { nickname: true, status: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="serif text-3xl font-bold">{topic.label} 이야기</h1>
        <p className="mt-2 text-mute">{topic.hint}. 읽는 건 로그인 없이도 돼요.</p>
      </header>
      <nav aria-label="다른 주제" className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-mute">
        {TOPICS.filter((t) => t.slug !== slug).map((t) => (
          <Link key={t.slug} href={`/t/${t.slug}`} className="underline-offset-4 hover:text-ink hover:underline">
            {t.label}
          </Link>
        ))}
      </nav>
      {posts.length === 0 ? (
        <p className="text-sm text-mute">아직 글이 없어요.</p>
      ) : (
        <ul>
          {posts.map((p) => (
            <PostItem key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
