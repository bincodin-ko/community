// 주제는 "만남"이 아니라 "삶의 국면"으로 나눈다.
export const TOPICS = [
  { slug: "mind", label: "마음", hint: "수치심, 자기수용, 불안, 외로움" },
  { slug: "comingout", label: "커밍아웃", hint: "누구에게, 언제, 그 뒤에 무슨 일이" },
  { slug: "family", label: "가족", hint: "부모, 형제, 명절, 결혼 압박" },
  { slug: "work", label: "회사·학교", hint: "직장, 캠퍼스, 동료, 이중생활" },
  { slug: "military", label: "군대", hint: "입대 전후, 안에서의 시간" },
  { slug: "love", label: "연애", hint: "관계, 이별, 앱 피로, 기준" },
  { slug: "daily", label: "일상", hint: "그냥 오늘 있었던 일" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export const TOPIC_SLUGS = TOPICS.map((t) => t.slug) as [TopicSlug, ...TopicSlug[]];

export function topicLabel(slug: string): string {
  return TOPICS.find((t) => t.slug === slug)?.label ?? slug;
}

export const REPORT_REASONS = [
  { value: "outing", label: "신상·아웃팅 위험" },
  { value: "hate", label: "혐오·괴롭힘" },
  { value: "sexual", label: "성적 콘텐츠·만남 목적" },
  { value: "spam", label: "광고·스팸" },
  { value: "other", label: "기타" },
] as const;

// 자동 숨김에 필요한 "가중치 합". 신규 계정 신고는 가중치가 낮아, 급조한 계정 여러 개로
// 남의 글을 내리는 takedown 공격이 통하지 않는다.
export const HIDE_THRESHOLD = 3;
// 가입 후 REPORT_TRUST_HOURS 가 지나지 않았거나 글·댓글을 한 번도 쓴 적 없는 계정의 신고 가중치
export const REPORT_WEIGHT_NEW = 0.4;
export const REPORT_WEIGHT_TRUSTED = 1;
export const REPORT_TRUST_HOURS = 72;

// 신규 계정 24시간 제한
export const NEW_ACCOUNT_HOURS = 24;
export const NEW_ACCOUNT_MAX_POSTS = 1;
export const NEW_ACCOUNT_MAX_COMMENTS = 5;

export const MIN_BIRTH_YEAR_AGE = 19;

// 올라온 지 이 시간이 지나도록 댓글·"나도"가 없는 글은 운영자 큐로 올린다.
export const UNANSWERED_HOURS = 6;
