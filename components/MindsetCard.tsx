import Link from "next/link";

export type MindsetView = { date: string; quote: string; question: string; source: string | null };

// 이 페이지에서 유일하게 큰 목소리를 내는 요소. 나머지는 조용히.
export function MindsetCard({ m, compact = false }: { m: MindsetView; compact?: boolean }) {
  return (
    <section aria-label="오늘의 마인드셋" className="rounded-2xl bg-amber-soft px-6 py-7 sm:px-8 sm:py-9">
      <p className="text-sm text-mute">{formatDate(m.date)}의 마인드셋</p>
      <blockquote
        className={`serif mt-3 leading-snug font-bold text-ink ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}
      >
        {m.quote}
      </blockquote>
      <p className="mt-4 text-ink">{m.question}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/write?topic=mind&prompt=${encodeURIComponent(m.question)}`} className="btn btn-primary">
          이 질문에 답하기
        </Link>
        {m.source ? <span className="text-mute">영감: {m.source}</span> : null}
      </div>
    </section>
  );
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}년 ${m}월 ${day}일`;
}
