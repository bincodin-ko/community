#!/usr/bin/env node
// 운영자 승격 — 시드가 권한을 주지 않으므로 여기서만 준다.
// 사용: node scripts/grant-mod.mjs <닉네임> [moderator|admin]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const [nickname, role = "moderator"] = process.argv.slice(2);
if (!nickname || !["moderator", "admin", "member"].includes(role)) {
  console.error("사용법: node scripts/grant-mod.mjs <닉네임> [moderator|admin|member]");
  process.exit(1);
}
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { nickname }, select: { id: true, status: true } });
if (!user || user.status !== "active") {
  console.error(`활동 중인 사용자를 찾지 못했습니다: ${nickname}`);
  await prisma.$disconnect();
  process.exit(1);
}
await prisma.user.update({ where: { id: user.id }, data: { role } });
await prisma.$disconnect();
console.log(`${nickname} → ${role}`);
