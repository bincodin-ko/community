// 2차 의견 — 허깅페이스 한국어 혐오 분류기(kor_unsmile 계열)를 HTTP 로 호출한다.
// HF Inference API 형식({inputs}) 또는 자체 서빙(scripts/ml/unsmile_server.py) 둘 다 지원. 없으면 null (fail-open).
// 결정에는 쓰지 않고, 검토 큐 우선순위와 Jev 결과 교차 확인에만 쓴다 (docs/07 §2 참고: 자기 서술 오탐 위험).

export type HfLabel = { label: string; score: number };

export async function hfSecondOpinion(
  text: string,
): Promise<{ lgbtHate: number; anyHate: number; labels: HfLabel[] } | null> {
  const url = process.env.HF_MODERATION_URL;
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}),
      },
      body: JSON.stringify({ inputs: text.slice(0, 2000) }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const raw = (await res.json()) as HfLabel[] | HfLabel[][];
    const labels = (Array.isArray(raw[0]) ? (raw as HfLabel[][])[0] : (raw as HfLabel[])) ?? [];
    const get = (re: RegExp) => labels.filter((l) => re.test(l.label)).reduce((m, l) => Math.max(m, l.score), 0);
    return { lgbtHate: get(/성소수자|lgbt/i), anyHate: get(/혐오|욕설|악플|hate|offensive/i), labels };
  } catch {
    return null;
  }
}
