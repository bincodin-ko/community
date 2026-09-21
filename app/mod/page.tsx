import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { reviewPostAction, reviewCommentAction } from "@/lib/actions";
import { topicLabel } from "@/lib/topics";
import { timeAgo, excerpt } from "@/lib/format";
import { jevEnabled } from "@/lib/jev";

export const metadata = { title: "검토 대기" };
export const dynamic = "force-dynamic";

export default async function ModPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mod");
  if (user.role !== "moderator" && user.role !== "admin") redirect("/");

  const [posts, comments, reports] = await Promise.all([
    prisma.post.findMany({
      where: { OR: [{ flagged: true }, { hidden: true }] },
      orderBy: [{ hidden: "asc" }, { modBlock: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { _count: { select: { reports: true } } },
    }),
    prisma.comment.findMany({
      where: { OR: [{ flagged: true }, { hidden: true }] },
      orderBy: [{ hidden: "asc" }, { modBlock: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="serif text-3xl font-bold">검토 대기</h1>
        <p className="mt-2 text-sm text-mute">
          자동 판정({jevEnabled() ? "Jev 연결됨" : "규칙만 동작 중, Jev 키 없음"})과 신고로 올라온 글이에요. 24시간 안에
          처리하는 것이 약속입니다.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="serif text-xl font-bold">글 {posts.length}</h2>
        {posts.length === 0 ? <p className="text-sm text-mute">비어 있어요.</p> : null}
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-paper p-4">
              <p className="text-sm text-mute">
                {p.hidden ? "숨김" : "검토 대기"} · {topicLabel(p.topic)} · {p.modCategory ?? "—"}{" "}
                {typeof p.modBlock === "number" ? `(${Math.round(p.modBlock * 100)}%)` : ""} · 신고 {p._count.reports} ·{" "}
                {timeAgo(p.createdAt)}
              </p>
              <p className="serif mt-1 font-bold">{p.title}</p>
              <p className="mt-1 text-sm">{excerpt(p.body, 240)}</p>
              <form action={reviewPostAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={p.id} />
                <button name="verdict" value="ok" className="btn btn-quiet">
                  문제 없음
                </button>
                {p.hidden ? (
                  <button name="verdict" value="restore" className="btn btn-quiet">
                    복구
                  </button>
                ) : (
                  <button name="verdict" value="hide" className="btn btn-quiet hover:!border-rose hover:!text-rose">
                    숨기기
                  </button>
                )}
                <Link href={`/posts/${p.id}`} className="btn btn-quiet">
                  열기
                </Link>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="serif text-xl font-bold">댓글 {comments.length}</h2>
        {comments.length === 0 ? <p className="text-sm text-mute">비어 있어요.</p> : null}
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-paper p-4">
              <p className="text-sm text-mute">
                {c.hidden ? "숨김" : "검토 대기"} · {c.modCategory ?? "—"}{" "}
                {typeof c.modBlock === "number" ? `(${Math.round(c.modBlock * 100)}%)` : ""} · {timeAgo(c.createdAt)}
              </p>
              <p className="mt-1 text-sm">{excerpt(c.body, 240)}</p>
              <form action={reviewCommentAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.id} />
                <button name="verdict" value="ok" className="btn btn-quiet">
                  문제 없음
                </button>
                {c.hidden ? (
                  <button name="verdict" value="restore" className="btn btn-quiet">
                    복구
                  </button>
                ) : (
                  <button name="verdict" value="hide" className="btn btn-quiet hover:!border-rose hover:!text-rose">
                    숨기기
                  </button>
                )}
                <Link href={`/posts/${c.postId}`} className="btn btn-quiet">
                  글 열기
                </Link>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="serif text-xl font-bold">최근 신고 {reports.length}</h2>
        <ul className="text-sm text-mute">
          {reports.map((r) => (
            <li key={r.id}>
              {timeAgo(r.createdAt)} · {r.reason} ·{" "}
              {r.postId ? (
                <Link className="underline" href={`/posts/${r.postId}`}>
                  글
                </Link>
              ) : (
                "댓글"
              )}{" "}
              {r.detail ? `· ${r.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
