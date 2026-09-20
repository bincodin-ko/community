"use client";

export function DeleteAccountButton() {
  return (
    <button
      type="submit"
      className="btn btn-quiet hover:!border-rose hover:!text-rose"
      onClick={(e) => {
        if (!confirm("정말 탈퇴할까요? 되돌릴 수 없어요.")) e.preventDefault();
      }}
    >
      지금 탈퇴하기
    </button>
  );
}
