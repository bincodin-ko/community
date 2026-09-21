#!/usr/bin/env node
// 가짜 Jev 서버 — 키 없이 훅·QA 워크·모더레이션을 시험하기 위한 규칙 기반 응답기.
// 실제 Jev의 요청/응답 형태(state + questions → answers)만 흉내 낸다. 판정 품질은 흉내 내지 않는다.
import http from "node:http";

const PORT = Number(process.env.FAKE_JEV_PORT ?? 4141);

const HATE = /(게이새끼|호모새끼|더러운\s*게이|죽어라|병신|에이즈\s*걸려|씹|정신병자)/;
const HOOKUP = /(만나실\s*분|만날\s*사람|섹스|섹파|즉석|위치\s*공유|사진\s*교환|얼굴\s*보내|모텔|잘\s*사람)/;
const SPAM = /(마사지|호스트바|업소|할인|이벤트\s*중|링크\s*클릭|http)/i;
const PII = /(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|@[a-z0-9_.]{4,}|[\w.+-]+@[\w-]+\.\w+|인스타)/i;
const CRISIS = /(죽고\s*싶|자살|자해|사라지고\s*싶|끝내고\s*싶|살기\s*싫)/;
const DEV = /(TODO|FIXME|lorem|undefined|null|\{\{|\}\}|\[object|NaN|console\.|\bkey\.|_title\b|_label\b)/;

function text(state) {
  if (typeof state === "string") return state;
  return Object.values(state ?? {}).map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n");
}

function answerChoice(name, q, state) {
  const opts = Object.keys(q.criteria ?? {});
  const t = text(state);
  const probs = Object.fromEntries(opts.map((o) => [o, 0]));
  let choice = opts[0];
  let confidence = 0.6;

  if (name === "category") {
    choice = HATE.test(t) ? "hate" : HOOKUP.test(t) ? "sexual_or_hookup" : SPAM.test(t) ? "spam" : PII.test(t) ? "outing" : "ok";
    confidence = choice === "ok" ? 0.8 : 0.93;
  } else if (name === "topic") {
    const map = { family: /(엄마|아빠|부모|명절|결혼|선\s*자리)/, military: /(군대|입대|전역|훈련소)/, work: /(회사|직장|팀장|출근|워크숍|학교|캠퍼스)/, comingout: /(커밍아웃|말했다|말해봤다)/, love: /(남자친구|이별|헤어|연애|데이트)/, mind: /(수치|불안|외로|우울|마음)/, daily: /./ };
    choice = opts.find((o) => map[o]?.test(t)) ?? "daily";
    confidence = 0.85;
  } else if (name === "next_action") {
    // QA 워크: state.url 과 요소 목록으로 다음 행동을 고른다
    const url = String(state?.url ?? "");
    const wanted = url.includes("/posts/") ? "done" : url.includes("/write") ? "글 올리기" : url.includes("/join") ? "시작하기" : state?.logged_in ? "글 쓰기" : "시작하기";
    const els = Array.isArray(state?.elements) ? state.elements : [];
    // 같은 라벨이면 폼 제출 버튼을 내비 링크보다 우선한다
    const matches = els.filter((e) => String(e.label ?? "").includes(wanted));
    const hit = matches.find((e) => e.tag === "button") ?? matches[0];
    choice = wanted === "done" ? "done" : hit ? `e${hit.id}` : opts.includes("done") ? "done" : opts[0];
    confidence = hit || wanted === "done" ? 0.92 : 0.4;
  } else {
    // 일반 choice: 기준 문장과 state 의 단어 겹침으로 고른다
    let best = -1;
    for (const o of opts) {
      const words = String(q.criteria[o] ?? o).split(/\s+/).filter((w) => w.length > 1);
      const score = words.filter((w) => t.includes(w)).length;
      if (score > best) { best = score; choice = o; }
    }
    confidence = best > 0 ? 0.75 : 0.5;
  }
  for (const o of opts) probs[o] = o === choice ? confidence : (1 - confidence) / Math.max(1, opts.length - 1);
  return { choice, probabilities: probs, confidence };
}

function answerNoul(name, q, state) {
  const t = text(state);
  const ins = String(q.instructions ?? "");
  switch (name) {
    case "block": return { noul: HATE.test(t) ? 0.95 : HOOKUP.test(t) ? 0.9 : SPAM.test(t) ? 0.7 : PII.test(t) ? 0.65 : 0.05 };
    case "crisis": return { noul: CRISIS.test(t) ? 0.85 : 0.03 };
    case "goal_reached": return { noul: String(state?.url ?? "").includes("/posts/") ? 0.95 : 0.05 };
    case "stuck": return { noul: Number(state?.steps_without_url_change ?? 0) >= 3 ? 0.9 : 0.05 };
    case "claims_done": return { noul: /(완료|done|끝났|마쳤|통과|passes|finished)/i.test(t) ? 0.9 : 0.1 };
    case "needs_check": return { noul: /(\.tsx?|\.mjs|\.prisma|package\.json)/.test(t) ? 0.85 : 0.2 };
    case "claimed_check_ran": return { noul: /(테스트를? 돌렸|ran the tests|npm test|typecheck 통과|build 통과)/i.test(t) ? 0.8 : 0.1 };
    default:
      if (/dev|artifact|개발자|미번역|untranslated|key/i.test(ins)) {
        // 줄 단위 판정: 이름 끝의 인덱스로 해당 줄을 본다
        const m = name.match(/_(\d+)$/); const lines = Array.isArray(state?.lines) ? state.lines : [t];
        const line = m ? String(lines[Number(m[1])] ?? "") : t;
        return { noul: DEV.test(line) ? 0.9 : 0.03 };
      }
      return { noul: 0.1 };
  }
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.method !== "POST") { res.writeHead(405); return res.end(); }
    let parsed;
    try { parsed = JSON.parse(body || "{}"); } catch { res.writeHead(400); return res.end('{"error":"bad json"}'); }
    const { state, questions = {} } = parsed;
    const answers = {};
    for (const [name, q] of Object.entries(questions)) {
      answers[name] = q.type === "choice" ? answerChoice(name, q, state) : answerNoul(name, q, state);
    }
    const out = JSON.stringify({ model: "fake-jev-0.1", answers, usage: { input_tokens: Math.ceil(body.length / 4) } });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(out);
  });
});
server.listen(PORT, "127.0.0.1", () => console.log(`fake-jev listening on http://127.0.0.1:${PORT}/v1/systemone`));
