import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { JoinForm } from "@/components/Forms";

export const metadata = { title: "시작하기" };

export default async function JoinPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="serif text-3xl font-bold">닉네임 하나로 시작해요</h1>
        <p className="mt-2 text-sm text-mute">
          이메일도, 전화번호도, 사진도 받지 않아요. 비밀번호를 잊으면 복구할 방법이 없으니 잘 적어두세요 — 그게 우리가
          당신을 모르는 대가예요.
        </p>
      </header>
      <JoinForm />
      <p className="text-sm text-mute">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-teal underline underline-offset-4">
          들어오기
        </Link>
      </p>
    </div>
  );
}
