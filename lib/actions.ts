"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { createSession, destroySession, getSessionUser, requireUser } from "./auth";
import {
  joinSchema,
  loginSchema,
  postSchema,
  commentSchema,
  reportSchema,
  firstError,
  type FormState,
} from "./validation";
import {
  HIDE_THRESHOLD,
  NEW_ACCOUNT_HOURS,
  NEW_ACCOUNT_MAX_COMMENTS,
  NEW_ACCOUNT_MAX_POSTS,
  TOPIC_SLUGS,
} from "./topics";
import { ZodError } from "zod";
import { moderateText, blockMessage, BLOCK_THRESHOLD, FLAG_THRESHOLD, CRISIS_THRESHOLD } from "./jev";

function isNewAccount(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < NEW_ACCOUNT_HOURS * 3600 * 1000;
}

// ---------- 계정 ----------

export async function joinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let data;
  try {
    data = joinSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { error: e instanceof ZodError ? firstError(e) : "입력을 확인해 주세요" };
  }
  const exists = await prisma.user.findUnique({ where: { nickname: data.nickname } });
  if (exists) return { error: "이미 쓰이는 닉네임이에요" };

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { nickname: data.nickname, passwordHash, birthYear: data.birthYear },
  });
  await createSession(user.id);
  redirect("/?welcome=1");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let data;
  try {
    data = loginSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { error: e instanceof ZodError ? firstError(e) : "입력을 확인해 주세요" };
  }
  const user = await prisma.user.findUnique({ where: { nickname: data.nickname } });
  // 닉네임 존재 여부를 노출하지 않는다
  const ok = user && user.status === "active" && (await bcrypt.compare(data.password, user.passwordHash));
  if (!ok) return { error: "닉네임 또는 비밀번호가 맞지 않아요" };
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

// 탈퇴는 즉시. 글은 남되 "탈퇴한 사용자"로 익명화된다 (이반시티의 최대 불만 항목).
export async function deleteAccountAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "deleted",
      nickname: `deleted_${user.id.slice(-8)}`,
      passwordHash: "",
      birthYear: 0,
    },
  });
  await destroySession();
  redirect("/?bye=1");
}

// ---------- 글 ----------

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "로그인이 필요해요" };

  let data;
  try {
    data = postSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { error: e instanceof ZodError ? firstError(e) : "입력을 확인해 주세요" };
  }

  if (isNewAccount(user.createdAt)) {
    const count = await prisma.post.count({
      where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - NEW_ACCOUNT_HOURS * 3600 * 1000) } },
    });
    if (count >= NEW_ACCOUNT_MAX_POSTS) {
      return { error: `가입 첫 ${NEW_ACCOUNT_HOURS}시간에는 글을 ${NEW_ACCOUNT_MAX_POSTS}개까지 쓸 수 있어요. 내일 다시 와 주세요.` };
    }
  }

  // 자동 판정: 규칙(신상 패턴) + Jev. 장애 시 규칙만으로 진행(fail-open).
  const mod = await moderateText(`${data.title}\n\n${data.body}`, "post", [...TOPIC_SLUGS]);
  if (mod.block >= BLOCK_THRESHOLD) return { error: blockMessage(mod.category) };

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      topic: data.topic,
      title: data.title,
      body: data.body,
      anonymous: data.anonymous === "on",
      flagged: mod.block >= FLAG_THRESHOLD,
      modCategory: mod.source === "none" ? null : mod.category,
      modBlock: mod.source === "none" ? null : mod.block,
    },
  });
  revalidatePath("/");
  const care = mod.crisis >= CRISIS_THRESHOLD ? "?care=1" : "";
  redirect(`/posts/${post.id}${care}`);
}

export async function createCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "로그인이 필요해요" };

  let data;
  try {
    data = commentSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { error: e instanceof ZodError ? firstError(e) : "입력을 확인해 주세요" };
  }

  const post = await prisma.post.findUnique({ where: { id: data.postId }, select: { id: true, hidden: true } });
  if (!post || post.hidden) return { error: "댓글을 달 수 없는 글이에요" };

  if (isNewAccount(user.createdAt)) {
    const count = await prisma.comment.count({
      where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - NEW_ACCOUNT_HOURS * 3600 * 1000) } },
    });
    if (count >= NEW_ACCOUNT_MAX_COMMENTS) {
      return { error: `가입 첫 ${NEW_ACCOUNT_HOURS}시간에는 댓글을 ${NEW_ACCOUNT_MAX_COMMENTS}개까지 쓸 수 있어요.` };
    }
  }

  const mod = await moderateText(data.body, "comment", []);
  if (mod.block >= BLOCK_THRESHOLD) return { error: blockMessage(mod.category) };

  await prisma.comment.create({
    data: {
      postId: data.postId,
      authorId: user.id,
      body: data.body,
      anonymous: data.anonymous === "on",
      flagged: mod.block >= FLAG_THRESHOLD,
      modCategory: mod.source === "none" ? null : mod.category,
      modBlock: mod.source === "none" ? null : mod.block,
    },
  });
  revalidatePath(`/posts/${data.postId}`);
  return { ok: true, care: mod.crisis >= CRISIS_THRESHOLD };
}

// "나도" 토글
export async function toggleReactionAction(postId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/posts/${postId}`);
  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await prisma.reaction.findUnique({ where: key });
  if (existing) {
    await prisma.reaction.delete({ where: key });
  } else {
    await prisma.reaction.create({ data: { userId: user.id, postId } });
  }
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
}

// ---------- 신고 ----------

export async function reportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "로그인이 필요해요" };

  let data;
  try {
    data = reportSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { error: e instanceof ZodError ? firstError(e) : "입력을 확인해 주세요" };
  }
  if (!data.postId && !data.commentId) return { error: "신고 대상이 없어요" };

  try {
    await prisma.report.create({
      data: {
        reporterId: user.id,
        postId: data.postId || null,
        commentId: data.commentId || null,
        reason: data.reason,
        detail: data.detail || null,
      },
    });
  } catch {
    return { error: "이미 신고한 글이에요" };
  }

  // 신고 수 증가 + 임계치 자동 숨김. 경합을 피하기 위해 원자적 증가 후 재조회.
  if (data.postId) {
    await prisma.post.update({ where: { id: data.postId }, data: { reportCount: { increment: 1 } } });
    await prisma.post.updateMany({
      where: { id: data.postId, reportCount: { gte: HIDE_THRESHOLD }, hidden: false },
      data: { hidden: true },
    });
    revalidatePath(`/posts/${data.postId}`);
    revalidatePath("/");
  } else if (data.commentId) {
    const c = await prisma.comment.update({
      where: { id: data.commentId },
      data: { reportCount: { increment: 1 } },
      select: { postId: true },
    });
    await prisma.comment.updateMany({
      where: { id: data.commentId, reportCount: { gte: HIDE_THRESHOLD }, hidden: false },
      data: { hidden: true },
    });
    revalidatePath(`/posts/${c.postId}`);
  }
  return { ok: true };
}

// ---------- 운영자 검토 큐 ----------

async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "moderator" && user.role !== "admin") throw new Error("권한이 없어요");
  return user;
}

export async function reviewPostAction(formData: FormData): Promise<void> {
  await requireModerator();
  const id = String(formData.get("id") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  if (!id) return;
  if (verdict === "hide") await prisma.post.update({ where: { id }, data: { hidden: true, flagged: false } });
  else if (verdict === "restore") await prisma.post.update({ where: { id }, data: { hidden: false, flagged: false } });
  else await prisma.post.update({ where: { id }, data: { flagged: false } });
  revalidatePath("/mod");
  revalidatePath("/");
}

export async function reviewCommentAction(formData: FormData): Promise<void> {
  await requireModerator();
  const id = String(formData.get("id") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  if (!id) return;
  if (verdict === "hide") await prisma.comment.update({ where: { id }, data: { hidden: true, flagged: false } });
  else if (verdict === "restore") await prisma.comment.update({ where: { id }, data: { hidden: false, flagged: false } });
  else await prisma.comment.update({ where: { id }, data: { flagged: false } });
  revalidatePath("/mod");
}
