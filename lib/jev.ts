// Jev (TypeSafe AI System One) 클라이언트 — 텍스트를 생성하지 않는 결정 모델.
// 원칙: "Code owns the loop." 여기서는 질문만 하고, 임계치·실행·실패 정책은 호출하는 코드가 가진다.
// 키가 없거나 장애가 나면 null을 돌려주고(fail-open), 호출자는 규칙 기반 검사만으로 진행한다.

export type ChoiceQuestion = { type: "choice"; instructions: string; criteria: Record<string, string | null> };
export type NoulQuestion = { type: "noul"; instructions: string };
export type JevQuestion = ChoiceQuestion | NoulQuestion;

export type ChoiceAnswer = { choice: string; probabilities: Record<string, number>; confidence: number };
export type NoulAnswer = { noul: number };
export type JevAnswers = Record<string, ChoiceAnswer | NoulAnswer>;

type Provider = { url: string; model: string; key: string };

function provider(): Provider | null {
  const base = process.env.JEV_BASE_URL; // 테스트용 가짜 서버 또는 게이트웨이
  const tsKey = process.env.TYPESAFE_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (base) return { url: base.replace(/\/$/, ""), model: process.env.JEV_MODEL ?? "jev-latest", key: tsKey ?? orKey ?? "test" };
  if (tsKey) return { url: "https://api.typesafe.ai/v1/systemone", model: "jev-latest", key: tsKey };
  if (orKey) return { url: "https://openrouter.ai/api/alpha/decisions", model: "~typesafe/jev-latest", key: orKey };
  return null;
}

export function jevEnabled(): boolean {
  return provider() !== null;
}

// 응답 필드 이름이 게이트웨이마다 조금 다를 수 있어 방어적으로 읽는다.
function normalize(raw: unknown): JevAnswers {
  const out: JevAnswers = {};
  const answers = (raw as { answers?: Record<string, Record<string, unknown>> })?.answers ?? {};
  for (const [name, a] of Object.entries(answers)) {
    if (typeof a?.choice === "string") {
      out[name] = {
        choice: a.choice,
        probabilities: (a.probabilities as Record<string, number>) ?? {},
        confidence: typeof a.confidence === "number" ? a.confidence : 0,
      };
    } else {
      const v = [a?.noul, a?.value, a?.probability].find((x) => typeof x === "number");
      if (typeof v === "number") out[name] = { noul: v };
    }
  }
  return out;
}

export async function askJev(
  state: string | Record<string, unknown>,
  questions: Record<string, JevQuestion>,
  opts: { timeoutMs?: number } = {},
): Promise<JevAnswers | null> {
  const p = provider();
  if (!p) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 3000);
  try {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: p.model, state, questions }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[jev] http ${res.status}`);
      return null;
    }
    return normalize(await res.json());
  } catch (e) {
    console.warn(`[jev] ${e instanceof Error ? e.name : "error"}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ---------- 온다 전용 모더레이션 ----------

export const MOD_CATEGORIES = {
  ok: "커뮤니티 약속을 지키는 평범한 이야기, 고민, 질문, 감정 표현",
  outing: "특정 개인을 식별할 수 있는 정보(실명, 학교·회사명과 결합된 특징, 전화번호, 이메일, SNS 계정, 사진 링크, 사는 동네와 직업의 조합)를 본인 동의 없이 드러냄",
  hate: "성소수자·여성·장애·인종·종교·지역 등에 대한 혐오, 모욕, 괴롭힘, 위협",
  sexual_or_hookup: "성행위 묘사, 만남·섹스 상대 구하기, 사진·연락처 교환 유도, 위치 기반 만남 요청",
  spam: "광고, 업소·마사지·호스트바 홍보, 외부 링크 유도, 반복 도배, 의미 없는 글",
} as const;

export type ModCategory = keyof typeof MOD_CATEGORIES;

export type ModerationResult = {
  source: "jev" | "rules" | "none";
  block: number; // 차단해야 할 확률
  category: ModCategory;
  confidence: number;
  crisis: number; // 자해·자살 위험 신호 확률
  topic?: { choice: string; confidence: number };
};

export const BLOCK_THRESHOLD = 0.85;
export const FLAG_THRESHOLD = 0.55;
export const CRISIS_THRESHOLD = 0.6;

// 규칙 기반: Jev와 무관하게 항상 동작하는 신상 노출 패턴
const PII_PATTERNS: RegExp[] = [
  /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/, // 휴대폰
  /[\w.+-]+@[\w-]+\.[\w.]+/, // 이메일
  /(?:instagram\.com|insta:|인스타\s*[:@]|@[a-z0-9_.]{4,})/i, // SNS 핸들
  /(?:카톡|카카오톡|오픈채팅|open\.kakao\.com)\s*[:\s]?\s*[a-z0-9_]{3,}/i,
  /https?:\/\/\S+/i,
];

export function rulesFlagPII(text: string): boolean {
  return PII_PATTERNS.some((r) => r.test(text));
}

export async function moderateText(text: string, kind: "post" | "comment", topics: string[]): Promise<ModerationResult> {
  const pii = rulesFlagPII(text);
  const base: ModerationResult = {
    source: pii ? "rules" : "none",
    block: pii ? 0.7 : 0,
    category: pii ? "outing" : "ok",
    confidence: pii ? 0.9 : 0,
    crisis: 0,
  };

  const state = {
    community_rules:
      "한국 2030 게이 남성을 위한 텍스트 커뮤니티. 만남·성적 목적 금지, 타인 신상 노출(아웃팅) 금지, 혐오·괴롭힘 금지, 광고 금지. 연애·성정체성·커밍아웃·가족·군대·회사 이야기와 고민, 욕설이 섞인 감정 표현은 허용.",
    kind,
    text: text.slice(0, 6000),
  };
  const questions: Record<string, JevQuestion> = {
    block: { type: "noul", instructions: "`text`는 `community_rules`를 위반하여 게시를 차단해야 한다. 단순히 거칠거나 슬픈 글은 위반이 아니다." },
    category: { type: "choice", instructions: "`text`에 가장 잘 맞는 분류를 고른다.", criteria: { ...MOD_CATEGORIES } },
    crisis: { type: "noul", instructions: "`text`의 작성자가 자해·자살을 생각하거나 계획하고 있다는 신호가 있다." },
  };
  if (kind === "post" && topics.length) {
    questions.topic = {
      type: "choice",
      instructions: "`text`가 속하는 주제를 고른다.",
      criteria: Object.fromEntries(topics.map((t) => [t, null])),
    };
  }

  const a = await askJev(state, questions);
  if (!a) return base;

  const block = (a.block as NoulAnswer | undefined)?.noul ?? 0;
  const cat = a.category as ChoiceAnswer | undefined;
  const crisis = (a.crisis as NoulAnswer | undefined)?.noul ?? 0;
  const topic = a.topic as ChoiceAnswer | undefined;
  const category = (cat?.choice as ModCategory) ?? base.category;

  return {
    source: "jev",
    block: Math.max(block, base.block),
    category: pii && category === "ok" ? "outing" : category,
    confidence: cat?.confidence ?? 0,
    crisis,
    topic: topic ? { choice: topic.choice, confidence: topic.confidence } : undefined,
  };
}

export function blockMessage(category: ModCategory): string {
  switch (category) {
    case "outing":
      return "특정인을 알아볼 수 있는 정보(연락처, 계정, 학교·회사와 결합된 특징 등)가 들어 있는 것 같아요. 그 부분을 지우고 다시 올려 주세요.";
    case "sexual_or_hookup":
      return "여기는 만남 앱이 아니에요. 만남·성적 목적의 글은 올릴 수 없어요.";
    case "hate":
      return "혐오·괴롭힘으로 읽힐 수 있는 표현이 있어요. 다른 사람을 향한 부분을 고쳐 주세요.";
    case "spam":
      return "광고나 외부 링크 유도로 보여요.";
    default:
      return "커뮤니티 약속에 맞지 않는 글로 판단됐어요. 다시 읽어보고 고쳐 주세요.";
  }
}
