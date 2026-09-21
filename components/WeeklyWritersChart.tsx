"use client";

import { useState } from "react";

export type WeekDatum = { label: string; writers: number; posts: number; comments: number };

/**
 * 주간 작성자 추이 — 한 계열이므로 범례 없이 제목이 계열을 말한다.
 * 데이터 마크는 틸 단색만 쓴다(밝은 배경·어두운 배경 모두 대비 3:1 이상 통과).
 * 표 보기를 함께 둬서 색과 위치에만 기대지 않는다.
 */
export function WeeklyWritersChart({ data }: { data: WeekDatum[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const W = 720;
  const H = 180;
  const padL = 34;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const max = Math.max(4, ...data.map((d) => d.writers));
  const stepX = data.length > 1 ? (W - padL - padR) / (data.length - 1) : 0;
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.writers).toFixed(1)}`).join(" ");
  const active = hover === null ? data.length - 1 : hover;

  if (asTable) {
    return (
      <figure className="space-y-2">
        <Caption onToggle={() => setAsTable(false)} label="그래프로 보기" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-mute">
              <th className="py-1 font-medium">주 시작</th>
              <th className="py-1 text-right font-medium">작성자</th>
              <th className="py-1 text-right font-medium">글</th>
              <th className="py-1 text-right font-medium">댓글</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-line last:border-0">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{d.writers}</td>
                <td className="py-1 text-right text-mute tabular-nums">{d.posts}</td>
                <td className="py-1 text-right text-mute tabular-nums">{d.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    );
  }

  return (
    <figure className="space-y-2">
      <Caption onToggle={() => setAsTable(true)} label="표로 보기" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        role="img"
        aria-label={`최근 ${data.length}주 주간 작성자 수. 가장 최근 주 ${data[data.length - 1]?.writers ?? 0}명.`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--mute)">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % 2 === 0 || i === data.length - 1 ? (
            <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mute)">
              {d.label}
            </text>
          ) : null,
        )}

        <path d={path} fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={x(i)}
            cy={y(d.writers)}
            r={i === active ? 5 : 4}
            fill="var(--teal)"
            stroke="var(--paper)"
            strokeWidth="2"
          />
        ))}

        {hover !== null ? (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--line)" strokeWidth="1" />
        ) : null}

        <text
          x={x(data.length - 1)}
          y={y(data[data.length - 1]?.writers ?? 0) - 12}
          textAnchor="end"
          fontSize="12"
          fill="var(--ink)"
          fontWeight="600"
        >
          {data[data.length - 1]?.writers ?? 0}명
        </text>

        {data.map((d, i) => (
          <rect
            key={`hit-${d.label}`}
            x={x(i) - stepX / 2}
            y={0}
            width={Math.max(stepX, 12)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          >
            <title>{`${d.label} 주 · 작성자 ${d.writers}명 · 글 ${d.posts} · 댓글 ${d.comments}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="text-sm text-mute">
        {data[active]?.label} 주 · 작성자 <span className="text-ink tabular-nums">{data[active]?.writers ?? 0}</span>명
        · 글 {data[active]?.posts ?? 0} · 댓글 {data[active]?.comments ?? 0}
      </figcaption>
    </figure>
  );
}

function Caption({ onToggle, label }: { onToggle: () => void; label: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="serif text-lg font-bold">주간 작성자 수</h3>
      <button
        type="button"
        onClick={onToggle}
        className="text-sm text-mute underline underline-offset-4 hover:text-ink"
      >
        {label}
      </button>
    </div>
  );
}
