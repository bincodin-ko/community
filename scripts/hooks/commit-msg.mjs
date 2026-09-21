#!/usr/bin/env node
// commit-msg (fail-open) — 확정된 커밋 메시지가 staged diff 와 맞는지 Jev 에게 묻는다. 경고만 하고 커밋은 막지 않는다.
// 인자: 메시지 파일 경로 (git 이 넘겨줌)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { ask, noul, provider } from "../lib/jev.mjs";

const file = process.argv[2];
if (!file || !provider()) process.exit(0);
const message = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => !l.startsWith("#"))
  .join("\n")
  .trim();
if (!message) process.exit(0);

const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const stat = git("diff", "--cached", "--stat");
const diff = git("diff", "--cached", "-U1").slice(0, 12000);
const { answers } = await ask(
  { commit_message: message, diff_stat: stat, diff },
  {
    matches: { type: "noul", instructions: "`commit_message`는 `diff`의 변경 내용을 정확히 설명한다." },
    unmentioned: { type: "noul", instructions: "`diff`에는 `commit_message`가 언급하지 않은 별개의 변경이 섞여 있다." },
  },
  { timeoutMs: 6000 },
);
if (!answers) process.exit(0);
const m = noul(answers, "matches");
const u = noul(answers, "unmentioned");
if (m < 0.5 || u > 0.7) {
  console.error(
    `commit-msg(jev): 메시지↔diff 일치 ${m.toFixed(2)}, 언급 없는 변경 ${u.toFixed(2)} — 메시지를 다시 확인하세요 (경고만).`,
  );
}
process.exit(0);
