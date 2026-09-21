import { prisma } from "@/lib/db";
import { todayKST } from "@/lib/format";
import { MindsetCard } from "@/components/MindsetCard";

export const metadata = { title: "마인드셋" };
export const dynamic = "force-dynamic";

export default async function MindsetPage() {
  const list = await prisma.mindset.findMany({
    where: { date: { lte: todayKST() } },
    orderBy: { date: "desc" },
    take: 60,
  });
  return (
    <div className="space-y-8">
      <header>
        <h1 className="serif text-3xl font-bold">마인드셋</h1>
        <p className="mt-2 max-w-prose text-mute">
          하루 한 문장. 수치심은 내 안에서 자란 게 아니라 밖에서 들어온 거라는 걸, 매일 조금씩 다시 기억하기 위해서.
        </p>
      </header>
      <div className="space-y-4">
        {list.map((m) => (
          <MindsetCard key={m.id} m={m} compact />
        ))}
      </div>
    </div>
  );
}
