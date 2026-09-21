import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Beacon } from "@/components/Beacon";
import { getSessionUser } from "@/lib/auth";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "온다";

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: "만남 앱이 아니라, 게이로 사는 마음을 이야기하는 곳. 한국 2030 게이를 위한 텍스트 우선 익명 커뮤니티.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const analyticsSrc = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* 쿠키 없는 분석(Plausible·Umami 등)을 쓸 때만 켜진다. 기본은 꺼져 있고, 개인 식별자는 넘기지 않는다. */}
        {analyticsSrc ? (
          <script defer src={analyticsSrc} data-domain={process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN} />
        ) : null}
        {process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "1" ? null : <Beacon />}
        <Nav user={user} appName={APP} />
        <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-24 sm:pt-10">{children}</main>
        <footer className="mx-auto w-full max-w-2xl px-4 pb-10 text-sm text-mute">
          <p>
            {APP}는 실명·이메일·전화번호·사진을 요구하지 않습니다. 성적 지향은 민감정보이며, 우리는 그것을 최소한으로만
            다룹니다.
          </p>
          <p className="mt-2">힘든 밤이라면 — 자살예방상담 109 · 청소년 성소수자 위기지원 띵동 02-924-1224</p>
        </footer>
      </body>
    </html>
  );
}
