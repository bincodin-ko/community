/**
 * 주제별 글 수 — 크기 비교이므로 단색(틸) 막대에 값을 직접 라벨한다. 범례도 색 구분도 필요 없다.
 * 서버 컴포넌트다. 막대마다 <title> 로 기본 호버를 둔다.
 */
export function TopicBars({ data }: { data: Array<{ slug: string; label: string; posts: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.posts));
  return (
    <figure className="space-y-2">
      <h3 className="serif text-lg font-bold">최근 30일 주제별 글</h3>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.slug} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 text-mute">{d.label}</span>
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2.5 flex-1" role="presentation">
              {/* 0건은 막대를 그리지 않는다. 얇은 조각은 "조금 있음"으로 읽힌다. */}
              {d.posts > 0 ? (
                <rect x="0" y="0" width={(d.posts / max) * 100} height="10" rx="2" fill="var(--teal)">
                  <title>{`${d.label} ${d.posts}건`}</title>
                </rect>
              ) : null}
            </svg>
            <span className="w-8 shrink-0 text-right text-ink tabular-nums">{d.posts}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
