import Link from "next/link";
import { topicLabel } from "@/lib/topics";
import { displayName, excerpt, timeAgo } from "@/lib/format";

export type PostListItem = {
  id: string;
  topic: string;
  title: string;
  body: string;
  anonymous: boolean;
  createdAt: Date;
  author: { nickname: string; status: string };
  _count: { comments: number; reactions: number };
};

export function PostItem({ p }: { p: PostListItem }) {
  return (
    <li className="border-b border-line py-5 first:pt-0">
      <div className="flex items-center gap-2 text-sm text-mute">
        <span className="text-teal">{topicLabel(p.topic)}</span>
        <span aria-hidden>·</span>
        <span>{displayName(p.anonymous, p.author.nickname, p.author.status)}</span>
        <span aria-hidden>·</span>
        <time dateTime={p.createdAt.toISOString()}>{timeAgo(p.createdAt)}</time>
      </div>
      <h3 className="serif mt-1.5 text-xl font-bold leading-snug">
        <Link href={`/posts/${p.id}`} className="hover:text-teal">
          {p.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-[0.95rem] text-mute">{excerpt(p.body)}</p>
      <p className="mt-2 text-sm text-mute">
        나도 {p._count.reactions} · 댓글 {p._count.comments}
      </p>
    </li>
  );
}
