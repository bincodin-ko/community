// 스크립트·훅 공용 Jev 클라이언트 (lib/jev.ts 의 Node 스크립트 버전). 프로바이더 선택과 응답 정규화를 한 곳에 둔다.
export function provider() {
  const base = process.env.JEV_BASE_URL?.replace(/\/$/, "");
  const ts = process.env.TYPESAFE_API_KEY;
  const or = process.env.OPENROUTER_API_KEY;
  if (base) return { url: base, model: process.env.JEV_MODEL ?? "jev-latest", key: ts ?? or ?? "test" };
  if (ts) return { url: "https://api.typesafe.ai/v1/systemone", model: "jev-latest", key: ts };
  if (or) return { url: "https://openrouter.ai/api/alpha/decisions", model: "~typesafe/jev-latest", key: or };
  return null;
}

/** 답이 없거나 오류면 null (fail-open 은 호출자가 결정). usage 는 두 번째 반환값. */
export async function ask(state, questions, { timeoutMs = 8000 } = {}) {
  const p = provider();
  if (!p) return { answers: null, usage: null };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: p.model, state, questions }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { answers: null, usage: null, error: `HTTP ${res.status}` };
    const j = await res.json();
    return { answers: j.answers ?? {}, usage: j.usage ?? null };
  } catch (e) {
    return { answers: null, usage: null, error: String(e?.name ?? e) };
  } finally {
    clearTimeout(t);
  }
}

export const noul = (answers, key) => Number(answers?.[key]?.noul ?? answers?.[key]?.value ?? 0);
