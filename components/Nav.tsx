import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export function Nav({ user, appName }: { user: SessionUser | null; appName: string }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="serif text-2xl font-bold tracking-tight text-ink">
          {appName}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/mindset" className="text-mute hover:text-ink">
            마인드셋
          </Link>
          <Link href="/guide" className="text-mute hover:text-ink">
            약속
          </Link>
          {user ? (
            <>
              {user.role === "moderator" || user.role === "admin" ? (
                <>
                  <Link href="/mod" className="text-mute hover:text-ink">
                    검토
                  </Link>
                  <Link href="/mod/stats" className="text-mute hover:text-ink">
                    지표
                  </Link>
                </>
              ) : null}
              <Link href="/write" className="btn btn-primary">
                글 쓰기
              </Link>
              <Link href="/settings" className="text-mute hover:text-ink" aria-label="설정">
                {user.nickname}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-mute hover:text-ink">
                  나가기
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-mute hover:text-ink">
                들어오기
              </Link>
              <Link href="/join" className="btn btn-primary">
                시작하기
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
