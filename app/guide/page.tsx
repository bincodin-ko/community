export const metadata = { title: "커뮤니티 약속" };

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "온다";

export default function GuidePage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="serif text-3xl font-bold">커뮤니티 약속</h1>
        <p className="mt-2 max-w-prose text-mute">
          {APP}는 규칙이 많은 곳이 아니라, 약속이 분명한 곳이에요. 아래 다섯 가지는 타협하지 않아요.
        </p>
      </header>

      <section className="space-y-6">
        <Rule title="여기는 만남 앱이 아니에요">
          만남·성적 목적의 글과 댓글, 사진 요구, 연락처 교환 유도는 지웁니다. 연애 이야기는 환영하지만, 상대를 찾는 글은 아니에요.
          그런 곳은 이미 충분히 많고, 그 곳들이 못 주는 걸 우리는 주고 싶어요.
        </Rule>
        <Rule title="누구의 신상도 말하지 않아요">
          이름, 학교·회사, 사진, SNS 계정, 사는 동네 등 사람을 특정할 수 있는 정보는 본인 것이라도 올리지 마세요. 타인의 것이면 즉시 삭제하고
          영구 정지합니다. 아웃팅은 이 커뮤니티에서 가장 무거운 위반이에요.
        </Rule>
        <Rule title="욕망의 순위표를 만들지 않아요">
          외모·몸·나이·스펙으로 사람을 줄 세우는 말, "게이답다/답지 않다"는 말은 여기서 힘을 잃어요. 우리가 벗어나려는 게 바로 그거니까요.
        </Rule>
        <Rule title="다른 결정을 존중해요">
          커밍아웃을 했든 안 했든, 결혼을 했든 안 했든, 종교가 있든 없든. 먼저 지나간 사람의 이야기는 정답이 아니라 참고예요.
        </Rule>
        <Rule title="신고는 3건이면 자동으로 가려져요">
          신고가 3건에 이르면 글이 자동으로 숨겨지고 운영자가 24시간 안에 확인해요. 신고를 무기로 쓰는 계정도 똑같이 제재합니다.
        </Rule>
      </section>

      <section className="space-y-3 border-t border-line pt-8">
        <h2 className="serif text-xl font-bold">우리가 당신에 대해 모르는 것들</h2>
        <p className="max-w-prose text-mute">
          이메일, 전화번호, 실명, 사진, IP 원문. 받지도 않고 저장하지도 않아요. 가입 첫 하루는 글 1개·댓글 5개로 제한되고, 탈퇴는 누르는 즉시
          처리돼요. 성적 지향은 법이 정한 민감정보이며, 우리는 그것을 "이 사이트의 회원이다"라는 사실 이상으로 다루지 않아요.
        </p>
      </section>

      <section className="space-y-3 border-t border-line pt-8">
        <h2 className="serif text-xl font-bold">힘든 밤이라면</h2>
        <ul className="space-y-1 text-mute">
          <li>자살예방상담전화 109 (24시간)</li>
          <li>청소년 성소수자 위기지원센터 띵동 02-924-1224</li>
          <li>한국게이인권운동단체 친구사이 상담 — chingusai.net</li>
          <li>성소수자부모모임 — pflagkorea.org</li>
        </ul>
      </section>
    </div>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="serif text-xl font-bold">{title}</h2>
      <p className="mt-1.5 max-w-prose text-mute">{children}</p>
    </div>
  );
}
