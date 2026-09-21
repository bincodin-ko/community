#!/usr/bin/env node
// UI 카피 린트 — app/·components/ 의 한국어 문자열을 뽑아 Jev 에게 "사용자에게 보이면 안 되는 문장인가"를 묻는다.
// 검사 항목: 시스템 용어 노출(서버·DB·토큰·훅 등), 반말/존댓말 불일치(온다는 '~해요'체), 헤지·군더더기, 영어 누출.
// 사용: node scripts/qa/copy-lint.mjs   (JEV_BASE_URL 또는 키 필요; 없으면 결정적 검사만)
import fs from "node:fs";
import path from "node:path";
import { ask, noul, provider } from "../lib/jev.mjs";

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx$/.test(e.name)) files.push(p);
  }
};
walk("app");
walk("components");

const strings = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  // JSX 텍스트 노드와 따옴표 문자열 중 한글이 3자 이상 포함된 것
  for (const m of src.matchAll(/>([^<>{}]*[가-힣]{2,}[^<>{}]*)</g)) strings.set(m[1].replace(/\s+/g, " ").trim(), f);
  for (const m of src.matchAll(/["'`]([^"'`\n]*[가-힣]{3,}[^"'`\n]*)["'`]/g))
    strings.set(m[1].replace(/\s+/g, " ").trim(), f);
}
const lines = [...strings.entries()].filter(([s]) => s.length >= 6 && s.length <= 200);

// 결정적 검사
const SYSTEM = /(서버|DB|데이터베이스|토큰|훅|API|엔드포인트|null|undefined|prisma|jev)/i;
const findings = [];
for (const [s, f] of lines) {
  if (SYSTEM.test(s) && !/API 키|Jev/.test(s)) findings.push({ file: f, line: s, why: "시스템 용어 노출(결정적)" });
  if (
    /(습니다|합니다|입니다)\.?$/.test(s) &&
    !/(약속|요구하지 않습니다|다룹니다|처리합니다|남습니다|제재합니다|확인합니다|지웁니다|정지합니다)/.test(s)
  )
    findings.push({ file: f, line: s, why: "'~해요'체가 아닌 격식체(결정적)" });
}

// Jev 판정 (16줄씩)
let jevCalls = 0;
if (provider()) {
  for (let i = 0; i < lines.length; i += 16) {
    const batch = lines.slice(i, i + 16);
    const questions = {};
    batch.forEach((_, j) => {
      questions[`ai_${j}`] = {
        type: "noul",
        instructions: `\`lines[${j}]\`는 'AI가 쓴 티'가 나는 문장이다: 과장된 감탄, 공허한 격려("함께 성장해요"), 헤지 남발, "~을 통해 ~을 경험하세요" 같은 광고체.`,
      };
      questions[`sys_${j}`] = {
        type: "noul",
        instructions: `\`lines[${j}]\`는 일반 사용자가 이해 못 할 시스템·개발 용어를 담고 있다.`,
      };
    });
    const { answers } = await ask(
      {
        product: "온다 — 한국 2030 게이를 위한 익명 텍스트 커뮤니티. 말투는 담백한 '~해요'체.",
        lines: batch.map(([s]) => s),
      },
      questions,
    );
    if (!answers) break;
    jevCalls++;
    batch.forEach(([s, f], j) => {
      const a = noul(answers, `ai_${j}`),
        b = noul(answers, `sys_${j}`);
      if (a >= 0.7) findings.push({ file: f, line: s, why: `AI 티 (${Math.round(a * 100)}%)` });
      if (b >= 0.7) findings.push({ file: f, line: s, why: `시스템 용어 (${Math.round(b * 100)}%)` });
    });
  }
}

console.log(`copy-lint: ${lines.length}개 문자열, Jev ${jevCalls}회, 지적 ${findings.length}건`);
for (const f of findings) console.log(`- ${path.relative(".", f.file)}: "${f.line}" — ${f.why}`);
process.exit(findings.some((f) => /결정적/.test(f.why)) ? 1 : 0);
