import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { topicLabel } from "@/lib/topics";
import { displayName, timeAgo, excerpt } from "@/lib/format";
import { ReactionButton } from "@/components/ReactionButton";
import { CommentForm, ReportForm, CareNote } from "@/components/Forms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ care?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, select: { title: true, body: true, hidden: true } });
  if (!post || post.hidden) return { title: "글" };
  return { title: post.title, description: excerpt(post.body, 140) };
}

export default async function PostPage({ params, searchParams }: Params) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getSessionUser();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, status: true } },
      _count: { select: { reactions: true } },
      comments: {
        where: { hidden: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, nickname: true, status: true } } },
      },
      reactions: user ? { where: { userId: user.id }, select: { userId: true } } : false,
    },
  });
  if (!post || post.hidden) notFound();

  const reacted = Array.isArray(post.reactions) && post.reactions.length > 0;

  return (
    <article className="space-y-8">
      {sp.care ? <CareNote /> : null}
      <header className="space-y-2">
        <p className="text-sm text-mute">
          <Link href={`/?topic=${post.topic}`} className="text-teal hover:underline">
            {topicLabel(post.topic)}
          </Link>
          <span aria-hidden> · </span>
          {displayName(post.anonymous, post.author.nickname, post.author.status)}
          <span aria-hidden> · </span>
          <time dateTime={post.createdAt.toISOString()}>{timeAgo(post.createdAt)}</time>
        </p>
        <h1 className="serif text-3xl leading-tight font-bold">{post.title}</h1>
      </header>

      <div className="prose-onda">{post.body}</div>

      <div className="flex flex-wrap items-center gap-4 border-y border-line py-4">
        <ReactionButton postId={post.id} count={post._count.reactions} active={reacted} loggedIn={!!user} />
        <span className="text-sm text-mute">"나도"는 좋아요가 아니라, 나도 그랬다는 뜻이에요.</span>
        <div className="ml-auto">{user && user.id !== post.author.id ? <ReportForm postId={post.id} /> : null}</div>
      </div>

      <section className="space-y-5">
        <h2 className="serif text-xl font-bold">댓글 {post.comments.length}</h2>
        {post.comments.length === 0 ? (
          <p className="text-sm text-mute">아직 댓글이 없어요. 먼저 한 마디 남겨도 괜찮아요.</p>
        ) : null}
        <ul className="space-y-5">
          {post.comments.map((c) => (
            <li key={c.id} className="border-l-2 border-line pl-4">
              <p className="text-sm text-mute">
                {displayName(c.anonymous, c.author.nickname, c.author.status)}
                <span aria-hidden> · </span>
                <time dateTime={c.createdAt.toISOString()}>{timeAgo(c.createdAt)}</time>
              </p>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              {user && user.id !== c.author.id ? (
                <div className="mt-1">
                  <ReportForm commentId={c.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {user ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
            댓글을 남기려면{" "}
            <Link href={`/login?next=/posts/${post.id}`} className="text-teal underline underline-offset-4">
              들어오거나
            </Link>{" "}
            <Link href="/join" className="text-teal underline underline-offset-4">
              닉네임 하나로 시작
            </Link>
            하세요.
          </p>
        )}
      </section>
    </article>
  );
}
