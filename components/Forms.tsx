"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinAction, loginAction, createPostAction, createCommentAction, reportAction } from "@/lib/actions";
import { TOPICS, REPORT_REASONS } from "@/lib/topics";
import type { FormState } from "@/lib/validation";
import { PiiWarning } from "./PiiWarning";

function Submit({ children, quiet = false }: { children: React.ReactNode; quiet?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn ${quiet ? "btn-quiet" : "btn-primary"}`}>
      {pending ? "잠시만요…" : children}
    </button>
  );
}

function ErrorLine({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-rose">
      {state.error}
    </p>
  );
}

const thisYear = new Date().getFullYear();

export function JoinForm() {
  const [state, action] = useActionState(joinAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm text-mute">닉네임 (나중에 바꿀 수 있어요)</span>
        <input
          name="nickname"
          className="field mt-1"
          autoComplete="off"
          maxLength={12}
          required
          placeholder="예: 새벽산책"
        />
      </label>
      <label className="block">
        <span className="text-sm text-mute">비밀번호 (8자 이상)</span>
        <input
          name="password"
          type="password"
          className="field mt-1"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm text-mute">출생연도 — 가입 후 바꿀 수 없어요. 나이 사칭을 막기 위해서예요.</span>
        <input
          name="birthYear"
          type="number"
          inputMode="numeric"
          className="field mt-1"
          min={1940}
          max={thisYear - 19}
          placeholder={`${thisYear - 25}`}
          required
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" className="mt-1" required />
        <span>
          <a href="/guide" className="underline decoration-line underline-offset-4 hover:text-teal" target="_blank">
            커뮤니티 약속
          </a>
          을 읽었고 지킬게요. 만남·성적 목적의 글을 올리지 않고, 누구의 신상도 말하지 않아요.
        </span>
      </label>
      <ErrorLine state={state} />
      <Submit>시작하기</Submit>
    </form>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm text-mute">닉네임</span>
        <input name="nickname" className="field mt-1" autoComplete="username" required />
      </label>
      <label className="block">
        <span className="text-sm text-mute">비밀번호</span>
        <input name="password" type="password" className="field mt-1" autoComplete="current-password" required />
      </label>
      <ErrorLine state={state} />
      <Submit>들어오기</Submit>
    </form>
  );
}

export function PostForm({ defaultTopic, prompt }: { defaultTopic?: string; prompt?: string }) {
  const [state, action] = useActionState(createPostAction, undefined);
  return (
    <form action={action} id="post-form" className="space-y-5">
      <PiiWarning formId="post-form" fieldNames={["title", "body"]} />
      <fieldset>
        <legend className="text-sm text-mute">어떤 이야기인가요</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <label key={t.slug} className="cursor-pointer">
              <input
                type="radio"
                name="topic"
                value={t.slug}
                defaultChecked={t.slug === (defaultTopic ?? "mind")}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm text-mute peer-checked:border-teal peer-checked:bg-teal peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-teal">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm text-mute">제목</span>
        <input name="title" className="field serif mt-1 text-lg" maxLength={80} required placeholder="한 줄로" />
      </label>
      <label className="block">
        <span className="text-sm text-mute">본문</span>
        <textarea
          name="body"
          className="field mt-1 min-h-64 leading-relaxed"
          maxLength={5000}
          required
          defaultValue={prompt ? `${prompt}\n\n` : ""}
          placeholder="여기서는 잘 쓰지 않아도 돼요. 있었던 일과 그때의 마음을 그대로."
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" />
        <span>익명으로 올리기 (닉네임 대신 '익명'으로 보여요)</span>
      </label>
      <ErrorLine state={state} />
      <div className="flex items-center gap-3">
        <Submit>글 올리기</Submit>
        <span className="text-sm text-mute">올린 뒤에도 신상이 드러날 것 같으면 언제든 신고로 알려주세요.</span>
      </div>
    </form>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const [state, action] = useActionState(createCommentAction, undefined);
  return (
    <form action={action} id="comment-form" className="space-y-3" key={state?.ok ? String(Date.now()) : "form"}>
      {state?.care ? <CareNote /> : null}
      <PiiWarning formId="comment-form" fieldNames={["body"]} />
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="body"
        className="field min-h-24"
        maxLength={1000}
        required
        placeholder="나도 그랬다고, 혹은 내 경우는 달랐다고."
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="anonymous" />
          <span>익명으로</span>
        </label>
        <Submit>댓글 남기기</Submit>
        <ErrorLine state={state} />
      </div>
    </form>
  );
}

export function ReportForm({ postId, commentId }: { postId?: string; commentId?: string }) {
  const [state, action] = useActionState(reportAction, undefined);
  if (state?.ok) return <p className="text-sm text-mute">신고했어요. 24시간 안에 확인합니다.</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-mute hover:text-rose">신고</summary>
      <form action={action} className="mt-2 space-y-2">
        {postId ? <input type="hidden" name="postId" value={postId} /> : null}
        {commentId ? <input type="hidden" name="commentId" value={commentId} /> : null}
        <select name="reason" className="field" required defaultValue="">
          <option value="" disabled>
            이유를 골라 주세요
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input name="detail" className="field" maxLength={500} placeholder="(선택) 어떤 점이 문제인지" />
        <ErrorLine state={state} />
        <Submit quiet>신고 보내기</Submit>
      </form>
    </details>
  );
}

export function CareNote() {
  return (
    <p className="rounded-xl border border-amber bg-amber-soft px-4 py-3 text-sm">
      많이 힘든 밤인 것 같아요. 여기 사람들이 읽고 있지만, 지금 바로 누군가와 이야기하고 싶다면 자살예방상담
      109(24시간), 띵동 02-924-1224가 있어요.
    </p>
  );
}
