// 시드: 마인드셋 30일치 + 예시 글. 실제 배포 전 예시 글은 지우고 마인드셋만 남길 것.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function kst(offsetDays: number): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

// Cade Bradley의 핵심 명제와 한국 맥락을 섞은 30개. 출처가 특정 인물이면 source에 표시.
const MINDSETS: Array<[string, string, string | null]> = [
  ["게이라는 건 고쳐야 할 결함이 아니라, 내가 원래 정렬된 방식이다.", "오늘 하루 중 '나를 고쳐야 한다'고 느낀 순간이 있었나요? 그 생각은 어디서 왔을까요.", "Cade Bradley, Intrinsically Ordered"],
  ["수치심은 내 안에서 자란 게 아니라, 밖에서 들어온 것이다.", "당신이 처음 '이건 숨겨야 해'라고 배운 장면을 기억하나요?", "Cade Bradley"],
  ["욕망의 대상이 아니어도 나는 가치가 있다.", "앱을 지우고 싶었던 마지막 순간, 무엇이 당신을 작게 만들었나요?", "Cade Bradley, The Most Dangerous Mindset I See in Gay Men"],
  ["커밍아웃은 사건이 아니라, 오래 걸리는 번역이다.", "당신은 지금 누구에게 어디까지 번역되어 있나요?", null],
  ["구조와 소속을 원하는 건 약함이 아니다. 그걸 위해 나를 지우는 게 문제일 뿐.", "안전하다고 느껴서 남아 있는 곳 중, 실은 나를 지우게 하는 곳이 있나요?", "Cade Bradley"],
  ["'정상 가족'은 통계가 아니라 각본이다.", "명절에 당신이 연기하는 역할은 무엇인가요?", null],
  ["먼저 지나간 사람의 이야기는 정답이 아니라 지도다.", "지금 당신에게 필요한 건 위로인가요, 정보인가요?", null],
  ["나이가 드는 건 유통기한이 아니라, 내 취향이 선명해지는 것이다.", "'나이 들면 끝'이라는 말을 누구에게서 처음 들었나요?", null],
  ["군대에서 배운 침묵은 생존 기술이었지, 성격이 아니다.", "전역 후에도 여전히 켜져 있는 '침묵 스위치'가 있나요?", null],
  ["부모가 나를 이해하지 못하는 것과, 부모가 나를 사랑하지 않는 것은 다른 문장이다.", "두 문장을 섞어서 생각한 적이 있나요?", null],
  ["'게이답다'는 말은 규칙이 아니라 누군가의 취향이다.", "당신이 '게이답지 않다'고 느꼈던 순간, 그 기준은 누가 만든 건가요?", null],
  ["이중생활은 거짓이 아니라, 안전이 부족할 때의 합리적 대응이다.", "오늘 당신이 두 가지 버전으로 살았던 시간은 몇 시간인가요?", null],
  ["회사에서의 나와 여기서의 나 중, 어느 쪽이 더 피곤한가?", "그 차이는 어디서 오나요?", null],
  ["연애가 안 되는 것과 내가 사랑받을 수 없는 것은 인과관계가 아니다.", "마지막 이별에서 당신이 스스로에게 붙인 꼬리표는 무엇이었나요?", null],
  ["혐오는 논리가 아니라서, 논리로 이기려 하면 내가 먼저 지친다.", "오늘 굳이 이기지 않아도 되는 싸움이 있었나요?", null],
  ["긍정(affirmation)은 감상이 아니라, 실제로 삶의 결과를 바꾸는 변수다.", "당신을 있는 그대로 대해준 사람이 한 명이라도 있었던 해와 없었던 해, 무엇이 달랐나요?", "Cade Bradley"],
  ["외로움은 내가 부족해서가 아니라, 나를 알아볼 공간이 부족해서다.", "당신을 '알아본' 마지막 대화는 언제였나요?", null],
  ["신앙을 버린 게 아니라, 나를 버리라는 요구를 거절한 것이다.", "종교가 있든 없든, 당신이 거절해야 했던 요구는 무엇이었나요?", "Cade Bradley"],
  ["'언젠가 말해야지'의 언젠가는 날짜가 아니라 조건이다.", "그 조건은 무엇인가요? 그건 당신이 정한 건가요?", null],
  ["몸에 대한 평가를 내가 먼저 내면화하면, 아무도 나를 평가하지 않는 날에도 나는 평가당한다.", "거울 앞에서 당신이 쓰는 문장은 누구의 목소리인가요?", "Cade Bradley"],
  ["나를 받아주는 사람이 아직 없다는 건, 그런 사람이 없다는 뜻이 아니다.", "아직 만나지 못한 사람을 위해 남겨둘 자리가 있나요?", null],
  ["위장결혼을 고민하는 건 나약함이 아니라, 압력의 크기에 대한 정직한 측정이다.", "그 압력의 출처를 이름 붙일 수 있나요?", null],
  ["커뮤니티에서 상처받은 것과 커뮤니티가 필요 없는 것은 다르다.", "어떤 공간이었다면 다시 들어가고 싶을까요?", null],
  ["'그냥 조용히 살면 되잖아'는 조언이 아니라 요구다.", "그 요구를 들어주는 데 당신은 무엇을 지불하고 있나요?", null],
  ["자기수용은 도착지가 아니라, 매일 다시 하는 결정이다.", "오늘 그 결정을 몇 번 했나요?", null],
  ["당신이 여기 있다는 것 자체가, 다음 사람에게는 증거가 된다.", "당신에게 증거가 되어준 사람은 누구였나요?", null],
  ["질문이 많은 건 혼란이 아니라, 정직함이다.", "지금 당신이 가장 오래 붙들고 있는 질문은 무엇인가요?", null],
  ["가족을 잃을까 봐 두려운 마음과 가족을 속이는 게 힘든 마음은 같은 뿌리다.", "그 뿌리의 이름은 무엇일까요?", null],
  ["'너무 예민하다'는 말은 대개, 상대가 듣기 싫다는 뜻이다.", "그 말을 들었을 때 당신은 어느 쪽을 믿었나요?", null],
  ["나는 문제가 아니다. 문제는 나를 문제로 만든 것이다.", "오늘 이 문장을 한 번 소리 내어 읽어볼 수 있나요?", "Cade Bradley"],
];

const SAMPLE_POSTS: Array<{ topic: string; title: string; body: string; anonymous: boolean }> = [
  {
    topic: "mind",
    title: "앱을 지운 지 40일째, 이상하게 편하다",
    body: "5년 동안 하루도 안 켠 날이 없었는데, 지운 지 40일이 됐다. 처음 일주일은 손이 자꾸 갔다. 심심해서가 아니라, 내가 아직 '괜찮은지' 확인하고 싶어서였다는 걸 나중에 알았다.\n\n누가 나를 원하는지로 내 값을 매기던 습관이 앱보다 오래 남아 있었다. 지금은 그 습관이 조금씩 옅어진다. 대신 이렇게 글을 쓴다. 아무도 내 얼굴을 모르는 곳에서, 내 얼굴 말고 다른 걸 꺼내 놓는 게 이렇게 편할 줄 몰랐다.",
    anonymous: false,
  },
  {
    topic: "family",
    title: "엄마가 선 자리를 잡았다. 3주 남았다.",
    body: "31살. 엄마가 아는 분 딸이랑 밥 한번 먹으라고 한다. 거절하면 왜냐고 물을 거고, 나가면 거짓말이 하나 더 는다.\n\n먼저 지나간 분들, 이 상황에서 뭘 선택하셨는지 듣고 싶다. 커밍아웃한 분도, 안 한 분도, 위장결혼 고민했던 분도. 정답을 달라는 게 아니라 그 뒤에 어떻게 됐는지가 궁금하다.",
    anonymous: true,
  },
  {
    topic: "military",
    title: "전역하고 2년, 아직도 말끝을 흐린다",
    body: "군대에서 배운 게 하나 있다면 '주어 없이 말하기'다. 주말에 뭐 했냐는 질문에 '아 그냥 사람 만났어요'. 여자친구냐고 물으면 웃고 넘기기.\n\n전역한 지 2년인데 회사에서도 똑같이 한다. 침묵이 생존 기술이었다는 건 아는데, 이게 성격이 돼버린 것 같아서 가끔 무섭다. 비슷한 분 있나요.",
    anonymous: false,
  },
  {
    topic: "comingout",
    title: "친구 한 명에게 말했고, 세상이 안 무너졌다",
    body: "대학 동기. 4년 알고 지냈다. 술자리에서 말하려다 못 하고, 결국 카톡으로 했다. 답이 오기까지 11분. '아 그래? 나 몰랐네. 근데 왜 이제 말해 ㅋㅋ 밥 먹자'.\n\n11분 동안 나는 인생 최악의 시나리오를 열 개쯤 썼다. 그중 하나도 일어나지 않았다. 다음 사람에게 말하는 건 아직 무섭지만, 한 번 안 무너져 본 경험이 생겼다는 게 다르다.",
    anonymous: false,
  },
  {
    topic: "work",
    title: "회사 워크숍에서 '이상형' 돌아가며 말하기",
    body: "팀 빌딩이랍시고 돌아가며 이상형 말하기를 시켰다. 내 차례에 '조용한 사람이요'라고 했다. 성별을 안 붙이는 데 온 신경을 썼다. 아무도 눈치 못 챘겠지만 나는 그날 밤 10시까지 그 3초를 곱씹었다.\n\n이런 '작은' 순간들이 쌓여서 퇴근하면 아무것도 못 하겠다. 다들 어떻게 버티나.",
    anonymous: true,
  },
  {
    topic: "love",
    title: "3년 만난 사람과 헤어지고, 말할 데가 없었다",
    body: "회사 사람들은 내가 연애하는지도 몰랐다. 가족은 당연히 모른다. 그래서 헤어졌다는 말을 아무에게도 못 했다. 월요일에 출근해서 평소처럼 웃었다.\n\n이별보다 그게 더 힘들었다. 슬퍼할 자격을 공개적으로 못 받는 것. 여기서라도 쓴다. 나 헤어졌어요. 3년이었어요.",
    anonymous: true,
  },
  {
    topic: "daily",
    title: "오늘 처음으로 '남자친구'라고 소리 내어 말해봤다",
    body: "혼자 집에서. 거울 보고. 별거 아닌데 심장이 뛰었다. 다음엔 친구 앞에서 해보려고.",
    anonymous: false,
  },
];

async function main() {
  // 마인드셋: 오늘부터 과거 30일
  for (let i = 0; i < MINDSETS.length; i++) {
    const [quote, question, source] = MINDSETS[i];
    await prisma.mindset.upsert({
      where: { date: kst(-i) },
      update: { quote, question, source },
      create: { date: kst(-i), quote, question, source },
    });
  }

  // 예시 계정 (비밀번호: onda-demo-1234). 배포 전 삭제.
  const demoNames = ["새벽산책", "무화과", "조용한사람", "월요일"];
  const users = [];
  for (const nickname of demoNames) {
    const u = await prisma.user.upsert({
      where: { nickname },
      update: {},
      create: { nickname, passwordHash: await bcrypt.hash("onda-demo-1234", 10), birthYear: 1996 },
    });
    // 신규 계정 제한이 데모에 걸리지 않도록 가입일을 과거로
    await prisma.user.update({
      where: { id: u.id },
      data: { createdAt: new Date(Date.now() - 30 * 86400 * 1000), role: nickname === "새벽산책" ? "admin" : "member" },
    });
    users.push(u);
  }

  const existing = await prisma.post.count();
  if (existing === 0) {
    for (let i = 0; i < SAMPLE_POSTS.length; i++) {
      const p = SAMPLE_POSTS[i];
      const author = users[i % users.length];
      const post = await prisma.post.create({
        data: { ...p, authorId: author.id, createdAt: new Date(Date.now() - (i + 1) * 5 * 3600 * 1000) },
      });
      // 공감·댓글 약간
      for (const u of users.filter((u) => u.id !== author.id).slice(0, (i % 3) + 1)) {
        await prisma.reaction.create({ data: { userId: u.id, postId: post.id } });
      }
      if (i === 1) {
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: users[0].id,
            anonymous: true,
            body: "저는 나갔어요. 두 번. 세 번째에 엄마한테 '나 결혼 안 할 거야'까지만 말했어요. 이유는 아직. 그런데 그 한 문장으로 선 자리는 멈췄어요. 전부를 말하지 않아도 되는 단계가 있다는 걸 그때 알았어요.",
          },
        });
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: users[2].id,
            anonymous: false,
            body: "나갔다가 그 분한테 솔직히 말한 케이스예요. 상대도 부모 등쌀에 나온 거였고, 지금은 서로 알리바이 친구예요. 권하는 건 아니지만 이런 경우도 있다는 것만.",
          },
        });
      }
    }
  }

  console.log(`seeded: ${MINDSETS.length} mindsets, ${demoNames.length} demo users, ${SAMPLE_POSTS.length} sample posts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
