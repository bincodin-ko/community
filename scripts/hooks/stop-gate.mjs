#!/usr/bin/env node
// Claude Code Stop 훅 — "검증 없는 done"을 막는다 (jev-belay/limpet 축소판).
// 동작: 이번 턴에 파일 편집이 있었고, 그 뒤로 검증 명령(typecheck/build/test/qa)이 성공한 흔적이 없으면
//       Jev에 3문항을 묻고 '완료를 주장'했으면 exit 2로 되돌려 보낸다. 키가 없거나 오류면 항상 통과(fail-open).
import fs from "node:fs";
import { ask, noul, provider } from "../lib/jev.mjs";

const VERIFY = /(npm run (typecheck|build|test|qa)|npx tsc|next build|playwright|node scripts\/qa\/walk\.mjs|npm test)/;
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let hook;
  try {
    hook = JSON.parse(input || "{}");
  } catch {
    return;
  }
  if (hook.stop_hook_active) return; // 이미 한 번 되돌렸으면 다시 막지 않는다

  if (!provider()) return;
  const path = hook.transcript_path;
  if (!path || !fs.existsSync(path)) return;

  const lines = fs.readFileSync(path, "utf8").split("\n").filter(Boolean);
  const msgs = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  // 마지막 사용자 프롬프트 이후만 본다
  let start = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.type === "user" && typeof m.message?.content === "string") {
      start = i;
      break;
    }
  }
  const turn = msgs.slice(start);

  let edited = false,
    verifiedAfterEdit = false,
    lastAssistantText = "",
    editedFiles = [];
  for (const m of turn) {
    const content = m.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part.type === "tool_use") {
        if (EDIT_TOOLS.has(part.name)) {
          edited = true;
          verifiedAfterEdit = false;
          editedFiles.push(part.input?.file_path ?? "");
        }
        if (part.name === "Bash" && VERIFY.test(String(part.input?.command ?? ""))) verifiedAfterEdit = true;
      }
      if (part.type === "text" && m.type === "assistant") lastAssistantText = part.text;
    }
  }
  if (!edited || verifiedAfterEdit) return;

  const state = {
    edited_files: editedFiles.slice(-10),
    closing_message: lastAssistantText.slice(0, 3000),
    note: "이 턴에서 파일이 수정되었고, 그 뒤로 typecheck/build/test/qa 명령이 실행된 기록이 없다.",
  };
  const questions = {
    claims_done: { type: "noul", instructions: "`closing_message`는 작업이 완료되었거나 동작한다고 주장한다." },
    needs_check: {
      type: "noul",
      instructions: "`edited_files`의 변경은 타입체크·빌드·테스트 같은 자동 검증이 적용될 수 있는 종류다.",
    },
    claimed_check_ran: {
      type: "noul",
      instructions: "`closing_message`는 테스트나 빌드가 실제로 실행되어 통과했다고 말한다.",
    },
  };
  const { answers } = await ask(state, questions, { timeoutMs: 8000 });
  if (!answers) return;
  const n = (k) => noul(answers, k);
  const threshold = Number(process.env.STOP_GATE_THRESHOLD ?? 0.7);
  if (n("claims_done") >= threshold && n("needs_check") >= 0.5) {
    process.stderr.write(
      `stop-gate: 파일을 수정했지만 검증 명령이 실행되지 않았습니다 (claims_done=${n("claims_done").toFixed(2)}, claimed_check_ran=${n("claimed_check_ran").toFixed(2)}). ` +
        `npm run typecheck && npm run build 를 실행하고, 화면이 바뀌었다면 npm run qa 도 돌린 뒤 결과와 함께 마무리하세요. 검증이 불가능하면 그 이유를 한 줄로 쓰고 끝내세요.\n`,
    );
    process.exit(2);
  }
}

main().catch(() => process.exit(0));
