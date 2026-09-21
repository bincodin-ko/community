import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { todayKST } from "@/lib/format";
import { TOPIC_SLUGS } from "@/lib/topics";
import { MindsetCard } from "@/components/MindsetCard";
import { TopicTabs } from "@/components/TopicTabs";
import { PostItem } from "@/components/PostItem";

export const dynamic = "force-dynamic";

type Search = { topic?: string; welcome?: string; bye?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const topic = TOPIC_SLUGS.includes(sp.topic as never) ? sp.topic : undefined;
  const user = await getSessionUser();

  const [mindset, posts] = await Promise.all([
    prisma.mindset.findFirst({ where: { date: { lte: todayKST() } }, orderBy: { date: "desc" } }),
    prisma.post.findMany({
      where: { hidden: false, ...(topic ? { topic } : {}) },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: { nickname: true, status: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {sp.welcome ? (
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
          어서 오세요. 첫 하루는 글 1개, 댓글 5개까지 쓸 수 있어요. 읽는 건 마음껏.
        </p>
      ) : null}
      {sp.bye ? (
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
          탈퇴했어요. 남긴 글은 '탈퇴한 사용자'로 남습니다. 언제든 다시 와도 괜찮아요.
        </p>
      ) : null}

      {!user ? (
        <section className="space-y-3">
          <h1 className="serif text-3xl leading-tight font-bold sm:text-4xl">
            만남 앱이 아니라,
            <br />
            게이로 사는 마음을 이야기하는 곳.
          </h1>
          <p className="max-w-prose text-mute">
            얼굴도, 거리도, 스펙도 없어요. 닉네임 하나로 들어와서 커밍아웃, 가족, 군대, 회사, 연애, 그리고 그냥 오늘
            있었던 일을 이야기해요. 읽는 건 로그인 없이도 돼요.
          </p>
        </section>
      ) : null}

      {mindset ? <MindsetCard m={mindset} /> : null}

      <section className="space-y-4">
        <TopicTabs current={topic} />
        {posts.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper px-5 py-8 text-center">
            <p className="serif text-lg">아직 이 주제의 글이 없어요.</p>
            <p className="mt-1 text-sm text-mute">첫 글은 늘 조금 용기가 필요하죠. 그래도 누군가는 기다리고 있어요.</p>
            <Link href={`/write${topic ? `?topic=${topic}` : ""}`} className="btn btn-primary mt-4">
              첫 글 쓰기
            </Link>
          </div>
        ) : (
          <ul>
            {posts.map((p) => (
              <PostItem key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
