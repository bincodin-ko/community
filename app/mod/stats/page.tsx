import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMetrics } from "@/lib/metrics";
import { UNANSWERED_HOURS } from "@/lib/topics";
import { WeeklyWritersChart } from "@/components/WeeklyWritersChart";
import { TopicBars } from "@/components/TopicBars";

export const metadata = { title: "지표" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mod/stats");
  if (user.role !== "moderator" && user.role !== "admin") redirect("/");

  const m = await getMetrics(12);
  const delta = m.thisWeekWriters - m.lastWeekWriters;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="serif text-3xl font-bold">지표</h1>
        <p className="mt-2 text-sm text-mute">
          우리 DB 에서 직접 계산해요. 외부 분석 도구도, 쿠키도, 개인 식별자도 쓰지 않아요.{" "}
          <Link href="/mod" className="text-teal underline underline-offset-4">
            검토 대기로
          </Link>
        </p>
      </header>

      <section className="space-y-1">
        <p className="text-sm text-mute">이번 주에 말한 사람</p>
        <p className="serif text-5xl font-bold tabular-nums">{m.thisWeekWriters}명</p>
        <p className="text-sm text-mute">
          지난주 {m.lastWeekWriters}명{" "}
          {delta === 0 ? "· 변화 없음" : delta > 0 ? `· ${delta}명 늘었어요` : `· ${-delta}명 줄었어요`}
        </p>
      </section>

      <WeeklyWritersChart
        data={m.weeks.map(({ label, writers, posts, comments }) => ({ label, writers, posts, comments }))}
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile
          label="꾸준히 쓰는 사람"
          value={`${Math.round(m.stickiness.rate * 100)}%`}
          note={`최근 4주 중 2주 이상 쓴 ${m.stickiness.repeat}명 / 한 번이라도 쓴 ${m.stickiness.any}명`}
        />
        <Tile
          label="검토 대기"
          value={`${m.queue.pending}건`}
          note={
            m.queue.oldestPendingHours === null
              ? "밀린 것 없음"
              : `가장 오래된 건 ${Math.floor(m.queue.oldestPendingHours)}시간 전`
          }
          alert={m.queue.oldestPendingHours !== null && m.queue.oldestPendingHours > 24}
        />
        <Tile
          label="답 없는 글"
          value={`${m.unanswered}건`}
          note={`${UNANSWERED_HOURS}시간 넘게 댓글·나도 없음`}
          alert={m.unanswered > 0}
        />
        <Tile label="아웃팅 판정" value={`${m.outingCaught}건`} note="최근 30일, 자동 판정이 잡은 글" />
      </section>

      <TopicBars data={m.topics} />

      <section className="space-y-1 border-t border-line pt-6 text-sm text-mute">
        <p>
          활동 중인 계정 {m.totals.members}명 · 공개된 글 {m.totals.posts}개 · 댓글 {m.totals.comments}개 · 가려진 글{" "}
          {m.queue.hidden}개
        </p>
        <p>목표는 주간 작성자 300명이에요. 읽는 사람이 아니라 말하는 사람을 셉니다.</p>
      </section>
    </div>
  );
}

function Tile({ label, value, note, alert = false }: { label: string; value: string; note: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border border-line p-4 ${alert ? "border-rose" : ""}`}>
      <p className="text-sm text-mute">{label}</p>
      <p className={`serif mt-1 text-2xl font-bold tabular-nums ${alert ? "text-rose" : ""}`}>{value}</p>
      <p className="mt-1 text-xs leading-snug text-mute">{note}</p>
    </div>
  );
}
