import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-10 text-center">
      <h1 className="serif text-2xl font-bold">이 글은 없거나, 가려졌어요.</h1>
      <p className="text-sm text-mute">신고로 숨겨졌거나 주소가 틀렸을 수 있어요.</p>
      <Link href="/" className="btn btn-quiet">
        처음으로
      </Link>
    </div>
  );
}
