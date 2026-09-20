import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PostForm } from "@/components/Forms";

export const metadata = { title: "글 쓰기" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ topic?: string; prompt?: string }> }) {
  const user = await getSessionUser();
  const sp = await searchParams;
  if (!user) redirect(`/login?next=/write${sp.topic ? `?topic=${sp.topic}` : ""}`);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="serif text-3xl font-bold">이야기 올리기</h1>
        <p className="mt-2 text-sm text-mute">
          만남·성적 목적의 글, 누군가의 신상이 드러나는 글은 올릴 수 없어요. 그 외에는 무엇이든.
        </p>
      </header>
      <PostForm defaultTopic={sp.topic} prompt={sp.prompt} />
    </div>
  );
}
