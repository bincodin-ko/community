import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { deleteAccountAction } from "@/lib/actions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");
  return (
    <div className="mx-auto max-w-md space-y-8">
      <header>
        <h1 className="serif text-3xl font-bold">{user.nickname}</h1>
        <p className="mt-1 text-sm text-mute">
          {user.birthYear}년생 · {user.createdAt.toLocaleDateString("ko-KR")}부터
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">우리가 가진 당신의 정보</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-mute">
          <li>닉네임, 비밀번호 해시, 출생연도</li>
          <li>당신이 쓴 글·댓글·"나도"·신고</li>
          <li>그 외에는 없어요. 이메일·전화번호·IP 원문·사진을 저장하지 않아요.</li>
        </ul>
      </section>

      <section className="space-y-3 border-t border-line pt-6">
        <h2 className="font-semibold">탈퇴</h2>
        <p className="text-sm text-mute">
          누르는 즉시 처리돼요. 남긴 글과 댓글은 지워지지 않고 '탈퇴한 사용자'로 남아요. 다른 사람의 대화 맥락을 지키기
          위해서예요.
        </p>
        <form action={deleteAccountAction}>
          <DeleteAccountButton />
        </form>
      </section>
    </div>
  );
}
