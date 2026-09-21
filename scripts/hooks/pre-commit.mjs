#!/usr/bin/env node
// pre-commit (fail-closed) — 자격증명·개인키·.env 파일, 제품 코드(app/components/lib)의 디버그 잔재를 막는다.
// 커밋 메시지 판정은 메시지가 확정되는 commit-msg 단계(scripts/hooks/commit-msg.mjs)에서 한다.
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const files = git("diff", "--cached", "--name-only", "--diff-filter=ACM").split("\n").filter(Boolean);
if (!files.length) process.exit(0);

const SECRET = [
  [/\bsk-or-v1-[a-f0-9]{32,}/, "OpenRouter 키"],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, "Anthropic 키"],
  [/\bsk-[A-Za-z0-9]{20,}/, "OpenAI 계열 키"],
  [/\bts_[A-Za-z0-9]{16,}/, "TypeSafe 키"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "GitHub 토큰"],
  [/\bxox[abp]-[0-9A-Za-z-]{20,}/, "Slack 토큰"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS 액세스 키"],
  [/-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/, "개인키"],
  [/SESSION_SECRET\s*=\s*"[^"]{20,}"/, "SESSION_SECRET 실제 값"],
];
const DEBUG = [
  [/^\+.*\bdebugger\b/, "debugger"],
  [/^\+.*console\.log\(/, "console.log"],
  [/^\+.*TODO-REMOVE/, "TODO-REMOVE"],
];
const SKIP = /\.(png|jpg|jpeg|gif|webp|ico|db|woff2?)$|^package-lock\.json$|\.lock$/;

const problems = [];
for (const f of files) {
  if (/^\.env(\..*)?$/.test(f) && f !== ".env.example") problems.push(`${f}: .env 파일은 커밋하지 않는다`);
  if (SKIP.test(f)) continue;
  let diff = "";
  try {
    diff = git("diff", "--cached", "-U0", "--", f);
  } catch {
    problems.push(`${f}: diff 를 읽지 못해 검사할 수 없다`);
    continue;
  }
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const [re, why] of SECRET) if (added.some((l) => re.test(l))) problems.push(`${f}: ${why}`);
  if (/^(app|components|lib)\//.test(f))
    for (const [re, why] of DEBUG) if (added.some((l) => re.test(l))) problems.push(`${f}: ${why} 잔재`);
}
if (problems.length) {
  console.error("pre-commit: 커밋을 막았습니다.\n- " + problems.join("\n- "));
  process.exit(1);
}
