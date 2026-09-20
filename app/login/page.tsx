import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/Forms";

export const metadata = { title: "들어오기" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="serif text-3xl font-bold">다시 왔네요</h1>
      <LoginForm />
      <p className="text-sm text-mute">
        처음이라면{" "}
        <Link href="/join" className="text-teal underline underline-offset-4">
          닉네임 하나로 시작하기
        </Link>
      </p>
    </div>
  );
}
