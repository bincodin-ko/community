import { toggleReactionAction } from "@/lib/actions";

export function ReactionButton({
  postId,
  count,
  active,
  loggedIn,
}: {
  postId: string;
  count: number;
  active: boolean;
  loggedIn: boolean;
}) {
  const action = toggleReactionAction.bind(null, postId);
  return (
    <form action={action}>
      <button
        type="submit"
        className={`btn ${active ? "btn-primary" : "btn-quiet"}`}
        aria-pressed={active}
        title={loggedIn ? "나도 그랬어요" : "로그인하면 누를 수 있어요"}
      >
        나도 <span className="tabular-nums">{count}</span>
      </button>
    </form>
  );
}
