import Link from "next/link";
import { TOPICS } from "@/lib/topics";

export function TopicTabs({ current }: { current?: string }) {
  const base = "rounded-full px-3 py-1.5 text-sm border transition-colors";
  const on = "border-teal bg-teal text-paper";
  const off = "border-line text-mute hover:text-ink hover:border-ink";
  return (
    <nav aria-label="주제" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2 pb-1">
        <li>
          <Link href="/" className={`${base} ${!current ? on : off}`}>
            전체
          </Link>
        </li>
        {TOPICS.map((t) => (
          <li key={t.slug}>
            <Link href={`/?topic=${t.slug}`} className={`${base} ${current === t.slug ? on : off}`} title={t.hint}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
