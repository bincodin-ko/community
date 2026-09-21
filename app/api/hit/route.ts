/**
 * 조회 집계 수신 — 같은 출처에서 온 요청만, 정규화된 경로만, 하루 단위 합계만 올린다.
 * 요청의 IP·User-Agent·쿠키는 읽지도 저장하지도 않는다.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePath, normalizeReferrer } from "@/lib/analytics";
import { todayKST } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 같은 출처에서 온 요청만 받는다. 외부에서 숫자를 부풀리기 어렵게 하는 최소한의 벽이다.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") ?? "";
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    if (originHost !== host) return new NextResponse(null, { status: 204 });
  }

  let body: { path?: unknown; ref?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = typeof body.path === "string" ? normalizePath(body.path) : null;
  if (!path) return new NextResponse(null, { status: 204 });
  const date = todayKST();
  const refHost = typeof body.ref === "string" ? normalizeReferrer(body.ref, host.split(":")[0]) : null;

  try {
    await prisma.pageDay.upsert({
      where: { date_path: { date, path } },
      update: { views: { increment: 1 } },
      create: { date, path, views: 1 },
    });
    if (refHost) {
      await prisma.refDay.upsert({
        where: { date_host: { date, host: refHost } },
        update: { views: { increment: 1 } },
        create: { date, host: refHost, views: 1 },
      });
    }
  } catch {
    // 집계 실패가 사용자 경험을 막지 않는다
  }
  return new NextResponse(null, { status: 204 });
}
