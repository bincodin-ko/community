// "비슷한 이야기" — 모델 없이도 동작하는 문자 바이그램 Jaccard 유사도.
// EMBEDDINGS_URL 이 설정되면(KURE/BGE-m3-ko 서빙) 임베딩 코사인으로 교체된다. 글 ↔ 글에만 쓴다. 사용자 매칭에는 쓰지 않는다.

const STOP = /[\s\p{P}\p{S}]/u;

export function bigrams(text: string): Set<string> {
  const t = text.replace(/\s+/g, " ").trim();
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i],
      b = t[i + 1];
    if (STOP.test(a) || STOP.test(b)) continue;
    out.add(a + b);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export type SimilarCandidate = { id: string; title: string; body: string; topic: string };

type EmbedFn = (texts: string[]) => Promise<number[][] | null>;

async function embedViaHttp(texts: string[]): Promise<number[][] | null> {
  const url = process.env.EMBEDDINGS_URL; // 예: 자체 서빙 KURE-v1 (POST {texts} → {embeddings})
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EMBEDDINGS_KEY ? { Authorization: `Bearer ${process.env.EMBEDDINGS_KEY}` } : {}),
      },
      body: JSON.stringify({ texts }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = (await res.json()) as { embeddings?: number[][] };
    return Array.isArray(j.embeddings) ? j.embeddings : null;
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** 후보 중 상위 n개. 임베딩이 있으면 코사인, 없으면 바이그램 Jaccard. 점수 0.08 미만은 버린다. */
export async function findSimilar(
  source: SimilarCandidate,
  candidates: SimilarCandidate[],
  n = 3,
  embed: EmbedFn = embedViaHttp,
): Promise<Array<SimilarCandidate & { score: number }>> {
  const others = candidates.filter((c) => c.id !== source.id);
  if (!others.length) return [];
  const text = (c: SimilarCandidate) => `${c.title}\n${c.body}`.slice(0, 1500);

  const vectors = await embed([text(source), ...others.map(text)]);
  let scored: Array<SimilarCandidate & { score: number }>;
  if (vectors && vectors.length === others.length + 1) {
    scored = others.map((c, i) => ({ ...c, score: cosine(vectors[0], vectors[i + 1]) }));
  } else {
    const src = bigrams(text(source));
    scored = others.map((c) => ({
      ...c,
      score: jaccard(src, bigrams(text(c))) + (c.topic === source.topic ? 0.03 : 0),
    }));
  }
  return scored
    .filter((c) => c.score >= 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
