#!/usr/bin/env node
// 탐색 테스트 — Jev 가 DOM 결정을 내리며 우리 앱을 돌아다닌다. jev-browser 를 CLI 로 감싼다.
// MCP(.mcp.json)로도 같은 엔진을 쓸 수 있지만, 여기서는 키·브라우저 경로를 이 스크립트가 챙긴다.
//
// 사용: node scripts/qa/browse.mjs "가족 주제의 이야기 목록을 연다" [http://localhost:3000]
// 키 없이 시험: npm run jev:fake 를 띄우고 TYPESAFE_BASE_URL=http://127.0.0.1:4141 TYPESAFE_API_KEY=test
import { spawnSync } from "node:child_process";

const [task, base = process.env.QA_BASE ?? "http://localhost:3000"] = process.argv.slice(2);
if (!task) {
  console.error('사용법: node scripts/qa/browse.mjs "<목표>" [기준 URL]');
  process.exit(1);
}
if (!process.env.TYPESAFE_API_KEY && !process.env.OPENROUTER_API_KEY) {
  console.error("TYPESAFE_API_KEY 또는 OPENROUTER_API_KEY 가 필요합니다. 키 없이 시험하려면:");
  console.error("  npm run jev:fake &");
  console.error('  TYPESAFE_API_KEY=test TYPESAFE_BASE_URL=http://127.0.0.1:4141 npm run browse -- "목표"');
  process.exit(1);
}

const r = spawnSync(
  "npx",
  ["-y", "@jkudish/jev-browser", "run", task, base, "--max-steps", process.env.BROWSE_MAX_STEPS ?? "12"],
  {
    encoding: "utf8",
    timeout: 240000,
    env: process.env,
  },
);
const raw = r.stdout ?? "";
const start = raw.indexOf("{");
if (start < 0) {
  console.error(raw || r.stderr || "출력 없음");
  process.exit(1);
}
const out = JSON.parse(raw.slice(start));
console.log(`목표: ${task}`);
console.log(`결과: ${out.status} → ${out.final_url} (${out.final_title ?? ""})`);
for (const s of out.steps ?? []) {
  console.log(
    `  ${s.step}. ${s.executed_action ?? "-"} ${String(s.detail ?? "").slice(0, 46)} · 확신 ${s.confidence} → ${String(s.outcome ?? "").slice(0, 50)}`,
  );
}
const errors = (out.console_events ?? []).filter((e) => e.type !== "request_failed" || !/_rsc=/.test(e.text ?? ""));
if (errors.length) {
  console.log(`\n브라우저 오류 ${errors.length}건`);
  for (const e of errors.slice(0, 10)) console.log(`  - [${e.type}] ${String(e.text ?? "").slice(0, 110)}`);
}
const u = out.usage ?? {};
console.log(
  `\nJev ${u.jev_calls ?? 0}회 · 입력 ${u.input_tokens ?? 0} 토큰 · 약 $${(u.est_cost_usd ?? 0).toFixed(6)} · ${out.elapsed_ms}ms`,
);
process.exit(out.status === "goal_achieved" ? 0 : 1);
