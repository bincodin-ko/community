import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "onda_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

// .env.example 에 들어 있는 값들 — 그대로 배포되면 누구나 세션을 위조할 수 있다.
const PLACEHOLDER_SECRETS = new Set(["change-me-to-a-long-random-string", "ci-only-session-secret-not-for-production"]);

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET 환경변수를 32자 이상으로 설정하세요: openssl rand -base64 48");
  }
  if (PLACEHOLDER_SECRETS.has(s) && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET 이 예시 값 그대로입니다. openssl rand -base64 48 로 새로 만드세요.");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  nickname: string;
  birthYear: number;
  role: string;
  createdAt: Date;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const id = payload.sub;
    if (!id) return null;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, nickname: true, birthYear: true, role: true, createdAt: true, status: true },
    });
    if (!user || user.status !== "active") return null;
    const { status: _status, ...rest } = user;
    return rest;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return user;
}
