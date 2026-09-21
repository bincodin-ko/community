// 신상 노출 패턴 — 서버(lib/jev.ts)와 브라우저(components/PiiWarning.tsx)가 같은 규칙을 쓴다.
// 브라우저에서는 "보내기 전 경고"로만 쓰고 차단하지 않는다. 차단 판정은 서버가 한다.
// 다음 단계: Transformers.js + kor_unsmile ONNX 로 맥락 판단을 더하는 것 (docs/07 §1).

export type PiiHit = { kind: string; label: string };

export const PII_RULES: Array<{ kind: string; label: string; re: RegExp }> = [
  { kind: "phone", label: "전화번호", re: /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/ },
  { kind: "email", label: "이메일 주소", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { kind: "handle", label: "SNS 계정", re: /(?:instagram\.com|insta:|인스타\s*[:@]|@[a-z0-9_.]{4,})/i },
  {
    kind: "kakao",
    label: "카카오톡 아이디",
    re: /(?:카톡|카카오톡|오픈채팅|open\.kakao\.com)\s*[:\s]?\s*[a-z0-9_]{3,}/i,
  },
  { kind: "url", label: "링크", re: /https?:\/\/\S+/i },
];

export function findPii(text: string): PiiHit[] {
  return PII_RULES.filter((r) => r.re.test(text)).map(({ kind, label }) => ({ kind, label }));
}

export function hasPii(text: string): boolean {
  return PII_RULES.some((r) => r.re.test(text));
}
