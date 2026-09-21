#!/usr/bin/env node
// Claude Code PostToolUse 훅 — 편집 직후 (1) prettier + eslint --fix 로 해당 파일을 정리하고 (2) .ts/.tsx 면 타입체크한다.
// 입력은 stdin JSON({ tool_name, tool_input: { file_path } }). 타입 오류는 exit 2 로 Claude 에게 되먹인다.
import { spawnSync } from "node:child_process";

let input = "";
for await (const c of process.stdin) input += c;
let hook = {};
try {
  hook = JSON.parse(input || "{}");
} catch {}
const file = String(hook?.tool_input?.file_path ?? "");
const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (!file.startsWith(cwd)) process.exit(0);

if (/\.(ts|tsx|mjs|js|css|json)$/.test(file) && !/node_modules|\.next/.test(file)) {
  spawnSync("npx", ["prettier", "--write", "--log-level", "silent", file], { cwd, encoding: "utf8", timeout: 30000 });
  if (/\.(ts|tsx|mjs|js)$/.test(file))
    spawnSync("npx", ["eslint", "--fix", "--no-warn-ignored", file], { cwd, encoding: "utf8", timeout: 60000 });
}
if (!/\.(ts|tsx)$/.test(file)) process.exit(0);

const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], { cwd, encoding: "utf8", timeout: 80000 });
if (r.status !== 0) {
  const out = (r.stdout || r.stderr || "").split("\n").slice(0, 20).join("\n");
  process.stderr.write(`typecheck failed after editing ${file}:\n${out}\n`);
  process.exit(2);
}
