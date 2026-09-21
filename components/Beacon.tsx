"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 화면이 열렸다는 사실 하나만 서버에 알린다. 쿠키도, 식별자도, 체류 시간도 보내지 않는다.
 * 보내는 값은 경로와 (외부에서 왔다면) 유입 호스트뿐이고, 서버가 그마저도 미리 정한 목록으로 접는다.
 * Do Not Track 을 켠 브라우저에서는 아무것도 보내지 않는다.
 */
export function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      (navigator.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1")
    )
      return;
    const body = JSON.stringify({ path: pathname, ref: document.referrer || null });
    const send = () => {
      // keepalive 로 화면을 떠나도 전송이 끊기지 않는다. 실패는 그냥 버린다.
      void fetch("/api/hit", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    };
    const t = setTimeout(send, 400); // 곧바로 떠난 방문은 세지 않는다
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
