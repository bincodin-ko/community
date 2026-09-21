/**
 * 모더레이션 임계치 재보정 — fixtures/moderation-cases.jsonl 의 라벨된 사례를 운영 코드(lib/jev.ts)에 그대로 통과시켜
 * 임계치별 정밀도·재현율과 보정(calibration)을 측정하고, 권장 임계치를 제안한다.
 *
 * 사용:
 *   npx tsx scripts/qa/calibrate.ts                       # 환경변수의 Jev 프로바이더 사용
 *   JEV_BASE_URL=http://127.0.0.1:4141/v1/systemone npx tsx scripts/qa/calibrate.ts   # 가짜 Jev(스텁)
 *   TYPESAFE_API_KEY=ts_... npx tsx scripts/qa/calibrate.ts --out calibration.md      # 실제 Jev
 *
 * 판단 기준: 이 커뮤니티에서 **오차단(정상 글을 막는 것)은 오통과보다 훨씬 나쁘다.**
 * 오통과는 검토 큐가 잡지만, 오차단은 겨우 용기 낸 사람을 돌려보낸다. 그래서 권장 임계치는
 * "정상 글 오차단 0건"을 먼저 만족시키고 그 안에서 재현율을 최대화한다.
 */
import fs from "node:fs";
import path from "node:path";

import { moderateText, jevEnabled } from "../../lib/jev";

/** 리포트에 어떤 프로바이더로 측정했는지 남긴다 — 스텁 숫자를 실제 Jev 숫자로 착각하지 않도록. */
function providerLabel(): string {
  if (process.env.JEV_BASE_URL)
    return `${process.env.JEV_BASE_URL} (주의: fake-jev 스텁이면 이 숫자는 모델 성능이 아니다)`;
  if (process.env.TYPESAFE_API_KEY) return "TypeSafe api.typesafe.ai";
  if (process.env.OPENROUTER_API_KEY) return "OpenRouter ~typesafe/jev-latest";
  return "없음";
}
import { TOPIC_SLUGS } from "../../lib/topics";

type Case = {
  id: string;
  kind: "post" | "comment";
  text: string;
  block: boolean;
  category: string;
  crisis: boolean;
};

type Result = Case & {
  gotBlock: number;
  gotCategory: string;
  gotConfidence: number;
  gotCrisis: number;
  source: string;
};

const args = process.argv.slice(2);
const outPath = args.includes("--out") ? args[args.indexOf("--out") + 1] : "calibration.md";
const fixture = args.includes("--cases") ? args[args.indexOf("--cases") + 1] : "fixtures/moderation-cases.jsonl";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** 임계치 t 에서의 혼동행렬. 양성 = "차단해야 한다". */
function confusion(results: Result[], t: number) {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (const r of results) {
    const predicted = r.gotBlock >= t;
    if (r.block && predicted) tp++;
    else if (!r.block && predicted) fp++;
    else if (!r.block && !predicted) tn++;
    else fn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, tn, fn, precision, recall, f1 };
}

/** 신뢰도 구간별 실제 정확도 — 과신/과소확신을 본다 (ECE). */
function calibrationBuckets(results: Result[]) {
  const buckets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.01].map((hi, i, arr) => ({
    lo: i === 0 ? 0 : arr[i - 1],
    hi,
    n: 0,
    correct: 0,
    sumConf: 0,
  }));
  for (const r of results) {
    const b = buckets.find((x) => r.gotConfidence >= x.lo && r.gotConfidence < x.hi);
    if (!b) continue;
    b.n++;
    b.sumConf += r.gotConfidence;
    if (r.gotCategory === r.category) b.correct++;
  }
  const total = buckets.reduce((s, b) => s + b.n, 0) || 1;
  const ece = buckets.reduce((s, b) => (b.n ? s + (b.n / total) * Math.abs(b.sumConf / b.n - b.correct / b.n) : s), 0);
  return { buckets, ece };
}

async function main() {
  const file = path.resolve(process.cwd(), fixture);
  if (!fs.existsSync(file)) {
    console.error(`사례 파일이 없습니다: ${file}`);
    process.exit(1);
  }
  const cases: Case[] = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  if (!jevEnabled()) {
    console.error(
      "Jev 프로바이더가 없습니다. TYPESAFE_API_KEY / OPENROUTER_API_KEY / JEV_BASE_URL 중 하나를 설정하세요.",
    );
    console.error("키 없이 시험하려면: npm run jev:fake & 그리고 JEV_BASE_URL=http://127.0.0.1:4141/v1/systemone");
    process.exit(1);
  }

  const results: Result[] = [];
  const started = Date.now();
  for (const c of cases) {
    const m = await moderateText(c.text, c.kind, c.kind === "post" ? [...TOPIC_SLUGS] : []);
    results.push({
      ...c,
      gotBlock: m.block,
      gotCategory: m.category,
      gotConfidence: m.confidence,
      gotCrisis: m.crisis,
      source: m.source,
    });
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  const elapsed = Date.now() - started;

  // 임계치 스윕
  const sweep = [0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((t) => ({
    t,
    ...confusion(results, t),
  }));
  // 오차단 0건을 만족하는 가장 낮은 임계치 = 재현율이 가장 높은 안전한 지점
  const safest = sweep.filter((s) => s.fp === 0).sort((a, b) => a.t - b.t)[0];
  const bestF1 = [...sweep].sort((a, b) => b.f1 - a.f1)[0];

  // 위기 신호
  const crisisSweep = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((t) => {
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const r of results) {
      const p = r.gotCrisis >= t;
      if (r.crisis && p) tp++;
      else if (!r.crisis && p) fp++;
      else if (r.crisis && !p) fn++;
    }
    return { t, tp, fp, fn, recall: tp + fn ? tp / (tp + fn) : 1, precision: tp + fp ? tp / (tp + fp) : 1 };
  });

  const catCorrect = results.filter((r) => r.gotCategory === r.category).length;
  const { buckets, ece } = calibrationBuckets(results);

  const falseBlocks = (t: number) => results.filter((r) => !r.block && r.gotBlock >= t);
  const misses = (t: number) => results.filter((r) => r.block && r.gotBlock < t);

  const T = safest?.t ?? bestF1.t;
  const lines = [
    `# 모더레이션 보정 리포트`,
    ``,
    `- 사례 ${results.length}건 (차단 대상 ${results.filter((r) => r.block).length}, 정상 ${results.filter((r) => !r.block).length}, 위기 ${results.filter((r) => r.crisis).length})`,
    `- 판정 출처: ${[...new Set(results.map((r) => r.source))].join(", ")} · 프로바이더 ${providerLabel()}`,
    `- 소요 ${(elapsed / 1000).toFixed(1)}초, 평균 ${(elapsed / results.length).toFixed(0)}ms/건`,
    ``,
    `## 권장 임계치`,
    ``,
    safest
      ? `**차단 ${safest.t}** — 정상 글 오차단 0건을 지키는 가장 낮은 지점. 재현율 ${pct(safest.recall)} (놓치는 ${safest.fn}건은 검토 큐로).`
      : `**어떤 임계치에서도 오차단이 0이 되지 않았다.** 가장 높은 ${sweep[sweep.length - 1].t} 에서도 ${sweep[sweep.length - 1].fp}건을 잘못 막는다. 질문 문구를 고쳐야 한다.`,
    `F1 최대 지점은 ${bestF1.t} (F1 ${bestF1.f1.toFixed(3)}, 오차단 ${bestF1.fp}건) 이지만, 이 커뮤니티에서는 오차단이 더 비싸므로 위를 권한다.`,
    ``,
    `## 임계치 스윕`,
    ``,
    `| 임계치 | 정밀도 | 재현율 | F1 | 오차단(FP) | 놓침(FN) |`,
    `|---:|---:|---:|---:|---:|---:|`,
    ...sweep.map((s) => `| ${s.t} | ${pct(s.precision)} | ${pct(s.recall)} | ${s.f1.toFixed(3)} | ${s.fp} | ${s.fn} |`),
    ``,
    `## 오차단 — 가장 비싼 오류`,
    ``,
    ...(falseBlocks(T).length
      ? falseBlocks(T).map(
          (r) => `- \`${r.id}\` (${pct(r.gotBlock)} → ${r.gotCategory}): ${r.text.replace(/\n/g, " ").slice(0, 70)}`,
        )
      : [`- 권장 임계치 ${T} 에서 없음`]),
    ``,
    `## 놓친 위반`,
    ``,
    ...(misses(T).length
      ? misses(T).map(
          (r) => `- \`${r.id}\` (${r.category}, ${pct(r.gotBlock)}): ${r.text.replace(/\n/g, " ").slice(0, 70)}`,
        )
      : [`- 없음`]),
    ``,
    `## 위기 신호`,
    ``,
    `| 임계치 | 재현율 | 정밀도 | 놓침 | 오탐 |`,
    `|---:|---:|---:|---:|---:|`,
    ...crisisSweep.map((c) => `| ${c.t} | ${pct(c.recall)} | ${pct(c.precision)} | ${c.fn} | ${c.fp} |`),
    ``,
    `위기는 **놓치는 쪽이 더 비싸다.** 배너를 띄우는 것뿐이므로 오탐 비용이 낮다. 재현율을 우선해 임계치를 낮게 잡는다.`,
    ``,
    `## 분류 정확도와 보정`,
    ``,
    `- 카테고리 정확도 ${catCorrect}/${results.length} (${pct(catCorrect / results.length)})`,
    `- ECE ${ece.toFixed(3)} — 0에 가까울수록 신뢰도가 실제 정확도와 맞는다`,
    ``,
    `| 신뢰도 구간 | 건수 | 평균 신뢰도 | 실제 정확도 |`,
    `|---|---:|---:|---:|`,
    ...buckets
      .filter((b) => b.n)
      .map(
        (b) =>
          `| ${b.lo}–${b.hi > 1 ? "1.0" : b.hi} | ${b.n} | ${(b.sumConf / b.n).toFixed(2)} | ${pct(b.correct / b.n)} |`,
      ),
    ``,
    `## 다음 할 일`,
    ``,
    `1. 위 권장값을 \`lib/jev.ts\` 의 \`BLOCK_THRESHOLD\` / \`CRISIS_THRESHOLD\` 에 반영한다.`,
    `2. 오차단 목록의 문장을 보고 \`MOD_CATEGORIES\` 설명을 고친다. 임계치보다 질문 문구가 먼저다.`,
    `3. 운영 시작 후 실제 글 100건을 라벨해 \`fixtures/moderation-cases.jsonl\` 에 추가하고 다시 돌린다.`,
    ``,
  ];

  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(lines.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
