/**
 * 자체 집계 조회수 — 제3자 분석 도구도, 쿠키도, 방문자 식별자도 없다.
 *
 * 저장하는 것: (날짜, 정규화된 경로, 횟수) 와 (날짜, 유입 호스트, 횟수).
 * 저장하지 않는 것: IP, 쿠키, 세션, 사용자 ID, 전체 URL, 쿼리스트링, User-Agent, 체류 시간.
 *
 * 그래서 "순 방문자 수"는 알 수 없다. 알 수 있는 방법이 방문자마다 식별자를 만드는 것뿐이고,
 * 그건 우리가 하지 않기로 한 일이다. 조회수는 정확한 값이 아니라 방향을 보는 숫자다.
 */
import { TOPIC_SLUGS } from "./topics";

/** 경로를 미리 정한 목록으로만 접는다. 임의 문자열이 행을 무한히 늘리지 못하게 한다. */
export function normalizePath(raw: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(raw, "http://x").pathname;
  } catch {
    return null;
  }
  if (pathname.length > 200) return null;
  if (pathname === "/") return "/";
  for (const fixed of ["/guide", "/mindset", "/join", "/login", "/write", "/settings"]) {
    if (pathname === fixed) return fixed;
  }
  const topic = /^\/t\/([a-z]+)$/.exec(pathname);
  if (topic && (TOPIC_SLUGS as readonly string[]).includes(topic[1])) return `/t/${topic[1]}`;
  if (/^\/posts\/[a-z0-9]+$/.test(pathname)) return "/posts/:id"; // 개별 글은 묶는다
  if (/^\/mindset\/\d{4}-\d{2}-\d{2}$/.test(pathname)) return "/mindset/:date";
  return null; // 운영자 화면(/mod…)을 포함해 나머지는 아예 세지 않는다
}

/** 유입 출처는 호스트명만 남긴다. 우리 사이트 안에서의 이동은 세지 않는다. */
export function normalizeReferrer(raw: string | null | undefined, selfHost: string): string | null {
  if (!raw) return null;
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host || host.length > 100) return null;
  if (host === selfHost.toLowerCase().replace(/^www\./, "")) return null;
  return host;
}

export const PATH_LABELS: Record<string, string> = {
  "/": "홈",
  "/guide": "커뮤니티 약속",
  "/mindset": "마인드셋 모음",
  "/mindset/:date": "마인드셋 공유",
  "/posts/:id": "글 상세",
  "/join": "시작하기",
  "/login": "들어오기",
  "/write": "글 쓰기",
  "/settings": "설정",
  ...Object.fromEntries(TOPIC_SLUGS.map((s) => [`/t/${s}`, `주제 · ${s}`])),
};
