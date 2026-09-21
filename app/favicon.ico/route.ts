// 브라우저가 기본으로 요청하는 /favicon.ico 에 SVG 아이콘을 돌려준다 (404 콘솔 오류 방지).
import { NextResponse } from "next/server";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f6f6d"/><circle cx="32" cy="40" r="14" fill="#f2b84b"/><rect x="8" y="40" width="48" height="16" fill="#2f6f6d"/></svg>`;

export function GET() {
  return new NextResponse(SVG, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
