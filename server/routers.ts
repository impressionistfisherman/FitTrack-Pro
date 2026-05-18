import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addBodyWeight,
  addExerciseToRoutine,
  addWorkoutLog,
  checkPRs,
  completeWorkoutSession,
  createRoutine,
  createWorkoutSession,
  deleteBodyWeight,
  deleteRoutine,
  deleteWorkoutSession,
  deleteWorkoutLog,
  getBodyWeights,
  getExerciseById,
  getExerciseHistory,
  getExercises,
  getFavorites,
  getMonthlyStats,
  getRoutineById,
  getRoutineExercises,
  getRoutineExerciseById,
  getRoutinesByUser,
  getSessionsInDateRange,
  getUserGoal,
  getUserGoals,
  getUserPreference,
  getUserStats,
  getWeeklyStats,
  getWorkoutLogsBySession,
  getWorkoutSessionById,
  getWorkoutSessionsByUser,
  getWorkoutStreak,
  isFavorite,
  removeExerciseFromRoutine,
  reorderRoutineExercises,
  replaceUserGoals,
  setUserPreference,
  toggleFavorite,
  updateRoutine,
  updateRoutineExercise,
  upsertUserGoal,
} from "./db";

const equipmentLabels: Record<string, string> = {
  bodyweight: "맨몸",
  dumbbell: "덤벨",
  barbell: "바벨",
  machine: "머신",
  cable: "케이블",
  resistance_band: "밴드",
  kettlebell: "케틀벨",
  none: "기구 없음",
};

const bodyPartLabels: Record<string, string> = {
  chest: "가슴",
  back: "등",
  shoulders: "어깨",
  arms: "팔",
  legs: "하체",
  glutes: "둔근",
  abs: "복근",
  cardio: "유산소",
  stretching: "스트레칭",
  full_body: "전신",
};

const splitPreferenceLabels: Record<string, string> = {
  auto: "AI가 목표와 빈도에 맞춰 자동 구성",
  full_body: "전신 운동 중심",
  upper_lower: "상체/하체 분할",
  push_pull_legs: "푸시/풀/레그(PPL) 분할",
  body_part: "부위별 분할",
  hybrid: "근력 운동과 컨디셔닝을 섞은 혼합 분할",
};

const goalLabels: Record<string, string> = {
  hypertrophy: "근비대",
  fat_loss: "다이어트",
  strength: "근력",
  endurance: "지구력",
  flexibility: "유연성",
  general: "일반 건강",
};

function normalizeExerciseName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b\d+\s*(세트|set|sets|회|rep|reps|분|min|minutes|kg)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStretchExerciseText(value: string) {
  const text = normalizeExerciseName(value);
  return /stretch|mobility|warm.?up|cool.?down|스트레칭|모빌리티|가동성|워밍업|정리운동/.test(text);
}

function getBodyPartsFromFocus(day: any) {
  const text = [
    day?.focus,
    ...(Array.isArray(day?.exercises) ? day.exercises : []),
  ].join(" ").toLowerCase();
  const parts: string[] = [];
  const add = (part: string) => {
    if (!parts.includes(part)) parts.push(part);
  };

  if (/(등|back|lat|pull|풀|로우|데드)/.test(text)) add("back");
  if (/(어깨|shoulder|deltoid|press|프레스|레이즈)/.test(text)) add("shoulders");
  if (/(가슴|chest|bench|벤치|fly|플라이|push)/.test(text)) add("chest");
  if (/(이두|삼두|팔|bicep|tricep|curl|컬|extension|익스텐션)/.test(text)) add("arms");
  if (/(하체|다리|leg|quad|hamstring|squat|스쿼트|런지|레그)/.test(text)) add("legs");
  if (/(둔근|엉덩|glute|hip|힙)/.test(text)) add("glutes");
  if (/(복근|코어|abs|core|크런치|플랭크)/.test(text)) add("abs");

  return parts.length ? parts : ["full_body"];
}

const warmupStretchCatalog: Record<string, string[]> = {
  back: [
    "캣 카우 - 5분 (흉추를 천천히 말고 펴며 등 전체 가동성 확보)",
    "흉추 로테이션 스트레치 - 5분 (옆으로 누워 팔을 열며 등 회전 가동성 확보)",
    "월 슬라이드 - 5분 (벽에 등과 팔을 붙이고 견갑을 위아래로 움직임)",
    "차일드 포즈 랫 리치 - 5분 (손을 사선으로 뻗어 광배와 옆구리 늘리기)",
  ],
  shoulders: [
    "암 서클 - 5분 (작은 원에서 큰 원으로 어깨 관절을 천천히 회전)",
    "밴드 외회전 - 5분 (팔꿈치를 옆구리에 붙이고 회전근개 활성화)",
    "크로스 바디 숄더 스트레치 - 5분 (팔을 가슴 앞으로 당겨 후면 어깨 예열)",
    "월 슬라이드 - 5분 (팔꿈치와 손등을 벽에 붙이고 위아래로 이동)",
  ],
  chest: [
    "암 스윙 - 5분 (팔을 앞뒤로 교차하며 가슴과 어깨 앞쪽 예열)",
    "도어웨이 체스트 오프너 - 5분 (문틀에 팔을 대고 가슴 앞쪽 열기)",
    "밴드 체스트 오프너 - 5분 (밴드를 등 뒤로 잡고 가슴을 열기)",
    "월 체스트 스트레치 - 5분 (손을 벽에 대고 몸통을 반대로 돌리기)",
  ],
  arms: [
    "손목 플렉션 익스텐션 - 5분 (손목을 앞뒤로 천천히 움직임)",
    "엘보우 서클 - 5분 (팔꿈치를 굽힌 상태로 작은 원 회전)",
    "밴드 컬 워밍업 - 5분 (가벼운 저항으로 이두 활성화)",
    "밴드 프레스다운 워밍업 - 5분 (가벼운 저항으로 삼두 활성화)",
  ],
  legs: [
    "레그 스윙 전후 - 5분 (고관절을 접고 펴며 햄스트링 예열)",
    "레그 스윙 좌우 - 5분 (고관절 외전/내전 가동성 확보)",
    "스탠딩 햄스트링 스윕 - 5분 (뒤꿈치를 세우고 햄스트링을 부드럽게 쓸어내림)",
    "고관절 오프너 스트레치 - 5분 (고관절을 원형으로 천천히 열기)",
  ],
  glutes: [
    "피겨 포 다이내믹 스트레치 - 5분 (발목을 반대 무릎 위에 올리고 둔근을 부드럽게 늘림)",
    "90/90 힙 플로우 - 5분 (양쪽 고관절을 번갈아 회전)",
    "니 허그 스트레치 - 5분 (무릎을 가슴으로 당겨 둔근과 고관절 준비)",
    "힙 플렉서 락백 - 5분 (무릎을 대고 엉덩이를 뒤로 보내 고관절 가동성 확보)",
  ],
  abs: [
    "캣 카우 - 5분 (복압 잡기 전 척추 가동성 확보)",
    "코브라 프렙 스트레치 - 5분 (복부 앞쪽을 부드럽게 열기)",
    "사이드 벤드 스트레치 - 5분 (옆구리를 길게 늘리며 호흡)",
    "누운 척추 회전 스트레치 - 5분 (무릎을 넘기며 복사근과 허리 긴장 완화)",
  ],
  full_body: [
    "전신 관절 가동성 루틴 - 5분 (목, 어깨, 고관절, 발목을 순서대로 회전)",
    "흉추 로테이션 스트레치 - 5분 (등과 어깨 회전 가동성 확보)",
    "암 서클 - 5분 (어깨 관절을 전후 방향으로 회전)",
    "햄스트링 스윕 - 5분 (뒤꿈치를 세우고 다리 뒤쪽을 부드럽게 늘림)",
  ],
};

const cooldownStretchCatalog: Record<string, string[]> = {
  back: [
    "차일드 포즈 랫 스트레치 - 5분 (손을 멀리 뻗고 광배를 길게 늘림)",
    "크로스 바디 랫 스트레치 - 5분 (한쪽 팔을 사선으로 뻗어 옆구리 늘림)",
    "시티드 로테이션 스트레치 - 5분 (앉아서 흉추를 좌우로 천천히 회전)",
    "폼롤러 흉추 익스텐션 - 5분 (등 위쪽을 받치고 천천히 젖힘)",
  ],
  shoulders: [
    "크로스 바디 숄더 스트레치 - 5분 (팔을 가슴 앞으로 당겨 후면 어깨 이완)",
    "도어웨이 숄더 스트레치 - 5분 (문틀에 팔을 대고 어깨 앞쪽 이완)",
    "오버헤드 트라이셉스 스트레치 - 5분 (팔꿈치를 머리 뒤로 넘겨 삼두/어깨 이완)",
    "슬리퍼 스트레치 - 5분 (옆으로 누워 어깨 뒤쪽을 부드럽게 늘림)",
  ],
  chest: [
    "도어웨이 체스트 스트레치 - 5분 (문틀에 팔을 대고 가슴을 앞으로 열기)",
    "벤치 체스트 오프너 - 5분 (벤치에 팔을 올리고 가슴을 아래로 낮춤)",
    "폼롤러 체스트 오프너 - 5분 (폼롤러 위에 누워 팔을 벌림)",
    "바이셉 도어웨이 스트레치 - 5분 (팔을 뒤로 펴 가슴/이두 앞쪽 이완)",
  ],
  arms: [
    "오버헤드 트라이셉스 스트레치 - 5분 (팔꿈치를 머리 뒤로 넘겨 삼두 이완)",
    "월 바이셉 스트레치 - 5분 (손바닥을 벽에 대고 몸통을 반대로 회전)",
    "손목 굴곡근 스트레치 - 5분 (손바닥을 앞으로 밀어 전완 이완)",
    "손목 신전근 스트레치 - 5분 (손등을 앞으로 밀어 전완 바깥쪽 이완)",
  ],
  legs: [
    "스탠딩 햄스트링 스트레치 - 5분 (무릎을 살짝 펴고 엉덩이를 뒤로 뺌)",
    "쿼드 스트레치 - 5분 (발목을 잡고 허벅지 앞쪽 이완)",
    "카프 월 스트레치 - 5분 (벽을 밀며 종아리 이완)",
    "나비 자세 내전근 스트레치 - 5분 (발바닥을 맞대고 무릎을 낮춤)",
  ],
  glutes: [
    "피겨 포 스트레치 - 5분 (발목을 반대 무릎 위에 올려 둔근 이완)",
    "피전 포즈 - 5분 (한쪽 다리를 접고 엉덩이 바깥쪽 이완)",
    "니 투 체스트 스트레치 - 5분 (무릎을 가슴으로 당겨 둔근 이완)",
    "90/90 힙 스트레치 - 5분 (양쪽 고관절을 번갈아 열기)",
  ],
  abs: [
    "코브라 스트레치 - 5분 (복부를 길게 늘리고 허리는 과신전하지 않음)",
    "차일드 포즈 - 5분 (복압을 풀고 허리 긴장 완화)",
    "사이드 벤드 스트레치 - 5분 (옆구리를 길게 늘림)",
    "누운 척추 회전 스트레치 - 5분 (무릎을 넘겨 복사근/허리 이완)",
  ],
  full_body: [
    "차일드 포즈 - 5분 (등과 어깨 긴장 완화)",
    "다운독 카프 스트레치 - 5분 (종아리와 햄스트링 이완)",
    "누운 척추 회전 스트레치 - 5분 (허리와 흉추 이완)",
    "도어웨이 체스트 스트레치 - 5분 (가슴과 어깨 앞쪽 이완)",
  ],
};

function withStretchDuration(item: string, minutes: number) {
  return item.replace(/\d+\s*분/, `${minutes}분`);
}

function distributeMinutes(totalMinutes: number, itemCount: number) {
  if (totalMinutes <= 0 || itemCount <= 0) return [];
  const base = Math.floor(totalMinutes / itemCount);
  const remainder = totalMinutes % itemCount;
  return Array.from({ length: itemCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function buildDetailedStretchRoutine(day: any, phase: "warmup" | "cooldown", totalMinutes = 20) {
  if (totalMinutes <= 0) return [];
  const catalog = phase === "warmup" ? warmupStretchCatalog : cooldownStretchCatalog;
  const parts = getBodyPartsFromFocus(day);
  const selected: string[] = [];
  const maxItems = Math.min(4, Math.max(1, Math.ceil(totalMinutes / 5)));

  for (const part of parts) {
    for (const item of catalog[part] ?? catalog.full_body) {
      if (!selected.includes(item)) selected.push(item);
      if (selected.length >= maxItems) {
        const minutes = distributeMinutes(totalMinutes, selected.length);
        return selected.map((entry, index) => withStretchDuration(entry, minutes[index] ?? 5));
      }
    }
  }

  for (const item of catalog.full_body) {
    if (!selected.includes(item)) selected.push(item);
    if (selected.length >= maxItems) break;
  }

  const minutes = distributeMinutes(totalMinutes, selected.length);
  return selected.map((entry, index) => withStretchDuration(entry, minutes[index] ?? 5));
}

function isGenericStretchLine(value: string) {
  const text = String(value).toLowerCase();
  return /^(등|어깨|가슴|하체|팔|복근|전신|둔근|고관절)\s*스트레칭\s*-\s*(10|20)분/.test(text)
    || !/[()]/.test(text) && !/(포즈|밴드|월|암|레그|브릿지|로테이션|도어웨이|폼롤러|스윙|스캐풀라|스트레치|서클|카우|버그|독|플랭크|스쿼트|런지|피전|코브라|나비|카프)/.test(text);
}

function isNonStretchMovementLine(value: string) {
  return /(푸시업|푸쉬업|풀업|턱걸이|스쿼트|런지|데드\s*버그|버드\s*독|플랭크|브릿지|클램쉘|몬스터\s*워크|push\s*up|pull\s*up|squat|lunge|plank|bridge|dead\s*bug|bird\s*dog)/i.test(String(value));
}

function normalizeStretchBlock(day: any, phase: "warmup" | "cooldown", totalMinutes = 20) {
  const key = phase === "warmup" ? "warmupStretch" : "cooldownStretch";
  if (totalMinutes <= 0) return [];
  const items = Array.isArray(day?.[key]) ? day[key].map(String).filter(Boolean) : [];
  const totalIsTooSmall = items.length < 3;
  const hasGeneric = items.some(isGenericStretchLine);
  const hasNonStretchMovement = items.some(isNonStretchMovementLine);
  return totalIsTooSmall || hasGeneric || hasNonStretchMovement ? buildDetailedStretchRoutine(day, phase, totalMinutes) : items;
}

function isCardioExerciseText(value: string) {
  return /(유산소|러닝|런닝|트레드밀|사이클|자전거|로잉|일립티컬|계단|스텝밀|running|treadmill|cycling|bike|rowing|elliptical|stair)/i.test(String(value));
}

function isLegFocusedDay(day: any) {
  return isLegFocusText(String(day?.focus ?? ""));
}

function isLegFocusText(value: string) {
  return /(하체|다리|둔근|햄스트링|대퇴|종아리|leg|legs|glute|hamstring|quad|calf|스쿼트|런지|레그)/i.test(value);
}

function isFullBodyFocusText(value: string) {
  return /(전신|풀바디|full.?body|컨디셔닝|conditioning|혼합|hybrid)/i.test(value);
}

function isLegIsolationExerciseText(value: string) {
  return /(스쿼트|핵\s*스쿼트|핵스쿼트|런지|레그|하체|둔근|글루트|힙\s*쓰러스트|카프|종아리|햄스트링|쿼드|대퇴|내전근|외전근|hack\s*squat|squat|lunge|leg|glute|hip\s*thrust|calf|hamstring|quad|adductor|abductor)/i.test(String(value));
}

const recommendationBodyParts = ["chest", "back", "shoulders", "arms", "legs", "glutes", "abs", "cardio"] as const;
type RecommendationBodyPart = typeof recommendationBodyParts[number];
type ArmFocus = "biceps" | "triceps" | "both" | null;

function getArmFocus(value: string): ArmFocus {
  const text = String(value).toLowerCase();
  const wantsBiceps = /(이두|바이셉|bicep|biceps|컬|curl)/i.test(text);
  const wantsTriceps = /(삼두|트라이셉|tricep|triceps|익스텐션|프레스다운|extension|pressdown)/i.test(text);
  if (wantsBiceps && wantsTriceps) return "both";
  if (wantsBiceps) return "biceps";
  if (wantsTriceps) return "triceps";
  return null;
}

function getArmExerciseFocus(value: string): ArmFocus {
  const text = String(value).toLowerCase();
  const isBiceps = /(이두|바이셉|bicep|biceps|컬|curl|해머|hammer)/i.test(text);
  const isTriceps = /(삼두|트라이셉|tricep|triceps|익스텐션|프레스다운|킥백|extension|pressdown|kickback|skullcrusher|스컬)/i.test(text);
  if (isBiceps && isTriceps) return "both";
  if (isBiceps) return "biceps";
  if (isTriceps) return "triceps";
  return null;
}

function isArmExerciseAllowedForFocus(exerciseText: string, focusText: string) {
  const focus = getArmFocus(focusText);
  if (!focus || focus === "both") return true;
  const exerciseFocus = getArmExerciseFocus(exerciseText);
  return !exerciseFocus || exerciseFocus === focus;
}

function getFocusBodyParts(value: string): Set<RecommendationBodyPart> | null {
  const text = String(value).toLowerCase();
  if (isFullBodyFocusText(text)) return null;

  const parts = new Set<RecommendationBodyPart>();
  if (/(상체|upper)/i.test(text)) {
    parts.add("chest");
    parts.add("back");
    parts.add("shoulders");
    parts.add("arms");
  }
  if (/(가슴|흉근|체스트|chest|bench|벤치|push|푸시|푸쉬)/i.test(text)) parts.add("chest");
  if (/(등|광배|승모|후면|백|back|lat|row|pulldown|pull|풀|로우)/i.test(text)) parts.add("back");
  if (/(어깨|삼각근|숄더|이두|삼두|팔|shoulder|deltoid|bicep|tricep|arm|curl|컬)/i.test(text)) {
    if (/(어깨|삼각근|숄더|shoulder|deltoid)/i.test(text)) parts.add("shoulders");
    if (/(이두|삼두|팔|bicep|tricep|arm|curl|컬)/i.test(text)) parts.add("arms");
  }
  if (isLegFocusText(text)) parts.add("legs");
  if (/(둔근|엉덩|글루트|glute|hip|힙)/i.test(text)) parts.add("glutes");
  if (/(복근|코어|abs|core|크런치|싯업|플랭크|레그레이즈)/i.test(text)) parts.add("abs");
  if (/(유산소|cardio|러닝|트레드밀|사이클|로잉)/i.test(text)) parts.add("cardio");

  return parts.size ? parts : null;
}

function getExerciseBodyParts(value: string): Set<RecommendationBodyPart> {
  const text = String(value).toLowerCase();
  const parts = new Set<RecommendationBodyPart>();

  if (isCardioExerciseText(text)) parts.add("cardio");
  if (/(벤치|체스트|푸시업|푸쉬업|딥스|플라이|펙덱|chest|bench|push.?up|dip|fly|pec)/i.test(text)) parts.add("chest");
  if (/(로우|풀다운|랫|광배|티바|t바|시티드\s*로우|데드리프트|풀업|친업|row|pulldown|lat|deadlift|pull.?up|chin.?up)/i.test(text)) parts.add("back");
  if (/(숄더|어깨|레터럴|레이즈|리어\s*델트|오버헤드|밀리터리|shoulder|lateral|raise|rear\s*delt|overhead|military)/i.test(text)) parts.add("shoulders");
  if (/(이두|삼두|바이셉|트라이셉|컬|익스텐션|프레스다운|해머|bicep|tricep|curl|extension|pressdown|hammer)/i.test(text)) parts.add("arms");
  if (isLegIsolationExerciseText(text)) parts.add("legs");
  if (/(둔근|글루트|힙\s*쓰러스트|힙\s*어브덕션|glute|hip\s*thrust|hip\s*abduction)/i.test(text)) parts.add("glutes");
  if (/(복근|코어|크런치|싯업|레그\s*레이즈|행잉\s*니|플랭크|ab|abs|core|crunch|sit.?up|leg\s*raise|plank)/i.test(text)) parts.add("abs");

  return parts;
}

function mapCatalogBodyPart(bodyPart: string): RecommendationBodyPart | null {
  if (recommendationBodyParts.includes(bodyPart as RecommendationBodyPart)) return bodyPart as RecommendationBodyPart;
  return null;
}

function getExerciseBodyPartsFromCatalog(value: string, catalog: any[] = []) {
  const best = catalog
    .map((exercise: any) => ({ exercise, score: scoreExerciseMatch(value, exercise) }))
    .sort((a, b) => b.score - a.score)[0];
  const bodyPart = best && best.score >= 70 ? mapCatalogBodyPart(String(best.exercise.bodyPart)) : null;
  return bodyPart ? new Set<RecommendationBodyPart>([bodyPart]) : null;
}

function getRecommendationExerciseBodyParts(value: string, catalog: any[] = []) {
  const catalogParts = getExerciseBodyPartsFromCatalog(value, catalog);
  return catalogParts ?? getExerciseBodyParts(value);
}

function isExerciseAllowedForFocus(exerciseParts: Set<RecommendationBodyPart>, allowedParts: Set<RecommendationBodyPart> | null) {
  if (!allowedParts || exerciseParts.size === 0) return true;
  if (exerciseParts.has("cardio")) return true;
  for (const part of exerciseParts) {
    if (allowedParts.has(part)) return true;
  }
  return false;
}

function normalizeRecommendationExerciseKey(value: string) {
  return normalizeExerciseName(value)
    .replace(/\b\d+\s*(초|분)\b/g, "")
    .trim();
}

function dedupeRecommendationExercises(exercises: string[]) {
  const seen = new Set<string>();
  return exercises.filter((exercise) => {
    const key = normalizeRecommendationExerciseKey(exercise);
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCardioLineDuration(value: string, cardioMinutes: number) {
  const text = String(value).trim();
  if (cardioMinutes <= 0) return text;
  if (/\d+\s*분/.test(text)) return text.replace(/\d+\s*분/, `${cardioMinutes}분`);
  return `${text} - ${cardioMinutes}분`;
}

function getExerciseIdFromRecommendation(value: string) {
  const match = String(value).match(/(?:ID|id|#)\s*:?\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function getExerciseByCatalogId(id: number | null, catalog: any[] = []) {
  if (!id) return null;
  return catalog.find((exercise: any) => Number(exercise.id) === id) ?? null;
}

function extractPrescription(value: string) {
  const text = String(value);
  const strength = text.match(/(\d+\s*x\s*\d+\s*-\s*\d+\s*초)/i);
  if (strength) return strength[1].replace(/\s+/g, "");
  const timed = text.match(/(\d+\s*분)/);
  if (timed) return timed[1].replace(/\s+/g, "");
  return null;
}

function canonicalizeRecommendationExerciseLine(value: string, catalog: any[] = []) {
  const exercise = getExerciseByCatalogId(getExerciseIdFromRecommendation(value), catalog);
  if (!exercise) return String(value);
  const prescription = extractPrescription(value);
  const defaultLine = formatDefaultRecommendedExercise(exercise);
  if (!prescription) return defaultLine;
  if (String(exercise.bodyPart) === "cardio" || String(exercise.category) === "cardio") {
    return `${exercise.nameKo} (${exercise.name}) - ${prescription}`;
  }
  return `${exercise.nameKo} (${exercise.name}) - ${prescription}`;
}

function normalizeStrengthExerciseLine(value: string) {
  const text = String(value).trim();
  return /\d+\s*x\s*\d+/i.test(text) ? text.replace(/\s*-\s*\d+\s*분\s*$/i, "") : text;
}

function normalizeCardioExercises(exercises: string[], cardioMinutes: number, catalog: any[] = []) {
  let hasCardio = false;
  return exercises.flatMap((exercise) => {
    const catalogExercise = getExerciseByCatalogId(getExerciseIdFromRecommendation(exercise), catalog);
    const isCardio = catalogExercise
      ? catalogExercise.bodyPart === "cardio" || catalogExercise.category === "cardio"
      : isCardioExerciseText(exercise);
    const canonicalExercise = canonicalizeRecommendationExerciseLine(exercise, catalog);
    if (!isCardio) return [normalizeStrengthExerciseLine(canonicalExercise)];
    if (cardioMinutes <= 0 || hasCardio) return [];
    hasCardio = true;
    return [normalizeCardioLineDuration(canonicalExercise, cardioMinutes)];
  });
}

function getTargetStrengthExerciseCount(sessionDuration: number, warmupMinutes: number, cooldownMinutes: number, cardioMinutes: number) {
  const strengthMinutes = Math.max(20, sessionDuration - warmupMinutes - cooldownMinutes - Math.max(0, cardioMinutes));
  if (strengthMinutes <= 30) return 3;
  if (strengthMinutes <= 45) return 4;
  if (strengthMinutes <= 60) return 5;
  if (strengthMinutes <= 80) return 6;
  return 7;
}

function formatDefaultRecommendedExercise(exercise: any) {
  const bodyPart = String(exercise.bodyPart ?? "");
  if (bodyPart === "abs") return `${exercise.nameKo} (${exercise.name}) - 3x15 - 60초`;
  if (bodyPart === "arms" || bodyPart === "shoulders") return `${exercise.nameKo} (${exercise.name}) - 3x12 - 60초`;
  if (bodyPart === "legs" || bodyPart === "glutes") return `${exercise.nameKo} (${exercise.name}) - 4x10 - 90초`;
  return `${exercise.nameKo} (${exercise.name}) - 4x10 - 90초`;
}

function fillExercisesForDuration(day: any, exercises: string[], options: {
  exerciseCatalog?: any[];
  sessionDuration: number;
  warmupStretchMinutes: number;
  cooldownStretchMinutes: number;
  cardioMinutes: number;
  includeCore?: boolean;
}) {
  const focusText = String(day?.focus ?? "");
  const allowedParts = getFocusBodyParts(String(day?.focus ?? ""));
  const cardioExercises = exercises.filter((exercise) => isCardioExerciseText(exercise));
  const strengthExercises = exercises.filter((exercise) => !isCardioExerciseText(exercise));
  const targetCount = getTargetStrengthExerciseCount(
    options.sessionDuration,
    options.warmupStretchMinutes,
    options.cooldownStretchMinutes,
    cardioExercises.length ? options.cardioMinutes : 0,
  );
  const seen = new Set(strengthExercises.map(normalizeRecommendationExerciseKey));
  const filled = [...strengthExercises];

  if (filled.length < targetCount && options.exerciseCatalog?.length) {
    const candidates = options.exerciseCatalog.filter((exercise: any) => {
      const part = mapCatalogBodyPart(String(exercise.bodyPart));
      if (!part || part === "cardio") return false;
      if (exercise.bodyPart === "stretching" || exercise.category === "flexibility") return false;
      if (allowedParts && !allowedParts.has(part)) return false;
      if (part === "arms" && !isArmExerciseAllowedForFocus(`${exercise.nameKo} ${exercise.name}`, focusText)) return false;
      const key = normalizeRecommendationExerciseKey(`${exercise.nameKo} ${exercise.name}`);
      return key && !seen.has(key);
    });

    for (const candidate of candidates) {
      const line = formatDefaultRecommendedExercise(candidate);
      const key = normalizeRecommendationExerciseKey(line);
      if (seen.has(key)) continue;
      filled.push(line);
      seen.add(key);
      if (filled.length >= targetCount) break;
    }
  }

  const maxStrengthCount = Math.max(targetCount + 1, 4);
  const selectedStrength = filled.slice(0, maxStrengthCount);
  const needsCore = options.includeCore;
  const hasCore = selectedStrength.some((exercise) => getRecommendationExerciseBodyParts(exercise, options.exerciseCatalog ?? []).has("abs"));
  if (needsCore && !hasCore && options.exerciseCatalog?.length) {
    const coreExercise = options.exerciseCatalog.find((exercise: any) => {
      if (exercise.bodyPart !== "abs") return false;
      const key = normalizeRecommendationExerciseKey(`${exercise.nameKo} ${exercise.name}`);
      return key && !seen.has(key);
    });
    if (coreExercise) selectedStrength.push(formatDefaultRecommendedExercise(coreExercise));
  }

  return [...selectedStrength, ...cardioExercises];
}

function alignExercisesToDayFocus(weeklyPlan: any[], catalog: any[] = []) {
  const exercisesToMove = new Map<RecommendationBodyPart, string[]>();
  const normalizedDays = weeklyPlan.map((day) => {
    const focus = String(day?.focus ?? "");
    const allowedParts = getFocusBodyParts(focus);
    const exercises = Array.isArray(day.exercises) ? dedupeRecommendationExercises(day.exercises.map(String)) : [];
    if (!allowedParts || !exercises.length) return { ...day, exercises };

    const kept = exercises.filter((exercise: string) => {
      const exerciseParts = getRecommendationExerciseBodyParts(exercise, catalog);
      if (exerciseParts.has("arms") && !isArmExerciseAllowedForFocus(exercise, focus)) return false;
      if (isExerciseAllowedForFocus(exerciseParts, allowedParts)) return true;

      const movablePart = recommendationBodyParts.find((part) => part !== "cardio" && exerciseParts.has(part));
      if (movablePart) {
        exercisesToMove.set(movablePart, [...(exercisesToMove.get(movablePart) ?? []), exercise]);
      }
      return false;
    });
    return { ...day, exercises: kept };
  });

  if (!exercisesToMove.size) return normalizedDays;

  return normalizedDays.map((day) => {
    const allowedParts = getFocusBodyParts(String(day?.focus ?? ""));
    if (!allowedParts || !Array.isArray(day.exercises)) return day;

    const additions: string[] = [];
    for (const part of allowedParts) {
      additions.push(...(exercisesToMove.get(part) ?? []));
      exercisesToMove.delete(part);
    }

    return additions.length
      ? { ...day, exercises: dedupeRecommendationExercises([...day.exercises, ...additions]) }
      : day;
  });
}

function moveCardioOffLegDays(weeklyPlan: any[]) {
  const cardioToMove: string[] = [];
  const normalizedDays = weeklyPlan.map((day) => {
    if (!isLegFocusedDay(day)) return day;
    const exercises = Array.isArray(day.exercises) ? dedupeRecommendationExercises(day.exercises.map(String)) : [];
    const kept = exercises.filter((exercise: string) => {
      const isCardio = isCardioExerciseText(String(exercise));
      if (isCardio) cardioToMove.push(String(exercise));
      return !isCardio;
    });
    return { ...day, exercises: kept };
  });

  if (!cardioToMove.length) return normalizedDays;

  const cardioTargets = normalizedDays
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => !isLegFocusedDay(day) && Array.isArray(day.exercises));

  if (!cardioTargets.length) return normalizedDays;

  const additions = new Map<number, string[]>();
  cardioToMove.forEach((exercise, index) => {
    const target = cardioTargets[index % cardioTargets.length];
    additions.set(target.index, [...(additions.get(target.index) ?? []), exercise]);
  });

  return normalizedDays.map((day, index) => {
    const extraCardio = additions.get(index);
    if (!extraCardio?.length) return day;
    return { ...day, exercises: [...(Array.isArray(day.exercises) ? day.exercises : []), ...extraCardio] };
  });
}

function normalizeProgramRecommendation(program: any, options?: {
  avoidCardioOnLegDay?: boolean;
  exerciseCatalog?: any[];
  warmupStretchMinutes?: number;
  cooldownStretchMinutes?: number;
  cardioMinutes?: number;
  sessionDuration?: number;
  includeCore?: boolean;
}) {
  if (!program?.weeklyPlan || !Array.isArray(program.weeklyPlan)) return program;

  const bodyPartAlignedPlan = alignExercisesToDayFocus(program.weeklyPlan, options?.exerciseCatalog ?? []);
  const sourcePlan = options?.avoidCardioOnLegDay
    ? moveCardioOffLegDays(bodyPartAlignedPlan)
    : bodyPartAlignedPlan;
  const warmupStretchMinutes = options?.warmupStretchMinutes ?? 20;
  const cooldownStretchMinutes = options?.cooldownStretchMinutes ?? 20;
  const cardioMinutes = options?.cardioMinutes ?? 20;
  const sessionDuration = options?.sessionDuration ?? 60;

  return {
    ...program,
    weeklyPlan: sourcePlan.map((day: any, index: number) => {
      const exercises = Array.isArray(day.exercises) ? dedupeRecommendationExercises(day.exercises.map(String)) : [];
      const warmupStretch = Array.isArray(day.warmupStretch) ? day.warmupStretch : [];
      const cooldownStretch = Array.isArray(day.cooldownStretch) ? day.cooldownStretch : [];
      const mixedStretches = exercises.filter((item: string) => isStretchExerciseText(String(item)));
      const normalizedMainExercises = normalizeCardioExercises(
        exercises.filter((item: string) => !isStretchExerciseText(String(item))),
        cardioMinutes,
        options?.exerciseCatalog ?? [],
      );
      const mainExercises = fillExercisesForDuration(day, normalizedMainExercises, {
        exerciseCatalog: options?.exerciseCatalog,
        sessionDuration,
        warmupStretchMinutes,
        cooldownStretchMinutes,
        cardioMinutes,
        includeCore: options?.includeCore,
      });
      const sequenceLabel = `${index + 1}일차`;

      if (!warmupStretch.length && !cooldownStretch.length && mixedStretches.length) {
        const midpoint = Math.ceil(mixedStretches.length / 2);
        const nextDay = {
          ...day,
          day: sequenceLabel,
          duration: `${sessionDuration}분`,
          warmupStretch: mixedStretches.slice(0, midpoint),
          cooldownStretch: mixedStretches.slice(midpoint),
          exercises: mainExercises,
        };
        return {
          ...nextDay,
          warmupStretch: normalizeStretchBlock(nextDay, "warmup", warmupStretchMinutes),
          cooldownStretch: normalizeStretchBlock(nextDay, "cooldown", cooldownStretchMinutes),
        };
      }

      return {
        ...day,
        day: sequenceLabel,
        duration: `${sessionDuration}분`,
        warmupStretch: normalizeStretchBlock({ ...day, exercises: mainExercises, warmupStretch, cooldownStretch }, "warmup", warmupStretchMinutes),
        cooldownStretch: normalizeStretchBlock({ ...day, exercises: mainExercises, warmupStretch, cooldownStretch }, "cooldown", cooldownStretchMinutes),
        exercises: mainExercises,
      };
    }),
  };
}

function getPlanDayOrder(dayLabel: string) {
  const match = String(dayLabel).match(/(\d+)/);
  return match ? Number(match[1]) : 99;
}

function formatRecommendationGoal(goals: any[], goal: any, daysPerWeekFallback = 3) {
  if (goals.length) {
    return `목표: ${goals.map((item: any) => goalLabels[item.goal] ?? item.goal).join(", ")}, 주 ${goals[0]?.weeklyWorkouts ?? daysPerWeekFallback}회 운동`;
  }
  if (goal) {
    return `목표: ${goalLabels[goal.goal] ?? goal.goal}, 주 ${goal.weeklyWorkouts ?? daysPerWeekFallback}회 운동`;
  }
  return "목표 미설정 (일반 건강 관리)";
}

function summarizeWorkoutHistoryForPrompt(sessions: any[], logsBySession: any[][]) {
  if (!sessions.length) return "최근 운동 기록 없음";
  return sessions.map((session, index) => {
    const logs = logsBySession[index] ?? [];
    const names = logs
      .map((log: any) => log.exercise?.nameKo ?? log.exercise?.name)
      .filter(Boolean)
      .slice(0, 8)
      .join(", ");
    const date = session.workoutDate ?? session.startedAt ?? session.completedAt;
    return `- ${new Date(date).toLocaleDateString("ko-KR")}: ${session.name ?? "운동 세션"}${names ? ` (${names})` : ""}`;
  }).join("\n");
}

function buildNutritionStrategy(goalValues: string[], tdee: number, latestWeight?: number) {
  const goals = new Set(goalValues);
  const hasHypertrophy = goals.has("hypertrophy");
  const hasFatLoss = goals.has("fat_loss");
  const hasStrength = goals.has("strength");
  const hasEndurance = goals.has("endurance");

  let label = "일반 건강";
  let description = "유지 칼로리 근처에서 균형 잡힌 식단";
  let calories = tdee;
  let proteinTarget = latestWeight ? Math.round(latestWeight * 1.6) : 120;

  if (hasHypertrophy && hasFatLoss) {
    label = "바디 리컴포지션 / 상승 다이어트";
    description = "근육량은 최대한 유지하거나 늘리면서 체지방을 천천히 줄이는 전략";
    calories = Math.round(tdee * 0.95);
    proteinTarget = latestWeight ? Math.round(latestWeight * 2.1) : 160;
  } else if (hasHypertrophy) {
    label = "린매스업";
    description = "체지방 증가를 억제하면서 근육량 증가를 노리는 소폭 칼로리 흑자";
    calories = Math.round(tdee * 1.08);
    proteinTarget = latestWeight ? Math.round(latestWeight * 1.9) : 150;
  } else if (hasFatLoss) {
    label = "다이어트";
    description = "근손실을 줄이기 위해 단백질을 높게 잡는 체지방 감량 전략";
    calories = Math.round(tdee * 0.8);
    proteinTarget = latestWeight ? Math.round(latestWeight * 2.0) : 150;
  } else if (hasStrength) {
    label = "근력 향상";
    description = "훈련 퍼포먼스와 회복을 우선하는 유지~소폭 흑자 전략";
    calories = Math.round(tdee * 1.03);
    proteinTarget = latestWeight ? Math.round(latestWeight * 1.8) : 140;
  } else if (hasEndurance) {
    label = "지구력 향상";
    description = "훈련량을 버틸 수 있게 탄수화물 비중을 충분히 확보하는 전략";
    calories = Math.round(tdee * 1.0);
    proteinTarget = latestWeight ? Math.round(latestWeight * 1.6) : 120;
  }

  return {
    label,
    description,
    calories,
    proteinTarget,
  };
}

function scoreExerciseMatch(query: string, exercise: any) {
  const target = normalizeExerciseName(query);
  const names = [exercise.nameKo, exercise.name].filter(Boolean).map((item) => normalizeExerciseName(String(item)));
  let best = 0;
  for (const name of names) {
    if (!name) continue;
    if (target === name) best = Math.max(best, 100);
    if (target.includes(name) || name.includes(target)) best = Math.max(best, 80);
    const targetWords = new Set(target.split(" ").filter((word) => word.length > 1));
    const nameWords = name.split(" ").filter((word) => word.length > 1);
    const overlap = nameWords.filter((word) => targetWords.has(word)).length;
    if (overlap > 0) best = Math.max(best, 30 + overlap * 12);
  }
  return best;
}

async function findExerciseForRoutine(exerciseText: string) {
  const exercises = await getExercises({ search: exerciseText });
  const allCandidates = exercises.length ? exercises : await getExercises();
  const best = allCandidates
    .map((exercise: any) => ({ exercise, score: scoreExerciseMatch(exerciseText, exercise) }))
    .sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 35 ? best.exercise : null;
}

async function findStretchExerciseForRoutine(stretchText: string) {
  const exact = await findExerciseForRoutine(stretchText);
  if (exact?.id) return exact;

  const target = getDetailedStretchTarget({
    name: stretchText,
    nameKo: stretchText,
    bodyPart: "stretching",
    primaryMuscles: [],
    secondaryMuscles: [],
  });
  const candidates = await getExercises({ search: target });
  const fallback = candidates.find((exercise: any) => exercise.bodyPart === "stretching" || exercise.category === "flexibility")
    ?? (await getExercises({ bodyPart: "stretching" }))[0]
    ?? (await getExercises({ search: "스트레칭" }))[0];
  return fallback ?? null;
}

function getMinutesFromText(value: string, fallback = 5) {
  const match = String(value).match(/(\d+)\s*분/);
  return match ? Number(match[1]) : fallback;
}

function isTimedRoutineExercise(exercise: any) {
  return exercise?.bodyPart === "cardio"
    || exercise?.category === "cardio"
    || exercise?.bodyPart === "stretching"
    || exercise?.category === "flexibility";
}

function toArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getDetailedStretchTarget(exercise: any) {
  const haystack = [
    exercise.name,
    exercise.nameKo,
    exercise.bodyPart,
    ...toArrayValue(exercise.primaryMuscles),
    ...toArrayValue(exercise.secondaryMuscles),
  ].join(" ").toLowerCase();

  if (/(chest|pectoral|가슴|체스트)/.test(haystack)) return "가슴 스트레칭";
  if (/(lat|back|rhomboid|traps|등|광배|백|트랩)/.test(haystack)) return "등 스트레칭";
  if (/(shoulder|deltoid|rotator|어깨|숄더|델트)/.test(haystack)) return "어깨 스트레칭";
  if (/(bicep|tricep|forearm|wrist|arm|팔|이두|삼두|트라이셉|바이셉|리스트)/.test(haystack)) return "팔/손목 스트레칭";
  if (/(hamstring|quad|calf|adductor|abductor|groin|leg|하체|햄스트링|쿼드|카프|어덕터|앱덕터|그로인)/.test(haystack)) return "하체 스트레칭";
  if (/(glute|hip|둔근|힙|고관절)/.test(haystack)) return "둔근/고관절 스트레칭";
  if (/(abdominal|oblique|abs|core|복근|코어|오블리크)/.test(haystack)) return "복근/코어 스트레칭";
  if (/(neck|목|넥)/.test(haystack)) return "목 스트레칭";
  return "전신 스트레칭";
}

function getRecommendationEquipmentSet(location: string, equipment: string[]) {
  const selected = equipment.length ? equipment : ["dumbbell", "barbell", "machine", "cable", "resistance_band", "kettlebell"];
  if (location === "outdoor") return new Set(["bodyweight", "none"]);
  if (location === "home") return new Set(["bodyweight", "none", ...selected]);
  return new Set(["bodyweight", "none", ...selected]);
}

function formatCatalogExercise(exercise: any) {
  const equipment = equipmentLabels[exercise.equipment] ?? exercise.equipment;
  const bodyPart = bodyPartLabels[exercise.bodyPart] ?? exercise.bodyPart;
  const category = exercise.category === "flexibility" || exercise.bodyPart === "stretching"
    ? getDetailedStretchTarget(exercise)
    : bodyPart;
  return `ID:${exercise.id} | ${exercise.nameKo} (${exercise.name}) | ${category} | ${equipment}`;
}

async function buildRecommendationExerciseCatalog(input: {
  location: "gym" | "home" | "outdoor";
  equipment: string[];
  excludedBodyParts: string[];
  includeCardio: boolean;
  includeCore: boolean;
}) {
  const allExercises = await getExercises();
  const allowedEquipment = getRecommendationEquipmentSet(input.location, input.equipment);
  const excluded = new Set(input.excludedBodyParts);

  const usable = allExercises.filter((exercise: any) => {
    if (!allowedEquipment.has(exercise.equipment)) return false;
    if (excluded.has(exercise.bodyPart)) return false;
    if (!input.includeCardio && exercise.bodyPart === "cardio") return false;
    if (!input.includeCore && exercise.bodyPart === "abs") return false;
    return true;
  });

  const primary = usable.filter((exercise: any) => exercise.bodyPart !== "stretching" && exercise.category !== "flexibility");
  const stretches = usable.filter((exercise: any) => exercise.bodyPart === "stretching" || exercise.category === "flexibility");

  const lines: string[] = [];
  for (const bodyPart of ["chest", "back", "shoulders", "arms", "legs", "glutes", "abs", "cardio", "full_body"]) {
    const items = primary.filter((exercise: any) => exercise.bodyPart === bodyPart).slice(0, 14);
    if (!items.length) continue;
    lines.push(`\n[${bodyPartLabels[bodyPart] ?? bodyPart}]`);
    lines.push(...items.map(formatCatalogExercise));
  }

  const stretchGroups = new Map<string, any[]>();
  for (const exercise of stretches) {
    const target = getDetailedStretchTarget(exercise);
    const items = stretchGroups.get(target) ?? [];
    if (items.length < 5) items.push(exercise);
    stretchGroups.set(target, items);
  }
  if (stretchGroups.size) {
    lines.push("\n[부위별 스트레칭 후보]");
    for (const [target, items] of stretchGroups.entries()) {
      lines.push(`${target}: ${items.map((exercise) => `${exercise.nameKo} (${exercise.name})`).join(", ")}`);
    }
  }

  return {
    count: usable.length,
    text: lines.join("\n").trim(),
    exercises: usable,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ EXERCISES ============
  exercises: router({
    list: publicProcedure
      .input(
        z.object({
          bodyPart: z.string().optional(),
          equipment: z.string().optional(),
          category: z.string().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await getExercises(input);
      }),

    detail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const exercise = await getExerciseById(input.id);
        if (!exercise) return null;
        const rawKo = (exercise as any).instructionsKo;
        const instructionsKo: string[] | null = Array.isArray(rawKo) && rawKo.length > 0
          ? rawKo
          : typeof rawKo === 'string'
            ? (() => { try { const p = JSON.parse(rawKo); return Array.isArray(p) && p.length > 0 ? p : null; } catch { return null; } })()
            : null;
        return {
          ...exercise,
          // instructionsKo가 있으면 instructions를 한국어로 교체
          instructions: instructionsKo ?? exercise.instructions,
          instructionsKo: instructionsKo,
        } as any;
      }),
  }),

  // ============ USER GOALS ============
  goals: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getUserGoal(ctx.user.id);
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserGoals(ctx.user.id);
    }),

    set: protectedProcedure
      .input(
        z.object({
          goal: z.enum(["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"]),
          goals: z.array(z.enum(["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"])).optional(),
          weeklyWorkouts: z.number().min(1).max(7),
          targetWeight: z.number().optional(),
          heightCm: z.number().min(100).max(250).optional(),
          gender: z.enum(["male", "female"]).optional(),
          birthYear: z.number().min(1920).max(2010).optional(),
          experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const goals = input.goals?.length ? input.goals : [input.goal];
        await replaceUserGoals(ctx.user.id, goals, input.weeklyWorkouts, input.targetWeight, input.heightCm, input.gender, input.birthYear);
        if (input.experienceLevel) {
          await setUserPreference(ctx.user.id, "experienceLevel", input.experienceLevel);
        }
        return { success: true };
      }),
  }),

  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        experienceLevel: await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner",
      };
    }),
    set: protectedProcedure
      .input(z.object({
        experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await setUserPreference(ctx.user.id, "experienceLevel", input.experienceLevel);
        return { success: true };
      }),
  }),

  // ============ ROUTINES ============
  routines: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getRoutinesByUser(ctx.user.id);
    }),

    detail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const routine = await getRoutineById(input.id);
        if (!routine || routine.userId !== ctx.user.id) return null;
        const exercises = (await getRoutineExercises(input.id)).map((item: any) => ({
          ...item,
          re: item.routineExercise,
          ex: item.exercise,
        }));
        return { ...routine, exercises } as any;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().optional(),
          goal: z.enum(["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"]),
          daysPerWeek: z.number().min(1).max(7),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createRoutine(ctx.user.id, input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().optional(),
          goal: z.enum(["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"]).optional(),
          daysPerWeek: z.number().min(1).max(7).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const routine = await getRoutineById(input.id);
        if (!routine || routine.userId !== ctx.user.id) throw new Error("Not found");
        await updateRoutine(input.id, input);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const routine = await getRoutineById(input.id);
        if (!routine || routine.userId !== ctx.user.id) throw new Error("Not found");
        await deleteRoutine(input.id);
        return { success: true };
      }),

    addExercise: protectedProcedure
      .input(
        z.object({
          routineId: z.number(),
          exerciseId: z.number(),
          order: z.number(),
          sets: z.number().default(3),
          reps: z.number().default(10),
          restSeconds: z.number().default(90),
          setDetails: z.array(z.object({
            setNumber: z.number(),
            weightKg: z.number().optional(),
            reps: z.number().optional(),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const routine = await getRoutineById(input.routineId);
        if (!routine || routine.userId !== ctx.user.id) throw new Error("Not found");
        await addExerciseToRoutine(input.routineId, input.exerciseId, input.order, input.sets, input.reps, input.restSeconds, input.setDetails);
        return { success: true };
      }),

    removeExercise: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const routineExercise = await getRoutineExerciseById(input.id);
        if (!routineExercise || routineExercise.userId !== ctx.user.id) throw new Error("Not found");
        await removeExerciseFromRoutine(input.id);
        return { success: true };
      }),

    updateExercise: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          exerciseId: z.number().optional(),
          sets: z.number().min(1).max(100).optional(),
          reps: z.number().min(1).max(999).optional(),
          restSeconds: z.number().min(0).max(3600).optional(),
          setDetails: z.array(z.object({
            setNumber: z.number(),
            weightKg: z.number().optional(),
            reps: z.number().optional(),
          })).optional(),
          notes: z.string().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const routineExercise = await getRoutineExerciseById(input.id);
        if (!routineExercise || routineExercise.userId !== ctx.user.id) throw new Error("Not found");
        await updateRoutineExercise(input.id, input);
        return { success: true };
      }),

    reorderExercises: protectedProcedure
      .input(
        z.object({
          routineId: z.number(),
          items: z.array(z.object({
            id: z.number(),
            order: z.number().int().min(1).max(500),
          })).min(1).max(500),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const routine = await getRoutineById(input.routineId);
        if (!routine || routine.userId !== ctx.user.id) throw new Error("Not found");
        const existingIds = new Set(
          (await getRoutineExercises(input.routineId)).map((item: any) => item.routineExercise.id),
        );
        if (input.items.some((item) => !existingIds.has(item.id))) throw new Error("Invalid routine exercise");
        await reorderRoutineExercises(input.routineId, input.items);
        return { success: true };
      }),
  }),

  // ============ WORKOUT ============
  workout: router({
    startSession: protectedProcedure
      .input(
        z.object({
          routineId: z.number().optional(),
          name: z.string().optional(),
          workoutDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const sessionId = await createWorkoutSession(ctx.user.id, input);
        return { sessionId };
      }),

    completeSession: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          durationMinutes: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        await completeWorkoutSession(input.sessionId, input.durationMinutes, input.notes);
        return { success: true };
      }),

    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        await deleteWorkoutSession(input.sessionId);
        return { success: true };
      }),

    addLog: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          exerciseId: z.number(),
          setNumber: z.number(),
          reps: z.number().optional(),
          weightKg: z.number().optional(),
          durationSeconds: z.number().optional(),
          distanceM: z.number().optional(),
          isWarmup: z.boolean().optional(),
          rpe: z.number().min(1).max(10).optional(),
          memo: z.string().max(200).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        const logId = await addWorkoutLog(input);
        return { logId };
      }),

    deleteLog: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWorkoutLog(input.logId);
        return { success: true };
      }),

    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) return null;
        const logs = await getWorkoutLogsBySession(input.sessionId);
        return { ...session, logs } as any;
      }),

    recentSessions: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await getWorkoutSessionsByUser(ctx.user.id, input.limit);
      }),

    saveSessionAsRoutine: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        name: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        const logs = await getWorkoutLogsBySession(input.sessionId);
        if (!logs.length) throw new Error("No workout logs");

        const goal = await getUserGoal(ctx.user.id);
        const grouped = new Map<number, any[]>();
        for (const item of logs) {
          const exerciseId = item.log.exerciseId;
          if (!grouped.has(exerciseId)) grouped.set(exerciseId, []);
          grouped.get(exerciseId)!.push(item.log);
        }

        const routineId = await createRoutine(ctx.user.id, {
          name: input.name,
          description: input.description ?? `운동 세션 '${session.name ?? "운동"}'에서 저장한 루틴`,
          goal: goal?.goal ?? "general",
          daysPerWeek: 1,
        });

        let order = 1;
        for (const [exerciseId, sets] of grouped.entries()) {
          const sortedSets = sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0));
          await addExerciseToRoutine(
            routineId,
            exerciseId,
            order,
            sortedSets.length,
            sortedSets[0]?.reps ?? 10,
            90,
            sortedSets.map((set, index) => ({
              setNumber: index + 1,
              weightKg: set.weightKg ?? undefined,
              reps: set.reps ?? undefined,
            })),
          );
          order += 1;
        }

        return { success: true, routineId };
      }),
  }),

  // ============ HISTORY ============
  history: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return await getUserStats(ctx.user.id);
    }),

    calendar: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const from = new Date(input.year, input.month - 1, 1);
        const to = new Date(input.year, input.month, 0, 23, 59, 59);
        return await getSessionsInDateRange(ctx.user.id, from, to);
      }),

    exerciseProgress: protectedProcedure
      .input(z.object({ exerciseId: z.number(), limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return await getExerciseHistory(ctx.user.id, input.exerciseId, input.limit);
      }),

    recentWorkouts: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        const sessions = await getWorkoutSessionsByUser(ctx.user.id, input.limit);
        const result: any[] = [];
        for (const session of sessions) {
          const logs = await getWorkoutLogsBySession(session.id);
          result.push({ ...session, logs });
        }
        return result;
      }),
  }),

  // ============ STREAK & MONTHLY STATS & PR ============
  streak: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getWorkoutStreak(ctx.user.id);
    }),
  }),

  monthlyStats: router({
    get: protectedProcedure
      .input(z.object({ months: z.number().default(6) }))
      .query(async ({ ctx, input }) => {
        return await getMonthlyStats(ctx.user.id, input.months);
      }),
  }),

  pr: router({
    check: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await checkPRs(ctx.user.id, input.sessionId);
      }),
  }),

  weeklyGoals: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getWeeklyStats(ctx.user.id);
    }),
  }),

  // ============ WEEKLY GOALS ============

  // ============ EXERCISE GOALS ============
  exerciseGoals: router({
    set: protectedProcedure
      .input(z.object({
        exerciseId: z.number(),
        targetWeightKg: z.number().optional(),
        targetReps: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { upsertExerciseGoal } = await import("./db");
        await upsertExerciseGoal(ctx.user.id, input.exerciseId, {
          targetWeightKg: input.targetWeightKg,
          targetReps: input.targetReps,
          notes: input.notes,
        });
        return { success: true };
      }),

    get: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getExerciseProgress } = await import("./db");
        return await getExerciseProgress(ctx.user.id, input.exerciseId);
      }),
  }),

  // ============ FAVORITES ============
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getFavorites(ctx.user.id);
    }),

    toggle: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const added = await toggleFavorite(ctx.user.id, input.exerciseId);
        return { added };
      }),

    check: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await isFavorite(ctx.user.id, input.exerciseId);
      }),
  }),

  // ============ BODY WEIGHT ============
  bodyWeight: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        return await getBodyWeights(ctx.user.id, input.limit);
      }),

    add: protectedProcedure
      .input(z.object({
        weightKg: z.number().min(20).max(300),
        bodyFatPct: z.number().min(0).max(100).optional(),
        muscleMassPct: z.number().min(0).max(100).optional(),
        notes: z.string().max(200).optional(),
        recordedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await addBodyWeight(ctx.user.id, input);
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteBodyWeight(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ AI RECOMMENDATIONS ============
  ai: router({
    weightRecommendation: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const exercise = await getExerciseById(input.exerciseId);
        if (!exercise) return null;

        const history = await getExerciseHistory(ctx.user.id, input.exerciseId, 5);
        const goal = await getUserGoal(ctx.user.id);
        const goals = await getUserGoals(ctx.user.id);
        const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";

        if (history.length === 0) {
          return {
            recommendation: null,
            message: "아직 기록이 없습니다. 첫 번째 운동을 기록해보세요!",
            history: [],
          };
        }

        const historyText = history
          .map((h) => {
            const sets = h.logs.map((l: any) => `${l.reps}회 × ${l.weightKg}kg`).join(", ");
            return `${h.date ? new Date(h.date).toLocaleDateString("ko-KR") : "날짜 미상"}: ${sets}`;
          })
          .join("\n");

        const goalText = goals.length
          ? `사용자 목표: ${goals.map((item: any) => item.goal).join(", ")}`
          : goal ? `사용자 목표: ${goal.goal}` : "목표 미설정";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `당신은 전문 퍼스널 트레이너입니다. 사용자의 운동 기록을 분석하여 다음 운동에서의 무게와 세트 수를 추천해주세요. 
              응답은 반드시 JSON 형식으로 해주세요.`,
            },
            {
              role: "user",
              content: `운동: ${exercise.nameKo} (${exercise.name})
${goalText}
숙련도: ${experienceLevel}

최근 운동 기록:
${historyText}

위 기록을 분석하여 다음 운동에서의 추천 무게, 세트 수, 반복 횟수를 알려주세요.
또한 진행 상황에 대한 간단한 피드백도 제공해주세요.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "weight_recommendation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  recommendedWeight: { type: "number", description: "추천 무게 (kg)" },
                  recommendedSets: { type: "number", description: "추천 세트 수" },
                  recommendedReps: { type: "number", description: "추천 반복 횟수" },
                  progressFeedback: { type: "string", description: "진행 상황 피드백" },
                  tip: { type: "string", description: "운동 팁" },
                },
                required: ["recommendedWeight", "recommendedSets", "recommendedReps", "progressFeedback", "tip"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : null;
        let parsed = null;
        try { parsed = content ? JSON.parse(content) : null; } catch { parsed = null; }

        return {
          recommendation: parsed,
          history,
          exercise,
        };
      }),

    dailyWorkoutRecommendation: protectedProcedure
      .input(z.object({
        location: z.enum(["gym", "home", "outdoor"]).default("gym"),
        equipment: z.array(z.string()).default([]),
        sessionDuration: z.number().int().min(20).max(180).default(60),
        targetBodyParts: z.array(z.enum(["chest", "back", "shoulders", "arms", "legs", "glutes", "abs"])).min(1).max(5),
        includeCardio: z.boolean().default(false),
        includeCore: z.boolean().default(true),
        warmupStretchMinutes: z.number().int().min(0).max(40).default(10),
        cooldownStretchMinutes: z.number().int().min(0).max(40).default(10),
        cardioMinutes: z.number().int().min(0).max(90).default(20),
        intensity: z.enum(["light", "normal", "hard"]).default("normal"),
        customRequest: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const goal = await getUserGoal(ctx.user.id);
        const goals = await getUserGoals(ctx.user.id);
        const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";
        const stats = await getUserStats(ctx.user.id);
        const recentSessions = await getWorkoutSessionsByUser(ctx.user.id, 8);
        const logsBySession = await Promise.all(recentSessions.map((session: any) => getWorkoutLogsBySession(session.id)));
        const recommendationCatalog = await buildRecommendationExerciseCatalog({
          location: input.location,
          equipment: input.location === "outdoor" ? ["bodyweight"] : input.equipment,
          excludedBodyParts: [],
          includeCardio: input.includeCardio,
          includeCore: input.includeCore,
        });

        const targetFocus = input.targetBodyParts.map((part) => bodyPartLabels[part] ?? part).join("/");
        const locationLabels: Record<string, string> = {
          gym: "헬스장",
          home: "홈트레이닝",
          outdoor: "야외",
        };
        const equipmentText = input.location === "outdoor"
          ? "사용 가능 기구: 맨몸/야외 환경"
          : input.equipment.length
            ? `사용 가능 기구: ${input.equipment.map((item) => equipmentLabels[item] || item).join(", ")}`
            : "사용 가능 기구: 맨몸";
        const recentHistoryText = summarizeWorkoutHistoryForPrompt(recentSessions, logsBySession);
        const cardioText = input.includeCardio
          ? `유산소 포함: ${input.cardioMinutes}분. 단, 하체가 주요 타겟이면 고강도 유산소는 제외하고 저강도 또는 생략.`
          : "유산소 제외";
        const targetExerciseCount = getTargetStrengthExerciseCount(
          input.sessionDuration,
          input.warmupStretchMinutes,
          input.cooldownStretchMinutes,
          input.includeCardio ? input.cardioMinutes : 0,
        );
        const coreText = input.includeCore ? "복근/코어 필요 시 포함" : "복근/코어 제외";
        const intensityText = {
          light: "가볍게 회복 중심",
          normal: "보통 강도",
          hard: "강도 높게",
        }[input.intensity];

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `당신은 전문 퍼스널 트레이너입니다. 사용자가 오늘 바로 수행할 1회 운동만 추천하세요.
              - 아래 "사용 가능한 운동 DB 후보"에 있는 운동명만 추천하세요. 새 운동명을 지어내지 마세요.
              - exercises의 각 항목은 반드시 사용 가능한 운동 DB 후보의 ID를 포함해 "ID:123 | 한국어 운동명 (영어 운동명) - 세트x횟수 - 휴식" 형식으로 작성하세요.
              - focus는 사용자가 고른 타겟 부위만 반영하세요.
              - exercises에는 focus와 맞는 메인/보조 운동만 넣으세요. 타겟 외 부위 운동을 섞지 마세요.
              - 이두를 요청한 날에는 삼두 운동을 넣지 말고, 삼두를 요청한 날에는 이두 운동을 넣지 마세요. "팔" 또는 "이두/삼두"라고 명시된 경우에만 둘 다 넣으세요.
              - 복근/코어가 focus에 있거나 복근 포함이 켜져 있으면 해당 날 exercises에 복근 운동을 반드시 1개 이상 포함하세요.
              - exercises의 근력 운동은 ${targetExerciseCount}개 안팎으로 구성하세요. 너무 적게 만들지 마세요.
              - 근력 운동은 "ID:123 | 한국어 운동명 (영어 운동명) - 세트x횟수 - 휴식" 형식으로 작성하세요.
              - 유산소는 세트/횟수가 아니라 "ID:123 | 러닝, 트레드밀 (Running, Treadmill) - ${input.cardioMinutes}분"처럼 시간 형식으로 작성하세요.
              - 유산소는 하루에 한 줄만 허용합니다.
              - 하체/둔근이 타겟인 날에는 러닝, 트레드밀, 사이클, 로잉 같은 유산소를 넣지 않거나 아주 가볍게만 넣으세요.
              - warmupStretch는 운동 전 동적 스트레칭/가동성 루틴 총 ${input.warmupStretchMinutes}분, cooldownStretch는 운동 후 정적 스트레칭 총 ${input.cooldownStretchMinutes}분으로 구성하세요.
              - 스트레칭 블록에는 푸시업, 풀업, 스쿼트, 런지, 플랭크, 브릿지 같은 운동/근력 동작을 넣지 마세요.
              - 최근 운동 기록을 보고 같은 부위를 과도하게 연속 자극하지 않도록 볼륨을 조정하세요.
              응답은 반드시 JSON 형식으로 해주세요.`,
            },
            {
              role: "user",
              content: `사용자 정보:
${formatRecommendationGoal(goals, goal)}
숙련도: ${experienceLevel}
운동 통계: ${stats ? `총 ${stats.totalSessions}회, 최근 7일 ${stats.recentSessionCount}회, 총 볼륨 ${stats.totalVolume}kg` : "운동 기록 없음"}

오늘 운동 조건:
타겟 부위: ${targetFocus}
장소: ${locationLabels[input.location]}
${equipmentText}
가능 시간: ${input.sessionDuration}분
메인 근력 운동 개수 목표: ${targetExerciseCount}개
강도: ${intensityText}
${cardioText}
${coreText}. 복근/코어가 오늘 타겟이면 복근 운동 1개 이상 필수.
운동 전 스트레칭: ${input.warmupStretchMinutes}분
운동 후 스트레칭: ${input.cooldownStretchMinutes}분
추가 요청: ${input.customRequest?.trim() || "없음"}

최근 운동 기록:
${recentHistoryText}

사용 가능한 운동 DB 후보 (${recommendationCatalog.count}개 중 추천용 요약):
${recommendationCatalog.text}

오늘 1회 운동을 추천해주세요. 타겟 부위(${targetFocus}) 밖의 근력 운동은 넣지 말고, 최근 기록을 고려해 볼륨과 강도를 조절해주세요.
exercises에는 반드시 DB 후보의 ID를 포함하세요. ID가 없는 운동명은 사용하지 마세요.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "daily_workout_recommendation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  focus: { type: "string", description: "오늘 운동 포커스" },
                  warmupStretch: { type: "array", items: { type: "string" }, description: "운동 전 스트레칭" },
                  exercises: { type: "array", items: { type: "string" }, description: "오늘 메인 운동 목록" },
                  cooldownStretch: { type: "array", items: { type: "string" }, description: "운동 후 스트레칭" },
                  duration: { type: "string", description: "예상 운동 시간" },
                  reason: { type: "string", description: "최근 기록과 조건을 반영한 추천 이유" },
                  caution: { type: "string", description: "주의사항" },
                },
                required: ["focus", "warmupStretch", "exercises", "cooldownStretch", "duration", "reason", "caution"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        let parsed = null;
        try { parsed = content ? JSON.parse(content) : null; } catch { parsed = null; }
        const normalized = normalizeProgramRecommendation({
          weeklyPlan: [{
            day: "오늘",
            focus: targetFocus,
            warmupStretch: parsed?.warmupStretch ?? [],
            exercises: parsed?.exercises ?? [],
            cooldownStretch: parsed?.cooldownStretch ?? [],
            duration: parsed?.duration ?? `${input.sessionDuration}분`,
          }],
          generalAdvice: parsed?.reason ?? "",
          recoveryTip: parsed?.caution ?? "",
        }, {
          avoidCardioOnLegDay: true,
          exerciseCatalog: recommendationCatalog.exercises,
          warmupStretchMinutes: input.warmupStretchMinutes,
          cooldownStretchMinutes: input.cooldownStretchMinutes,
          cardioMinutes: input.includeCardio ? input.cardioMinutes : 0,
          sessionDuration: input.sessionDuration,
          includeCore: input.includeCore,
        });

        return {
          workout: normalized?.weeklyPlan?.[0] ?? null,
          reason: parsed?.reason ?? normalized?.generalAdvice ?? "",
          caution: parsed?.caution ?? normalized?.recoveryTip ?? "",
          stats,
          catalogCount: recommendationCatalog.count,
        };
      }),

    programRecommendation: protectedProcedure
      .input(z.object({
        location: z.enum(["gym", "home", "outdoor"]).default("gym"),
        equipment: z.array(z.string()).default([]),
        sessionDuration: z.number().int().min(20).max(180).default(60),
        daysPerWeek: z.number().int().min(1).max(7).default(3),
        splitPreference: z.string().default("auto"),
        excludedBodyParts: z.array(z.string()).default([]),
        includeCardio: z.boolean().default(true),
        avoidCardioOnLegDay: z.boolean().default(true),
        includeCore: z.boolean().default(true),
        warmupStretchMinutes: z.number().int().min(0).max(40).default(20),
        cooldownStretchMinutes: z.number().int().min(0).max(40).default(20),
        cardioMinutes: z.number().int().min(0).max(90).default(20),
        dayFocusNotes: z.string().max(500).optional(),
        customRequest: z.string().max(500).optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
      const goal = await getUserGoal(ctx.user.id);
      const goals = await getUserGoals(ctx.user.id);
      const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";
      const stats = await getUserStats(ctx.user.id);
      const recentSessions = await getWorkoutSessionsByUser(ctx.user.id, 5);
      const recommendationCatalog = await buildRecommendationExerciseCatalog({
        location: input?.location ?? "gym",
        equipment: input?.equipment ?? [],
        excludedBodyParts: input?.excludedBodyParts ?? [],
        includeCardio: input?.includeCardio ?? true,
        includeCore: input?.includeCore ?? true,
      });

      const locationLabels: Record<string, string> = {
        gym: "헬스장 (모든 기구 사용 가능)",
        home: "홈트레이닝",
        outdoor: "야외 운동",
      };

      const locationText = input?.location
        ? `운동 장소: ${locationLabels[input.location] || input.location}`
        : "운동 장소: 헬스장";

      const equipmentText = input?.equipment && input.equipment.length > 0
        ? `사용 가능한 기구: ${input.equipment.map((item) => equipmentLabels[item] || item).join(", ")}`
        : input?.location === "home"
          ? "사용 가능한 기구: 맨몸 운동만 가능 (기구 없음)"
          : "사용 가능한 기구: 헬스장 전체 기구 (바벨, 덤벨, 머신, 케이블 등)";

      const durationText = input?.sessionDuration
        ? `1회 운동 가능 시간: ${input.sessionDuration}분`
        : "1회 운동 가능 시간: 60분";

      const daysPerWeek = input?.daysPerWeek ?? goal?.weeklyWorkouts ?? goals[0]?.weeklyWorkouts ?? 3;
      const weeklyFrequencyText = `주 운동일 수: ${daysPerWeek}일`;
      const splitText = `선호 분할 방식: ${splitPreferenceLabels[input?.splitPreference ?? "auto"] ?? input?.splitPreference ?? "AI 자동"}`;
      const excludedBodyParts = input?.excludedBodyParts ?? [];
      const excludedText = excludedBodyParts.length
        ? `제외할 부위/운동: ${excludedBodyParts.map((item) => bodyPartLabels[item] || item).join(", ")}`
        : "제외할 부위/운동: 없음";
      const includeCardio = input?.includeCardio ?? true;
      const avoidCardioOnLegDay = input?.avoidCardioOnLegDay ?? true;
      const includeCore = input?.includeCore ?? true;
      const warmupStretchMinutes = input?.warmupStretchMinutes ?? 20;
      const cooldownStretchMinutes = input?.cooldownStretchMinutes ?? 20;
      const cardioMinutes = input?.cardioMinutes ?? 20;
      const targetExerciseCount = getTargetStrengthExerciseCount(
        input?.sessionDuration ?? 60,
        warmupStretchMinutes,
        cooldownStretchMinutes,
        includeCardio ? cardioMinutes : 0,
      );
      const accessoryText = [
        includeCardio ? `유산소를 주간 계획에 적절히 포함, 유산소를 넣는 날은 ${cardioMinutes}분` : "유산소는 제외",
        avoidCardioOnLegDay ? "하체 운동일에는 유산소를 넣지 말고 상체/휴식 부담이 낮은 날에 배치" : "하체 운동일에도 가벼운 유산소 배치 가능",
        includeCore ? "복근/코어를 주간 계획에 적절히 포함" : "복근/코어는 제외",
        `운동 전 스트레칭 ${warmupStretchMinutes}분`,
        `운동 후 스트레칭 ${cooldownStretchMinutes}분`,
      ].join(", ");
      const trainingOptimizationRules = [
        avoidCardioOnLegDay
          ? "하체/둔근/햄스트링/스쿼트/런지/데드리프트가 포함된 날에는 러닝, 트레드밀, 사이클, 로잉 같은 유산소를 넣지 말고 상체일 또는 별도 컨디셔닝 성격의 날에 배치하세요."
          : "하체 운동일에 유산소를 넣는 경우 저강도 10~20분 이내로 제한하고 근력 운동 이후에 배치하세요.",
        "고강도 유산소와 고강도 하체 운동은 같은 날 배치하지 마세요.",
        "같은 근육군을 연속 운동일에 과도하게 반복하지 말고, 큰 근육군은 최소 1일 이상 회복 간격이 생기게 배치하세요.",
        "각 운동일의 focus와 맞는 운동만 넣으세요. 예를 들어 등/어깨/이두 날에는 스쿼트, 핵스쿼트, 런지, 레그프레스, 레그컬, 카프레이즈 같은 하체 운동을 넣지 말고, 하체 운동은 하체/둔근 포커스 날에만 배치하세요.",
        "가슴 날에는 등/하체 운동을, 등 날에는 가슴/하체 운동을, 어깨/팔 날에는 하체 운동을 섞지 마세요. 복근은 includeCore가 켜진 경우에만 코어 보조로 배치하세요.",
        includeCardio
          ? `유산소는 같은 운동일에 중복해서 넣지 마세요. 러닝/트레드밀은 하루에 한 줄만 허용하고, 유산소 시간은 ${cardioMinutes}분으로 작성하세요.`
          : "유산소 운동은 넣지 마세요.",
        "등/이두, 가슴/삼두, 하체, 어깨/코어처럼 서로 보조 작용이 자연스러운 조합을 우선하세요.",
        "사용자가 운동일별 희망 구성을 적으면 그 구성을 우선하되 회복상 무리가 있으면 더 안전한 순서로 조정하세요.",
      ].join("\n            - ");
      const dayFocusText = input?.dayFocusNotes?.trim()
        ? `운동일별 희망 구성: ${input.dayFocusNotes.trim()}`
        : "운동일별 희망 구성: AI가 회복을 고려해 1일차부터 배치";
      const customRequestText = input?.customRequest?.trim()
        ? `사용자 추가 요청: ${input.customRequest.trim()}`
        : "사용자 추가 요청: 없음";

      const goalText = goals.length
        ? `목표: ${goals.map((item: any) => item.goal).join(", ")}, 주 ${daysPerWeek}회 운동`
        : goal
          ? `목표: ${goal.goal}, 주 ${daysPerWeek}회 운동`
        : "목표 미설정 (일반 건강 관리)";

      const statsText = stats
        ? `총 ${stats.totalSessions}회 운동, 최근 7일 ${stats.recentSessionCount}회, 총 볼륨 ${stats.totalVolume}kg`
        : "운동 기록 없음";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `당신은 전문 퍼스널 트레이너입니다. 사용자의 목표, 운동 환경, 가용 기구, 운동 시간을 반드시 고려하여 맞춤 운동 프로그램을 추천해주세요.
            - 아래 "사용 가능한 운동 DB 후보"에 있는 운동명만 추천하세요. 새 운동명을 지어내지 마세요.
            - exercises 배열의 각 항목은 반드시 사용 가능한 운동 DB 후보의 ID를 포함해 작성하세요.
            - 근력 운동은 "ID:123 | 한국어 운동명 (영어 운동명) - 세트x횟수 - 휴식" 형식으로 작성하세요.
            - 유산소는 세트/횟수가 아니라 "ID:123 | 러닝, 트레드밀 (Running, Treadmill) - 20분"처럼 시간 형식으로 작성하세요.
            - 지정된 기구만 사용하는 운동으로 구성하세요.
            - weeklyPlan은 반드시 사용자가 선택한 주 운동일 수와 같은 개수로 구성하세요.
            - 루틴은 요일 기준이 아닙니다. day 값은 반드시 "1일차", "2일차", "3일차"처럼 주간 순번으로 작성하세요.
            - 각 운동일의 총 시간이 지정된 운동 가능 시간을 초과하지 않도록 하세요.
            - 각 운동일의 exercises 근력 운동은 ${targetExerciseCount}개 안팎으로 구성하세요. 120분처럼 긴 운동 시간인데 3~4개만 추천하지 마세요.
            - 홈트레이닝이면 맨몸 운동 위주로, 헬스장이면 기구 운동을 포함하세요.
            - 머신과 케이블은 서로 다른 기구입니다. 케이블이 선택되지 않았으면 케이블 운동을 넣지 말고, 머신이 선택되지 않았으면 머신 운동을 넣지 마세요.
            - 운동명은 한국어 운동명을 우선 사용하고, 필요하면 괄호 안에 영어명을 보조로 적으세요.
            - 사용자가 제외한 부위/운동은 넣지 마세요.
            - 유산소/복근 포함 여부와 사용자 추가 요청을 우선순위 높게 반영하세요.
            - 이두를 요청한 날에는 삼두 운동을 넣지 말고, 삼두를 요청한 날에는 이두 운동을 넣지 마세요. "팔" 또는 "이두/삼두"라고 명시된 경우에만 둘 다 넣으세요.
            - 복근/코어가 focus에 있거나 복근 포함이 켜져 있으면 해당 날 exercises에 복근 운동을 반드시 1개 이상 포함하세요.
            - ${trainingOptimizationRules}
            - exercises에는 메인 운동, 보조 운동, 선택된 경우 유산소/복근만 넣으세요. 스트레칭은 exercises에 넣지 마세요.
            - 각 운동일마다 warmupStretch 배열과 cooldownStretch 배열을 반드시 작성하세요.
            - warmupStretch는 운동 전 동적 스트레칭/가동성 루틴 총 ${warmupStretchMinutes}분, cooldownStretch는 운동 후 정적 스트레칭 총 ${cooldownStretchMinutes}분으로 구성하세요.
            - 스트레칭은 DB 후보의 부위별 스트레칭에서 골라 "등 스트레칭 - 5분", "어깨 스트레칭 - 5분"처럼 시간 단위로 적고, 세트x횟수/휴식 형식을 쓰지 마세요.
            - warmupStretch와 cooldownStretch에는 푸시업, 풀업, 스쿼트, 런지, 플랭크, 브릿지 같은 운동/근력 동작을 넣지 마세요. 말 그대로 늘리기, 가동성, 호흡, 폼롤러 기반 스트레칭만 넣으세요.
            - warmupStretch와 cooldownStretch는 해당 운동일의 타겟 부위에 맞게 다르게 구성하세요.
            응답은 반드시 JSON 형식으로 해주세요.`,
          },
          {
            role: "user",
            content: `사용자 정보:
${goalText}
숙련도: ${experienceLevel}
${statsText}
최근 운동 세션 수: ${recentSessions.length}회

운동 환경 조건:
${locationText}
${equipmentText}
${durationText}
메인 근력 운동 개수 목표: 각 운동일 ${targetExerciseCount}개
${weeklyFrequencyText}
${splitText}
${excludedText}
추가 구성: ${accessoryText}
${dayFocusText}
${customRequestText}

사용 가능한 운동 DB 후보 (${recommendationCatalog.count}개 중 추천용 요약):
${recommendationCatalog.text}

위 정보를 바탕으로 이번 주 운동 프로그램을 추천해주세요.
반드시 위 DB 후보에 있는 운동만 사용하고, 지정된 기구, 운동 시간, 제외 부위, 분할 방식, 사용자 요청 조건에 맞는 운동만 포함해주세요.
exercises에는 반드시 DB 후보의 ID를 포함하세요. ID가 없는 운동명은 사용하지 마세요.
최적화 규칙:
- ${trainingOptimizationRules}
각 운동일에는 운동 전 스트레칭 ${warmupStretchMinutes}분과 운동 후 스트레칭 ${cooldownStretchMinutes}분을 따로 분리해서 포함해주세요. 스트레칭은 exercises에 섞지 마세요.
스트레칭 블록에는 푸시업, 풀업, 스쿼트, 런지, 플랭크, 브릿지 같은 운동 동작을 넣지 말고 순수 스트레칭/가동성 동작만 넣으세요.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "program_recommendation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                weeklyPlan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "string", description: "주간 운동 순번 (예: 1일차, 2일차)" },
                      focus: { type: "string", description: "운동 포커스 (예: 가슴/삼두)" },
                      warmupStretch: {
                        type: "array",
                        items: { type: "string" },
                        description: `운동 전 동적 스트레칭/가동성 루틴. 총 ${warmupStretchMinutes}분.`,
                      },
                      exercises: {
                        type: "array",
                        items: { type: "string" },
                        description: "메인/보조/유산소/복근 운동 목록. 스트레칭 제외.",
                      },
                      cooldownStretch: {
                        type: "array",
                        items: { type: "string" },
                        description: `운동 후 정적 스트레칭 루틴. 총 ${cooldownStretchMinutes}분.`,
                      },
                      duration: { type: "string", description: "예상 운동 시간" },
                    },
                    required: ["day", "focus", "warmupStretch", "exercises", "cooldownStretch", "duration"],
                    additionalProperties: false,
                  },
                },
                generalAdvice: { type: "string", description: "전반적인 조언" },
                nutritionTip: { type: "string", description: "영양 팁" },
                recoveryTip: { type: "string", description: "회복 팁" },
              },
              required: ["weeklyPlan", "generalAdvice", "nutritionTip", "recoveryTip"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent2 = response.choices[0]?.message?.content;
      const content2 = typeof rawContent2 === 'string' ? rawContent2 : null;
      let parsed = null;
      try { parsed = content2 ? JSON.parse(content2) : null; } catch { parsed = null; }
      parsed = normalizeProgramRecommendation(parsed, {
        avoidCardioOnLegDay,
        exerciseCatalog: recommendationCatalog.exercises,
        warmupStretchMinutes,
        cooldownStretchMinutes,
        cardioMinutes: includeCardio ? cardioMinutes : 0,
        sessionDuration: input?.sessionDuration ?? 60,
        includeCore,
      });

      return {
        program: parsed,
        goal,
        stats,
        catalogCount: recommendationCatalog.count,
      };
    }),

    saveProgramAsRoutines: protectedProcedure
      .input(z.object({
        daysPerWeek: z.number().int().min(1).max(7).default(3),
        program: z.object({
          weeklyPlan: z.array(z.object({
            day: z.string(),
            focus: z.string(),
            duration: z.string().optional(),
            warmupStretch: z.array(z.string()).optional(),
            exercises: z.array(z.string()),
            cooldownStretch: z.array(z.string()).optional(),
          })).min(1).max(7),
          generalAdvice: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const goal = await getUserGoal(ctx.user.id);
        const created: any[] = [];

        const sortedDays = [...input.program.weeklyPlan].sort((a, b) => getPlanDayOrder(a.day) - getPlanDayOrder(b.day));

        for (const day of sortedDays) {
          const routineId = await createRoutine(ctx.user.id, {
            name: `AI ${day.day} ${day.focus}`.trim(),
            description: [
              `주 ${input.daysPerWeek}회 루틴 중 ${day.day} 운동`,
              day.duration ? `예상 시간: ${day.duration}` : null,
              input.program.generalAdvice ? `AI 조언: ${input.program.generalAdvice}` : null,
            ].filter(Boolean).join("\n"),
            goal: goal?.goal ?? "general",
            daysPerWeek: 1,
          });

          let addedCount = 0;
          let order = 1;
          const routineItems = [
            ...(day.warmupStretch ?? []).map((text) => ({ text, isStretch: true })),
            ...day.exercises.map((text) => ({ text, isStretch: false })),
            ...(day.cooldownStretch ?? []).map((text) => ({ text, isStretch: true })),
          ];

          for (const item of routineItems) {
            const exercise = item.isStretch
              ? await findStretchExerciseForRoutine(item.text)
              : await findExerciseForRoutine(item.text);
            if (!exercise?.id) continue;
            await addExerciseToRoutine(
              routineId,
              exercise.id,
              order,
              item.isStretch || isTimedRoutineExercise(exercise) ? 1 : 3,
              item.isStretch || isTimedRoutineExercise(exercise) ? getMinutesFromText(item.text, 20) : 10,
              item.isStretch || isTimedRoutineExercise(exercise) ? 0 : 90,
            );
            order += 1;
            addedCount += 1;
          }

          created.push({ routineId, name: `AI ${day.day} ${day.focus}`.trim(), addedCount });
        }

        return { success: true, created };
      }),

    dietRecommendation: protectedProcedure
      .input(z.object({
        mealCount: z.number().int().min(1).max(8).optional(),
        mealTiming: z.string().max(500).optional(),
        preferences: z.string().max(800).optional(),
        constraints: z.string().max(800).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
      const goal = await getUserGoal(ctx.user.id);
      const goals = await getUserGoals(ctx.user.id);
      const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";
      const stats = await getUserStats(ctx.user.id);
      const recentSessions = await getWorkoutSessionsByUser(ctx.user.id, 7);

      // 체중 데이터 가져오기
      const { getBodyWeights } = await import("./db");
      const weights = await getBodyWeights(ctx.user.id, 5);
      const latestWeight = weights[0]?.weightKg;
      const latestBodyFat = weights[0]?.bodyFatPct;

      // 신장/성별/나이 데이터 (goal에 저장된 실제 값 사용, 없으면 평균값)
      const heightCm = goal?.heightCm ?? 170;
      const gender = goal?.gender ?? "male";
      const age = goal?.birthYear ? new Date().getFullYear() - goal.birthYear : 30;

      // BMR/TDEE 계산 (미플린-세인트지어 공식 - 해리스-베네딕트보다 정확도 높음)
      // 남성: BMR = 10 * 체중(kg) + 6.25 * 신장(cm) - 5 * 나이 + 5
      // 여성: BMR = 10 * 체중(kg) + 6.25 * 신장(cm) - 5 * 나이 - 161
      let bmr = 0;
      let tdee = 0;
      let recommendedCalories = 0;
      const selectedGoalValues = goals.length
        ? goals.map((item: any) => item.goal).filter(Boolean)
        : goal?.goal
          ? [goal.goal]
          : [];
      const goalSummary = selectedGoalValues.length
        ? selectedGoalValues.map((value) => goalLabels[value] ?? value).join(" + ")
        : "목표 미설정";
      let nutritionStrategy = buildNutritionStrategy(selectedGoalValues, 0, latestWeight);
      if (latestWeight) {
        const genderOffset = gender === "female" ? -161 : 5;
        bmr = Math.round(10 * latestWeight + 6.25 * heightCm - 5 * age + genderOffset);
        const activityMultiplier = goal?.weeklyWorkouts
          ? goal.weeklyWorkouts >= 5 ? 1.725 : goal.weeklyWorkouts >= 3 ? 1.55 : 1.375
          : 1.375;
        tdee = Math.round(bmr * activityMultiplier);
        nutritionStrategy = buildNutritionStrategy(selectedGoalValues, tdee, latestWeight);
        recommendedCalories = nutritionStrategy.calories;
      }

      const goalText = goals.length
        ? `운동 목표: ${goalSummary}, 주 ${goal?.weeklyWorkouts ?? goals[0]?.weeklyWorkouts ?? 3}회${goal?.targetWeight ? `, 목표 체중: ${goal.targetWeight}kg` : ""}`
        : goal
          ? `운동 목표: ${goalSummary}, 주 ${goal.weeklyWorkouts}회${goal.targetWeight ? `, 목표 체중: ${goal.targetWeight}kg` : ""}`
        : "목표 미설정";
      const bodyInfoText = `신장: ${heightCm}cm, 성별: ${gender === "female" ? "여성" : "남성"}, 나이: ${age}세${latestBodyFat ? `, 체지방률: ${latestBodyFat}%` : ""}`;
      const weightText = latestWeight
        ? `현재 체중: ${latestWeight}kg, BMR: ${bmr}kcal, TDEE: ${tdee}kcal, 권장 섬취 칼로리: ${recommendedCalories}kcal`
        : "체중 기록 없음";
      const statsText = stats
        ? `최근 7일 ${stats.recentSessionCount}회 운동, 주간 볼륨 ${Math.round(stats.totalVolume / Math.max(stats.totalSessions, 1))}kg`
        : "운동 기록 없음";
      const mealPreferenceText = [
        input?.mealCount ? `희망 식사 횟수: 하루 ${input.mealCount}끼` : "희망 식사 횟수: AI가 목표에 맞춰 구성",
        input?.mealTiming?.trim() ? `식사 시간/패턴: ${input.mealTiming.trim()}` : "식사 시간/패턴: 미입력",
        input?.preferences?.trim() ? `선호 음식/식습관: ${input.preferences.trim()}` : "선호 음식/식습관: 미입력",
        input?.constraints?.trim() ? `제외 음식/현실 제약: ${input.constraints.trim()}` : "제외 음식/현실 제약: 미입력",
      ].join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `당신은 전문 스포츠 영양사입니다. 사용자의 운동 목표와 체중 데이터를 바탕으로 맞춤 하루 식단을 추천해주세요.
다음 사항을 반드시 포함하세요:
- 하루 권장 칼로리 및 단백질/탄수화물/지방 비율
- 사용자가 입력한 식사 횟수, 식사 가능 시간, 선호 음식, 제외 음식, 현실 제약을 최우선으로 반영
- 식사 배열은 사용자가 희망 식사 횟수를 입력했다면 그 횟수에 맞춰 구성
- 아침/점심/저녁/간식 식단 (한국식 식품 위주로)
- 각 식사별 칼로리와 단백질 함량
- 운동 전/후 식사 타이밍 조언
응답은 반드시 JSON 형식으로 해주세요.`,
          },
          {
            role: "user",
            content: `사용자 정보:
${goalText}
식단 전략: ${nutritionStrategy.label} - ${nutritionStrategy.description}
단백질 목표: 하루 ${nutritionStrategy.proteinTarget}g 이상
숙련도: ${experienceLevel}
${bodyInfoText}
${weightText}
${statsText}
운동 횟수: 총 ${stats?.totalSessions || 0}회

사용자 식사 요청:
${mealPreferenceText}

위 정보를 바탕으로 오늘 하루 맞춤 식단을 추천해주세요. 특히 권장 칼로리(${recommendedCalories}kcal), 식단 전략(${nutritionStrategy.label}), 단백질 목표(${nutritionStrategy.proteinTarget}g), 사용자 식사 요청을 기준으로 식단을 설계해주세요.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "diet_recommendation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                dailyCalories: { type: "number", description: "하루 권장 칼로리 (kcal)" },
                macros: {
                  type: "object",
                  properties: {
                    protein: { type: "number", description: "단백질 (g)" },
                    carbs: { type: "number", description: "탄수화물 (g)" },
                    fat: { type: "number", description: "지방 (g)" },
                  },
                  required: ["protein", "carbs", "fat"],
                  additionalProperties: false,
                },
                meals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string", description: "식사 시간 (아침/점심/저녀/간식)" },
                      menu: { type: "array", items: { type: "string" }, description: "메뉴 목록" },
                      calories: { type: "number", description: "식사 칼로리" },
                      protein: { type: "number", description: "단백질 (g)" },
                      tip: { type: "string", description: "식사 팁" },
                    },
                    required: ["time", "menu", "calories", "protein", "tip"],
                    additionalProperties: false,
                  },
                },
                hydration: { type: "string", description: "수분 섬취 권장" },
                supplements: { type: "string", description: "보충제 추천" },
                preworkoutMeal: { type: "string", description: "운동 전 식사 추천" },
                postworkoutMeal: { type: "string", description: "운동 후 식사 추천" },
                generalAdvice: { type: "string", description: "전반적인 식단 조언" },
              },
              required: ["dailyCalories", "macros", "meals", "hydration", "supplements", "preworkoutMeal", "postworkoutMeal", "generalAdvice"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      let parsed = null;
      try { parsed = content ? JSON.parse(content) : null; } catch { parsed = null; }

      return {
        diet: parsed,
        goal,
        latestWeight,
        latestBodyFat,
        bmr,
        tdee,
        recommendedCalories,
        goalSummary,
        nutritionStrategy,
        stats,
        dietRequest: input ?? null,
      };
    }),

    quickTip: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ input }) => {
        const exercise = await getExerciseById(input.exerciseId);
        if (!exercise) return null;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "당신은 전문 퍼스널 트레이너입니다. 운동에 대한 핵심 팁을 간결하게 제공해주세요.",
            },
            {
              role: "user",
              content: `${exercise.nameKo} 운동의 올바른 자세와 주의사항, 효과를 극대화하는 팁 3가지를 알려주세요.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "exercise_tips",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "운동 팁 목록 (3개)",
                  },
                  commonMistakes: { type: "string", description: "흔한 실수" },
                  breathingTip: { type: "string", description: "호흡 팁" },
                },
                required: ["tips", "commonMistakes", "breathingTip"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent3 = response.choices[0]?.message?.content;
        const content3 = typeof rawContent3 === 'string' ? rawContent3 : null;
        try { return content3 ? JSON.parse(content3) : null; } catch { return null; }
      }),
  }),
});

export type AppRouter = typeof appRouter;
