#!/usr/bin/env node
// Claude Code PostToolUse 훅 — .ts/.tsx 파일을 편집할 때마다 타입체크를 돌려 오류를 즉시 되먹인다.
// 입력은 stdin JSON({ tool_name, tool_input: { file_path } }). 실패해도 턴을 막지 않고 stderr로 알려만 준다.
import { spawnSync } from "node:child_process";

let input = "";
for await (const c of process.stdin) input += c;
let hook = {};
try { hook = JSON.parse(input || "{}"); } catch {}
const file = String(hook?.tool_input?.file_path ?? "");
if (!/\.(ts|tsx)$/.test(file)) process.exit(0);

const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], { cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), encoding: "utf8", timeout: 80000 });
if (r.status !== 0) {
  const out = (r.stdout || r.stderr || "").split("\n").slice(0, 20).join("\n");
  process.stderr.write(`typecheck failed after editing ${file}:\n${out}\n`);
  process.exit(2); // exit 2 → Claude에게 오류 내용이 전달된다
}
