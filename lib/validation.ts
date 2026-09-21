import { z } from "zod";
import { TOPIC_SLUGS, MIN_BIRTH_YEAR_AGE } from "./topics";

const thisYear = new Date().getFullYear();

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상")
  .max(12, "닉네임은 12자 이하")
  .regex(/^[가-힣a-zA-Z0-9_]+$/, "한글·영문·숫자·밑줄만 쓸 수 있어요");

export const joinSchema = z.object({
  nickname: nicknameSchema,
  password: z.string().min(8, "비밀번호는 8자 이상").max(72),
  birthYear: z.coerce
    .number()
    .int()
    .min(1940, "출생연도를 확인해 주세요")
    .max(thisYear - MIN_BIRTH_YEAR_AGE, `만 ${MIN_BIRTH_YEAR_AGE}세 이상만 가입할 수 있어요`),
  agree: z.literal("on", { errorMap: () => ({ message: "커뮤니티 약속에 동의해 주세요" }) }),
});

export const loginSchema = z.object({
  nickname: nicknameSchema,
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export const postSchema = z.object({
  topic: z.enum(TOPIC_SLUGS, { errorMap: () => ({ message: "주제를 골라 주세요" }) }),
  title: z.string().trim().min(2, "제목은 2자 이상").max(80, "제목은 80자 이하"),
  body: z.string().trim().min(10, "본문은 10자 이상").max(5000, "본문은 5000자 이하"),
  anonymous: z.enum(["on"]).optional(),
});

export const commentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().trim().min(1, "내용을 입력해 주세요").max(1000, "댓글은 1000자 이하"),
  anonymous: z.enum(["on"]).optional(),
});

export const reportSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.enum(["outing", "hate", "sexual", "spam", "other"]),
  detail: z.string().trim().max(500).optional(),
});

export type FormState = { error?: string; ok?: boolean; care?: boolean } | undefined;

export function firstError(e: z.ZodError): string {
  return e.errors[0]?.message ?? "입력을 확인해 주세요";
}
