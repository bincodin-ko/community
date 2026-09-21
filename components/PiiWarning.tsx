"use client";

import { useEffect, useState } from "react";
import { findPii, type PiiHit } from "@/lib/pii-patterns";

/**
 * 보내기 전 경고 — 글·댓글 입력을 브라우저에서만 검사한다. 서버로 아무것도 보내지 않는다.
 * 차단하지 않는다. 본인 연락처를 본인이 올리는 것도 위험하다는 것을 알려줄 뿐이다.
 */
export function PiiWarning({ formId, fieldNames }: { formId: string; fieldNames: string[] }) {
  const [hits, setHits] = useState<PiiHit[]>([]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const text = fieldNames
          .map((n) => (form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "")
          .join("\n");
        const found = findPii(text);
        setHits((prev) =>
          prev.length === found.length && prev.every((p, i) => p.kind === found[i].kind) ? prev : found,
        );
      }, 400);
    };
    form.addEventListener("input", check);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", check);
    };
  }, [formId, fieldNames]);

  if (!hits.length) return null;
  return (
    <p role="status" className="rounded-xl border border-amber bg-amber-soft px-4 py-3 text-sm">
      {hits.map((h) => h.label).join(", ")}가 들어 있는 것 같아요. 본인 것이라도 남기지 않는 편이 안전해요. 이 검사는
      브라우저에서만 하고 아무 데도 보내지 않아요.
    </p>
  );
}
