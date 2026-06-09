import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addBodyWeight,
  addUserFeedback,
  addCoachingComment,
  addCoachingTask,
  addExerciseToRoutine,
  addTrainerFeedback,
  addTrainerPtSession,
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
  getUserFeedback,
  getCoachingCommentsForClient,
  getCoachingCommentsForPair,
  getCoachingNotificationSummary,
  getCoachingTasksForClient,
  getCoachingTasksForPair,
  getExerciseById,
  getExerciseHistory,
  getExercises,
  getFavorites,
  getClientTrainers,
  getPendingClientTrainerLinks,
  getLinkedClientWorkoutSessions,
  getMonthlyStats,
  getRoutineById,
  getRoutineExercises,
  getRoutineExerciseById,
  getRoutinesByUser,
  getSessionsInDateRange,
  getUserGoal,
  getUserGoals,
  getUserById,
  getTrainerClients,
  getTrainerClientRequests,
  getTrainerCode,
  getTrainerApplication,
  getTrainerClientNote,
  getTrainerClientReport,
  getTrainerFeedbackForClient,
  getTrainerFeedbackForPair,
  getTrainerPtSessionsForClient,
  getTrainerPtSessionsForPair,
  getUserPreference,
  getUserStats,
  getUserAppRole,
  getWeeklyStats,
  getWorkoutLogsBySession,
  getWorkoutSessionById,
  getWorkoutSessionsByUser,
  getWorkoutStreak,
  ensureTrainerCode,
  isTrainerLinkedToClient,
  isFavorite,
  listTrainerApplications,
  listApprovedTrainers,
  listUserFeedback,
  linkTrainerByCode,
  markCoachingRead,
  reviewTrainerApplication,
  reviewTrainerClientLink,
  removeExerciseFromRoutine,
  submitTrainerApplication,
  unlinkTrainer,
  reorderRoutineExercises,
  replaceUserGoals,
  setUserPreference,
  toggleFavorite,
  updateCoachingTaskStatus,
  updateRoutine,
  updateRoutineExercise,
  upsertTrainerClientNote,
  updateUserProfileImage,
  updateUserProfileName,
  updateUserFeedbackStatus,
  updateWorkoutSession,
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
  biceps: "이두",
  triceps: "삼두",
  legs: "하체",
  glutes: "둔근",
  abs: "복근",
  cardio: "유산소",
  stretching: "스트레칭",
  full_body: "전신",
};

const splitPreferenceLabels: Record<string, string> = {
  auto: "AI가 목표와 빈도에 맞춰 자동 구성",
  custom_day_targets: "사용자가 일차별 운동 부위를 직접 선택",
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

const userFeedbackCategorySchema = z.enum(["bug", "idea", "ux", "data", "other"]);
const userFeedbackStatusSchema = z.enum(["open", "reviewing", "resolved", "closed"]);

const customSplitPresetSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(40),
  daysPerWeek: z.string().regex(/^[1-7]$/),
  dayTargets: z.array(z.array(z.string().max(40)).max(12)).min(1).max(7),
  warmupStretchMinutes: z.string().regex(/^\d+$/),
  cooldownStretchMinutes: z.string().regex(/^\d+$/),
  cardioMinutes: z.string().regex(/^\d+$/),
  updatedAt: z.string().max(40),
});

type CustomSplitPreset = z.infer<typeof customSplitPresetSchema>;

const workoutLocationSchema = z.enum(["gym", "home", "outdoor"]);
const equipmentSchema = z.enum([
  "bodyweight",
  "dumbbell",
  "barbell",
  "machine",
  "cable",
  "resistance_band",
  "kettlebell",
  "none",
]);

const trainerWorkoutLogSchema = z.object({
  exerciseId: z.number(),
  setNumber: z.number().int().min(1).max(200),
  reps: z.number().min(0).max(1000).optional(),
  weightKg: z.number().min(0).max(1000).optional(),
  durationSeconds: z.number().min(0).max(24 * 60 * 60).optional(),
  distanceM: z.number().min(0).max(1_000_000).optional(),
  notes: z.string().max(200).optional(),
});

const workoutLogInputSchema = z.object({
  exerciseId: z.number(),
  setNumber: z.number().int().min(1).max(200),
  reps: z.number().min(0).max(1000).optional(),
  weightKg: z.number().min(0).max(1000).optional(),
  durationSeconds: z.number().min(0).max(24 * 60 * 60).optional(),
  distanceM: z.number().min(0).max(1_000_000).optional(),
  isWarmup: z.boolean().optional(),
  rpe: z.number().min(1).max(10).optional(),
  memo: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

function parseCustomSplitPresets(value: string | null): CustomSplitPreset[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const result = z.array(customSplitPresetSchema).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function parseEquipmentPreference(value: string | null): z.infer<typeof equipmentSchema>[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const result = z.array(equipmentSchema).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function parseStringListPreference(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const result = z.array(z.string().min(1).max(50)).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function normalizeEquipmentDetails(items: string[] = []) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of items) {
    const value = item.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
    if (normalized.length >= 40) break;
  }
  return normalized;
}

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

function getExerciseArmFocus(exercise: any): ArmFocus {
  return getArmExerciseFocus([
    exercise?.nameKo,
    exercise?.name,
    ...(Array.isArray(exercise?.primaryMuscles) ? exercise.primaryMuscles : []),
    ...(Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : []),
  ].join(" "));
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
  return Math.min(12, Math.max(4, Math.ceil(strengthMinutes / 9)));
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

function filterExercisesToDayFocus(weeklyPlan: any[], catalog: any[] = []) {
  return weeklyPlan.map((day) => {
    const focus = String(day?.focus ?? "");
    const allowedParts = getFocusBodyParts(focus);
    const exercises = Array.isArray(day.exercises) ? dedupeRecommendationExercises(day.exercises.map(String)) : [];
    if (!allowedParts || !exercises.length) return { ...day, exercises };

    const kept = exercises.filter((exercise: string) => {
      const exerciseParts = getRecommendationExerciseBodyParts(exercise, catalog);
      if (exerciseParts.has("arms") && !isArmExerciseAllowedForFocus(exercise, focus)) return false;
      if (isExerciseAllowedForFocus(exerciseParts, allowedParts)) return true;
      return false;
    });
    return { ...day, exercises: kept };
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

  const bodyPartAlignedPlan = filterExercisesToDayFocus(program.weeklyPlan, options?.exerciseCatalog ?? []);
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
  const excludedArmFocuses = new Set<Exclude<ArmFocus, null>>(
    input.excludedBodyParts
      .filter((part): part is Exclude<ArmFocus, null> => part === "biceps" || part === "triceps" || part === "both"),
  );

  const usable = allExercises.filter((exercise: any) => {
    if (!allowedEquipment.has(exercise.equipment)) return false;
    if (excluded.has(exercise.bodyPart)) return false;
    if (exercise.bodyPart === "arms" && excludedArmFocuses.size) {
      const armFocus = getExerciseArmFocus(exercise);
      if (armFocus && (excludedArmFocuses.has(armFocus) || armFocus === "both")) return false;
    }
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

function normalizeCaptureName(value: unknown) {
  return normalizeExerciseName(String(value ?? ""))
    .replace(/\b(o)\s*(kg|회|rep|reps)\b/g, "0 $2")
    .replace(/\b(bb|db|ez)\b/g, (token) => ({ bb: "barbell", db: "dumbbell", ez: "ezbar" })[token] ?? token)
    .replace(/\b(lat|lats)\b/g, "lat")
    .replace(/\b(pull\s*down|pulldown)\b/g, "pulldown")
    .replace(/\b(push\s*down|pushdown)\b/g, "pushdown")
    .replace(/\b(rowing)\b/g, "row")
    .replace(/랫|렛/g, "랫")
    .replace(/풀\s*다운|풀다운/g, "풀다운")
    .replace(/푸쉬/g, "푸시")
    .replace(/트라이셉스|트라이셉/g, "삼두")
    .replace(/바이셉스|바이셉/g, "이두")
    .replace(/풀오버/g, "풀 오버")
    .replace(/덤벨/g, "덤벨")
    .replace(/바벨/g, "바벨")
    .replace(/\s+/g, " ")
    .trim();
}

function compactCaptureName(value: string) {
  return value.replace(/\s+/g, "");
}

function captureTokens(value: string) {
  return value.split(" ").filter((word) => word.length > 1);
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function stringSimilarity(a: string, b: string) {
  const left = compactCaptureName(a);
  const right = compactCaptureName(b);
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 0;
  return 1 - levenshteinDistance(left, right) / maxLength;
}

function scoreCaptureExerciseName(query: string, candidate: string) {
  if (!query || !candidate) return 0;
  const compactQuery = compactCaptureName(query);
  const compactCandidate = compactCaptureName(candidate);

  if (query === candidate || compactQuery === compactCandidate) return 120;
  if (compactQuery.includes(compactCandidate) || compactCandidate.includes(compactQuery)) return 96;
  if (query.includes(candidate) || candidate.includes(query)) return 90;

  const queryTokens = new Set(captureTokens(query));
  const candidateTokens = captureTokens(candidate);
  const overlap = candidateTokens.filter((word) => queryTokens.has(word)).length;
  const tokenScore = candidateTokens.length ? (overlap / candidateTokens.length) * 70 : 0;
  const similarityScore = stringSimilarity(query, candidate) * 82;
  return Math.max(tokenScore, similarityScore);
}

function getCaptureExerciseAliases(exercise: any) {
  const names = [
    exercise.nameKo,
    exercise.name,
    `${exercise.nameKo ?? ""} ${exercise.name ?? ""}`,
  ].filter(Boolean).map(normalizeCaptureName);
  const aliases = new Set(names);

  for (const name of names) {
    aliases.add(name.replace(/\b(dumbbell|barbell|machine|cable|bodyweight)\b/g, "").replace(/\s+/g, " ").trim());
    aliases.add(name.replace(/덤벨|바벨|머신|케이블|맨몸/g, "").replace(/\s+/g, " ").trim());
    aliases.add(name.replace(/\b(v|t|ez)\s*bar\b/g, "$1bar"));
    aliases.add(name.replace(/v\s*바|t\s*바|ez\s*바/g, (match) => match.replace(/\s+/g, "")));
    aliases.add(name.replace(/\b(one|single)\s*arm\b/g, "single arm"));
    aliases.add(name.replace(/싱글\s*암|원\s*암/g, "싱글 암"));
    aliases.add(name.replace(/\bhigh\s*pulley\b/g, "cable"));
    aliases.add(name.replace(/하이\s*풀리/g, "케이블"));
  }

  return [...aliases].filter(Boolean);
}

function findExerciseForCapture(item: any, exercises: any[]) {
  const directId = Number(item?.exerciseId);
  if (Number.isFinite(directId) && directId > 0) {
    const direct = exercises.find((exercise) => exercise.id === directId);
    if (direct) return direct;
  }

  const query = normalizeCaptureName(`${item?.nameKo ?? ""} ${item?.name ?? ""}`);
  if (!query) return null;

  let best: { exercise: any; score: number } | null = null;
  let secondBestScore = 0;
  for (const exercise of exercises) {
    const score = Math.max(...getCaptureExerciseAliases(exercise).map((alias) => scoreCaptureExerciseName(query, alias)));
    if (!best || score > best.score) {
      secondBestScore = best?.score ?? 0;
      best = { exercise, score };
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (!best) return null;
  if (best.score >= 88) return best.exercise;
  if (best.score >= 58 && best.score - secondBestScore >= 8) return best.exercise;
  if (best.score >= 48 && secondBestScore < 35) return best.exercise;
  return null;
}

function normalizeCaptureMode(mode: unknown, exercise: any): "strength" | "cardio" | "duration" {
  const rawMode = String(mode ?? "").toLowerCase();
  if (rawMode === "cardio" || exercise?.category === "cardio" || exercise?.bodyPart === "cardio") return "cardio";
  if (rawMode === "duration" || exercise?.category === "flexibility" || exercise?.bodyPart === "stretching") return "duration";
  return "strength";
}

function normalizeCaptureNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeWorkoutCaptureResult(parsed: any, exercises: any[]) {
  const parsedExercises = Array.isArray(parsed?.exercises) ? parsed.exercises.slice(0, 30) : [];
  const matched: any[] = [];
  const unmatched: string[] = [];
  const seen = new Set<number>();

  for (const item of parsedExercises) {
    const exercise = findExerciseForCapture(item, exercises);
    if (!exercise) {
      const label = String(item?.nameKo ?? item?.name ?? "").trim();
      if (label) unmatched.push(label);
      continue;
    }
    if (seen.has(exercise.id)) continue;
    seen.add(exercise.id);

    const mode = normalizeCaptureMode(item?.mode, exercise);
    const rawSets = Array.isArray(item?.sets) ? item.sets.slice(0, 30) : [];
    const sets = rawSets
      .map((set: any, index: number) => ({
        setNumber: Number(set?.setNumber) > 0 ? Number(set.setNumber) : index + 1,
        weightKg: normalizeCaptureNumber(set?.weightKg),
        reps: normalizeCaptureNumber(set?.reps),
        durationMinutes: normalizeCaptureNumber(set?.durationMinutes),
        distanceKm: normalizeCaptureNumber(set?.distanceKm),
      }))
      .filter((set: any) => set.weightKg || set.reps || set.durationMinutes || set.distanceKm);

    matched.push({
      exercise,
      mode,
      sets,
      durationMinutes: normalizeCaptureNumber(item?.durationMinutes) || sets[0]?.durationMinutes || 0,
      distanceKm: normalizeCaptureNumber(item?.distanceKm) || sets[0]?.distanceKm || 0,
      intensity: ["low", "moderate", "high"].includes(String(item?.intensity)) ? String(item.intensity) : "moderate",
    });
  }

  return {
    workoutDate: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed?.workoutDate ?? "")) ? String(parsed.workoutDate) : "",
    confidence: Math.max(0, Math.min(1, Number(parsed?.confidence) || 0)),
    notes: String(parsed?.notes ?? "").slice(0, 500),
    exercises: matched,
    unmatched: unmatched.slice(0, 12),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      const displayName = await getUserPreference(opts.ctx.user.id, "displayName");
      const appRole = await getUserAppRole(opts.ctx.user.id);
      const user = displayName ? { ...opts.ctx.user, name: displayName } : opts.ctx.user;
      return { ...user, appRole };
    }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(40) }))
      .mutation(async ({ ctx, input }) => {
        const name = input.name.replace(/\s+/g, " ").trim();
        await updateUserProfileName(ctx.user.id, name);
        await setUserPreference(ctx.user.id, "displayName", name);
        return { success: true, name };
      }),
    updateProfileImage: protectedProcedure
      .input(z.object({
        profileImageUrl: z
          .string()
          .max(900_000)
          .regex(/^data:image\/(png|jpe?g|webp);base64,/)
          .nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfileImage(ctx.user.id, input.profileImageUrl);
        return { success: true, profileImageUrl: input.profileImageUrl };
      }),
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
          gymName: z.string().max(80).optional(),
          gymLocation: workoutLocationSchema.optional(),
          gymEquipment: z.array(equipmentSchema).max(12).optional(),
          gymEquipmentDetails: z.array(z.string().min(1).max(50)).max(40).optional(),
          injuryNotes: z.string().max(500).optional(),
          avoidExercises: z.string().max(500).optional(),
          preferredExercises: z.string().max(500).optional(),
          availableWorkoutTimes: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const goals = input.goals?.length ? input.goals : [input.goal];
        await replaceUserGoals(ctx.user.id, goals, input.weeklyWorkouts, input.targetWeight, input.heightCm, input.gender, input.birthYear);
        if (input.experienceLevel) {
          await setUserPreference(ctx.user.id, "experienceLevel", input.experienceLevel);
        }
        if (input.gymName !== undefined) {
          await setUserPreference(ctx.user.id, "gymName", input.gymName.trim());
        }
        if (input.gymLocation) {
          await setUserPreference(ctx.user.id, "gymLocation", input.gymLocation);
        }
        if (input.gymEquipment) {
          await setUserPreference(ctx.user.id, "gymEquipment", JSON.stringify(input.gymEquipment));
        }
        if (input.gymEquipmentDetails) {
          await setUserPreference(ctx.user.id, "gymEquipmentDetails", JSON.stringify(normalizeEquipmentDetails(input.gymEquipmentDetails)));
        }
        if (input.injuryNotes !== undefined) {
          await setUserPreference(ctx.user.id, "injuryNotes", input.injuryNotes.trim());
        }
        if (input.avoidExercises !== undefined) {
          await setUserPreference(ctx.user.id, "avoidExercises", input.avoidExercises.trim());
        }
        if (input.preferredExercises !== undefined) {
          await setUserPreference(ctx.user.id, "preferredExercises", input.preferredExercises.trim());
        }
        if (input.availableWorkoutTimes !== undefined) {
          await setUserPreference(ctx.user.id, "availableWorkoutTimes", input.availableWorkoutTimes.trim());
        }
        return { success: true };
      }),
  }),

  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        experienceLevel: await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner",
        displayName: await getUserPreference(ctx.user.id, "displayName") ?? ctx.user.name ?? "",
        gymName: await getUserPreference(ctx.user.id, "gymName") ?? "",
        gymLocation: workoutLocationSchema.safeParse(await getUserPreference(ctx.user.id, "gymLocation")).data ?? "gym",
        gymEquipment: parseEquipmentPreference(await getUserPreference(ctx.user.id, "gymEquipment")),
        gymEquipmentDetails: parseStringListPreference(await getUserPreference(ctx.user.id, "gymEquipmentDetails")),
        injuryNotes: await getUserPreference(ctx.user.id, "injuryNotes") ?? "",
        avoidExercises: await getUserPreference(ctx.user.id, "avoidExercises") ?? "",
        preferredExercises: await getUserPreference(ctx.user.id, "preferredExercises") ?? "",
        availableWorkoutTimes: await getUserPreference(ctx.user.id, "availableWorkoutTimes") ?? "",
        customSplitPresets: parseCustomSplitPresets(await getUserPreference(ctx.user.id, "customSplitPresets")),
      };
    }),
    set: protectedProcedure
      .input(z.object({
        experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        gymName: z.string().max(80).optional(),
        gymLocation: workoutLocationSchema.optional(),
        gymEquipment: z.array(equipmentSchema).max(12).optional(),
        gymEquipmentDetails: z.array(z.string().min(1).max(50)).max(40).optional(),
        injuryNotes: z.string().max(500).optional(),
        avoidExercises: z.string().max(500).optional(),
        preferredExercises: z.string().max(500).optional(),
        availableWorkoutTimes: z.string().max(300).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.experienceLevel) {
          await setUserPreference(ctx.user.id, "experienceLevel", input.experienceLevel);
        }
        if (input.gymName !== undefined) {
          await setUserPreference(ctx.user.id, "gymName", input.gymName.trim());
        }
        if (input.gymLocation) {
          await setUserPreference(ctx.user.id, "gymLocation", input.gymLocation);
        }
        if (input.gymEquipment) {
          await setUserPreference(ctx.user.id, "gymEquipment", JSON.stringify(input.gymEquipment));
        }
        if (input.gymEquipmentDetails) {
          await setUserPreference(ctx.user.id, "gymEquipmentDetails", JSON.stringify(normalizeEquipmentDetails(input.gymEquipmentDetails)));
        }
        if (input.injuryNotes !== undefined) {
          await setUserPreference(ctx.user.id, "injuryNotes", input.injuryNotes.trim());
        }
        if (input.avoidExercises !== undefined) {
          await setUserPreference(ctx.user.id, "avoidExercises", input.avoidExercises.trim());
        }
        if (input.preferredExercises !== undefined) {
          await setUserPreference(ctx.user.id, "preferredExercises", input.preferredExercises.trim());
        }
        if (input.availableWorkoutTimes !== undefined) {
          await setUserPreference(ctx.user.id, "availableWorkoutTimes", input.availableWorkoutTimes.trim());
        }
        return { success: true };
      }),
    saveCustomSplitPreset: protectedProcedure
      .input(customSplitPresetSchema.omit({ updatedAt: true }).extend({
        id: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = parseCustomSplitPresets(await getUserPreference(ctx.user.id, "customSplitPresets"));
        const preset: CustomSplitPreset = {
          ...input,
          id: input.id || crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        };
        const nextPresets = [
          preset,
          ...existing.filter((item) => item.id !== preset.id && item.name !== preset.name),
        ].slice(0, 12);
        await setUserPreference(ctx.user.id, "customSplitPresets", JSON.stringify(nextPresets));
        return { presets: nextPresets, preset };
      }),
    deleteCustomSplitPreset: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const existing = parseCustomSplitPresets(await getUserPreference(ctx.user.id, "customSplitPresets"));
        const nextPresets = existing.filter((item) => item.id !== input.id);
        await setUserPreference(ctx.user.id, "customSplitPresets", JSON.stringify(nextPresets));
        return { presets: nextPresets };
      }),
  }),

  trainer: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const appRole = await getUserAppRole(ctx.user.id);
      const code = appRole === "trainer" ? await getTrainerCode(ctx.user.id) : null;
      return {
        appRole,
        code,
        application: await getTrainerApplication(ctx.user.id),
        clients: await getTrainerClients(ctx.user.id),
        clientRequests: await getTrainerClientRequests(ctx.user.id),
        trainers: await getClientTrainers(ctx.user.id),
        pendingTrainers: await getPendingClientTrainerLinks(ctx.user.id),
        feedback: await getTrainerFeedbackForClient(ctx.user.id, 10),
        ptSessions: await getTrainerPtSessionsForClient(ctx.user.id, 10),
        comments: await getCoachingCommentsForClient(ctx.user.id, 20),
        tasks: await getCoachingTasksForClient(ctx.user.id, 30),
      };
    }),
    notifications: protectedProcedure.query(async ({ ctx }) => {
      return await getCoachingNotificationSummary(ctx.user.id);
    }),
    markCoachingRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markCoachingRead(ctx.user.id);
      return await getCoachingNotificationSummary(ctx.user.id);
    }),
    issueCode: protectedProcedure.mutation(async ({ ctx }) => {
      const appRole = await getUserAppRole(ctx.user.id);
      if (appRole !== "trainer" && ctx.user.role !== "admin") {
        throw new Error("관리자 승인 후 트레이너 코드를 확인할 수 있습니다.");
      }
      const code = await ensureTrainerCode(ctx.user.id);
      return {
        success: true,
        appRole: "trainer" as const,
        code,
      };
    }),
    applyForTrainer: protectedProcedure
      .input(z.object({
        displayName: z.string().trim().min(1).max(80),
        bio: z.string().trim().min(10).max(800),
        experience: z.string().trim().min(5).max(800),
        specialties: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
        contact: z.string().trim().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const application = await submitTrainerApplication(ctx.user.id, input);
        return { success: true, application };
      }),
    registerTrainer: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        await linkTrainerByCode(ctx.user.id, input.code);
        return {
          success: true,
          status: "pending" as const,
          trainers: await getClientTrainers(ctx.user.id),
        };
      }),
    reviewClientRequest: protectedProcedure
      .input(z.object({ linkId: z.number(), status: z.enum(["active", "rejected", "removed", "blocked", "expired"]) }))
      .mutation(async ({ ctx, input }) => {
        const appRole = await getUserAppRole(ctx.user.id);
        if (appRole !== "trainer" && ctx.user.role !== "admin") {
          throw new Error("트레이너만 회원 연결 요청을 처리할 수 있습니다.");
        }
        await reviewTrainerClientLink(ctx.user.id, input.linkId, input.status);
        return { success: true };
      }),
    removeTrainer: protectedProcedure
      .input(z.object({ trainerUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unlinkTrainer(ctx.user.id, input.trainerUserId);
        return { success: true };
      }),
    clientSessions: protectedProcedure
      .input(z.object({ clientUserId: z.number(), limit: z.number().min(1).max(30).default(10) }))
      .query(async ({ ctx, input }) => {
        return await getLinkedClientWorkoutSessions(ctx.user.id, input.clientUserId, input.limit);
      }),
    clientDetail: protectedProcedure
      .input(z.object({ clientUserId: z.number(), limit: z.number().min(1).max(30).default(10) }))
      .query(async ({ ctx, input }) => {
        const sessions = await getLinkedClientWorkoutSessions(ctx.user.id, input.clientUserId, input.limit);
        const client = await getUserById(input.clientUserId);
        const detailedSessions = await Promise.all(sessions.map(async (session: any) => ({
          ...session,
          logs: await getWorkoutLogsBySession(session.id),
        })));
        return {
          client,
          sessions: detailedSessions,
          feedback: await getTrainerFeedbackForPair(ctx.user.id, input.clientUserId, 30),
          ptSessions: await getTrainerPtSessionsForPair(ctx.user.id, input.clientUserId, 20),
          comments: await getCoachingCommentsForPair(ctx.user.id, input.clientUserId, 80),
          tasks: await getCoachingTasksForPair(ctx.user.id, input.clientUserId, 50),
          privateNote: await getTrainerClientNote(ctx.user.id, input.clientUserId),
          report: await getTrainerClientReport(ctx.user.id, input.clientUserId),
        };
      }),
    createPtRecord: protectedProcedure
      .input(z.object({
        clientUserId: z.number(),
        title: z.string().trim().min(1).max(200),
        workoutDate: z.date(),
        durationMinutes: z.number().min(0).max(24 * 60),
        notes: z.string().max(800).optional(),
        feedbackMessage: z.string().max(1200).optional(),
        logs: z.array(trainerWorkoutLogSchema).min(1).max(300),
      }))
      .mutation(async ({ ctx, input }) => {
        const appRole = await getUserAppRole(ctx.user.id);
        if (appRole !== "trainer" && ctx.user.role !== "admin") {
          throw new Error("트레이너만 회원 PT 기록을 남길 수 있습니다.");
        }
        if (!(await isTrainerLinkedToClient(ctx.user.id, input.clientUserId))) {
          throw new Error("연결된 회원에게만 PT 기록을 남길 수 있습니다.");
        }
        const sessionId = await createWorkoutSession(input.clientUserId, {
          name: input.title,
          workoutDate: input.workoutDate,
        });
        for (const log of input.logs) {
          await addWorkoutLog({
            sessionId,
            exerciseId: log.exerciseId,
            setNumber: log.setNumber,
            reps: log.reps,
            weightKg: log.weightKg,
            durationSeconds: log.durationSeconds,
            distanceM: log.distanceM,
            notes: log.notes,
          });
        }
        await completeWorkoutSession(sessionId, input.durationMinutes, input.notes);
        const ptId = await addTrainerPtSession(ctx.user.id, input.clientUserId, sessionId, input.title, input.notes);
        if (input.feedbackMessage?.trim()) {
          await addTrainerFeedback(ctx.user.id, input.clientUserId, input.feedbackMessage.trim(), sessionId);
        }
        return { success: true, sessionId, ptId };
      }),
    addFeedback: protectedProcedure
      .input(z.object({
        clientUserId: z.number(),
        sessionId: z.number().optional(),
        message: z.string().trim().min(2).max(1200),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await addTrainerFeedback(ctx.user.id, input.clientUserId, input.message, input.sessionId);
        return { success: true, id };
      }),
    addComment: protectedProcedure
      .input(z.object({
        trainerUserId: z.number(),
        clientUserId: z.number(),
        targetType: z.enum(["general", "feedback", "pt_session", "workout_session", "task"]).default("general"),
        targetId: z.number().optional(),
        message: z.string().trim().min(1).max(1200),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await addCoachingComment({
          trainerUserId: input.trainerUserId,
          clientUserId: input.clientUserId,
          authorUserId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          message: input.message,
        });
        return { success: true, id };
      }),
    addTask: protectedProcedure
      .input(z.object({
        clientUserId: z.number(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(1000).optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appRole = await getUserAppRole(ctx.user.id);
        if (appRole !== "trainer" && ctx.user.role !== "admin") {
          throw new Error("트레이너만 회원 과제를 만들 수 있습니다.");
        }
        const id = await addCoachingTask(ctx.user.id, input.clientUserId, input);
        return { success: true, id };
      }),
    updateTaskStatus: protectedProcedure
      .input(z.object({ taskId: z.number(), status: z.enum(["open", "done"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateCoachingTaskStatus(ctx.user.id, input.taskId, input.status);
        return { success: true };
      }),
    savePrivateNote: protectedProcedure
      .input(z.object({ clientUserId: z.number(), note: z.string().trim().max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const appRole = await getUserAppRole(ctx.user.id);
        if (appRole !== "trainer" && ctx.user.role !== "admin") {
          throw new Error("트레이너만 회원 메모를 저장할 수 있습니다.");
        }
        await upsertTrainerClientNote(ctx.user.id, input.clientUserId, input.note);
        return { success: true };
      }),
    aiFeedbackDraft: protectedProcedure
      .input(z.object({
        clientUserId: z.number(),
        context: z.string().trim().max(4000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appRole = await getUserAppRole(ctx.user.id);
        if (appRole !== "trainer" && ctx.user.role !== "admin") {
          throw new Error("트레이너만 AI 피드백 초안을 만들 수 있습니다.");
        }
        const sessions = await getLinkedClientWorkoutSessions(ctx.user.id, input.clientUserId, 5);
        const report = await getTrainerClientReport(ctx.user.id, input.clientUserId);
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "당신은 퍼스널 트레이너 보조 코치입니다. 회원에게 보낼 수 있는 짧고 구체적인 한국어 피드백 초안을 작성하세요. 칭찬, 주의점, 다음 액션을 포함하세요.",
            },
            {
              role: "user",
              content: `최근 28일 리포트: 운동 ${report.sessionCount}회, 총볼륨 ${Math.round(report.totalVolume || 0)}kg, 총시간 ${report.totalDurationMinutes}분, 미완료 과제 ${report.openTasks}개.
최근 세션: ${sessions.map((session: any) => `${session.name || "운동"} ${session.durationMinutes || 0}분`).join(", ") || "없음"}
트레이너 메모: ${input.context || "없음"}

회원에게 보낼 피드백 초안을 4~6문장으로 작성하세요.`,
            },
          ],
        });
        const content = response.choices[0]?.message?.content;
        return { draft: typeof content === "string" ? content.trim() : "" };
      }),
  }),

  feedback: router({
    create: protectedProcedure
      .input(z.object({
        category: userFeedbackCategorySchema.default("other"),
        message: z.string().trim().min(5, "의견을 5자 이상 입력해주세요.").max(2000, "의견은 2000자 이하로 입력해주세요."),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await addUserFeedback(ctx.user.id, input);
        return { success: true, id };
      }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      return await getUserFeedback(ctx.user.id, 30);
    }),
  }),

  admin: router({
    trainerApplications: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      }).optional())
      .query(async ({ input }) => {
        const status = input?.status && input.status !== "all" ? input.status : undefined;
        return await listTrainerApplications(status);
      }),
    approvedTrainers: adminProcedure.query(async () => {
      return await listApprovedTrainers();
    }),
    reviewTrainerApplication: adminProcedure
      .input(z.object({
        applicationId: z.number(),
        status: z.enum(["approved", "rejected"]),
        reviewNote: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const application = await reviewTrainerApplication(
          ctx.user.id,
          input.applicationId,
          input.status,
          input.reviewNote ?? "",
        );
        return { success: true, application };
      }),
    userFeedback: adminProcedure
      .input(z.object({
        status: z.union([userFeedbackStatusSchema, z.literal("all")]).default("open"),
      }).optional())
      .query(async ({ input }) => {
        const status = input?.status && input.status !== "all" ? input.status : undefined;
        return await listUserFeedback(status, 100);
      }),
    updateUserFeedback: adminProcedure
      .input(z.object({
        feedbackId: z.number(),
        status: userFeedbackStatusSchema,
        adminNote: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const feedback = await updateUserFeedbackStatus(input.feedbackId, {
          status: input.status,
          adminNote: input.adminNote,
        });
        return { success: true, feedback };
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

    aiSessionSummary: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        const logs = await getWorkoutLogsBySession(input.sessionId);
        const goals = await getUserGoals(ctx.user.id);
        const goal = await getUserGoal(ctx.user.id);
        const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";

        const exerciseSummary = logs.map((item: any) => {
          const exercise = item.exercise;
          const log = item.log;
          const label = exercise?.nameKo ?? exercise?.name ?? "운동";
          if (log.durationSeconds) {
            const minutes = Math.round(log.durationSeconds / 60);
            const distance = log.distanceM ? `, ${(log.distanceM / 1000).toFixed(1)}km` : "";
            return `${label}: ${minutes}분${distance}`;
          }
          const weight = Number(log.weightKg) || 0;
          const reps = Number(log.reps) || 0;
          return `${label}: ${weight ? `${weight}kg x ` : ""}${reps}회`;
        });
        const uniqueExercises = Array.from(new Set(logs.map((item: any) => item.exercise?.nameKo ?? item.exercise?.name).filter(Boolean)));
        const totalStrengthSets = logs.filter((item: any) => !item.log.durationSeconds).length;
        const totalVolume = logs.reduce((sum: number, item: any) => sum + (Number(item.log.weightKg) || 0) * (Number(item.log.reps) || 0), 0);
        const timedMinutes = logs.reduce((sum: number, item: any) => sum + Math.round((Number(item.log.durationSeconds) || 0) / 60), 0);

        const fallback = {
          summary: `${uniqueExercises.length}개 운동을 기록했습니다. 근력 ${totalStrengthSets}세트${timedMinutes ? `, 시간 운동 ${timedMinutes}분` : ""}${totalVolume ? `, 총 볼륨 ${Math.round(totalVolume).toLocaleString()}kg` : ""}입니다.`,
          highlights: [
            totalStrengthSets ? `근력 운동 ${totalStrengthSets}세트 완료` : "시간 기반 운동 완료",
            totalVolume ? `총 볼륨 ${Math.round(totalVolume).toLocaleString()}kg` : `${timedMinutes}분 기록`,
          ].filter(Boolean).slice(0, 3),
          advice: "오늘 기록을 기준으로 다음 운동에서는 컨디션이 좋으면 같은 무게에서 1~2회 반복을 먼저 늘려보세요.",
          nextFocus: "같은 부위는 충분히 회복한 뒤 진행하고, 내일은 피로가 큰 부위를 피해서 구성하세요.",
          caution: "통증이 있으면 중량보다 자세와 가동 범위를 우선하세요.",
          source: "fallback" as const,
        };

        if (!logs.length) return fallback;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `당신은 운동 기록을 읽고 짧고 실용적인 피드백을 주는 퍼스널 트레이너입니다.
                사용자의 당일 운동 기록만 보고 한국어로 답하세요.
                과장하지 말고, 칭찬 1개, 기록 요약, 다음 운동 팁, 주의점을 짧게 제공합니다.
                의료 진단처럼 말하지 말고 통증이 있으면 휴식/전문가 상담을 권하세요.
                응답은 반드시 JSON 형식으로 해주세요.`,
              },
              {
                role: "user",
                content: `사용자 목표:
${formatRecommendationGoal(goals, goal)}
숙련도: ${experienceLevel}

오늘 운동 세션:
이름: ${session.name ?? "운동 세션"}
시간: ${session.durationMinutes ?? "미기록"}분
총 운동 종류: ${uniqueExercises.length}개
근력 세트: ${totalStrengthSets}세트
총 볼륨: ${Math.round(totalVolume)}kg
시간 기반 운동: ${timedMinutes}분
사용자 메모: ${session.notes ?? "없음"}

운동 상세:
${exerciseSummary.slice(0, 80).join("\n")}

오늘 운동에 대한 짧은 요약과 다음 운동 조언을 작성해주세요.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "workout_session_summary",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "오늘 운동 전체 요약 한두 문장" },
                    highlights: { type: "array", items: { type: "string" }, description: "잘한 점 또는 핵심 기록 2~3개" },
                    advice: { type: "string", description: "다음 운동에 적용할 조언" },
                    nextFocus: { type: "string", description: "다음 운동 추천 방향" },
                    caution: { type: "string", description: "주의할 점" },
                  },
                  required: ["summary", "highlights", "advice", "nextFocus", "caution"],
                  additionalProperties: false,
                },
              },
            },
          });
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : null;
          const parsed = content ? JSON.parse(content) : null;
          return {
            summary: String(parsed?.summary ?? fallback.summary),
            highlights: Array.isArray(parsed?.highlights) ? parsed.highlights.slice(0, 4).map(String) : fallback.highlights,
            advice: String(parsed?.advice ?? fallback.advice),
            nextFocus: String(parsed?.nextFocus ?? fallback.nextFocus),
            caution: String(parsed?.caution ?? fallback.caution),
            source: "ai" as const,
          };
        } catch {
          return fallback;
        }
      }),

    aiExerciseFeedback: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        exerciseId: z.number(),
        currentExerciseIds: z.array(z.number()).max(30).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");

        const exercise = await getExerciseById(input.exerciseId);
        if (!exercise) throw new Error("Exercise not found");

        const currentExercises = (
          await Promise.all(input.currentExerciseIds.map((id) => getExerciseById(id)))
        ).filter(Boolean) as any[];
        const goals = await getUserGoals(ctx.user.id);
        const goal = await getUserGoal(ctx.user.id);
        const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";

        const targetLabel = bodyPartLabels[String(exercise.bodyPart)] ?? String(exercise.bodyPart ?? "기타");
        const fallback = {
          title: `${exercise.nameKo} 추가 피드백`,
          fit: `${targetLabel} 운동으로 현재 세션에 추가할 수 있습니다.`,
          orderTip: "복합 운동이면 앞쪽에, 보조/고립 운동이면 메인 운동 뒤에 배치하세요.",
          volumeTip: "처음 추가하는 운동이면 2~3세트부터 시작하고 컨디션에 따라 늘리세요.",
          caution: "통증이 있으면 중량보다 자세와 가동 범위를 우선하세요.",
          source: "fallback" as const,
        };

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `당신은 운동 세션 중 새로 추가한 운동에 대해 즉시 피드백하는 퍼스널 트레이너입니다.
                한국어로 짧고 실용적으로 답하세요.
                사용자가 방금 추가한 운동이 현재 세션 구성에 맞는지, 어느 순서가 좋은지, 볼륨은 어떻게 시작할지, 주의점만 말하세요.
                새 운동을 지어내지 말고, 과장하지 마세요.
                응답은 반드시 JSON 형식으로 해주세요.`,
              },
              {
                role: "user",
                content: `사용자 목표: ${formatRecommendationGoal(goals, goal)}
숙련도: ${experienceLevel}
현재 세션 이름: ${session.name ?? "운동 세션"}
현재 세션 운동 목록: ${currentExercises.map((item) => `${item.nameKo}(${bodyPartLabels[String(item.bodyPart)] ?? item.bodyPart ?? "기타"})`).join(", ") || "없음"}
방금 추가한 운동: ${exercise.nameKo} / ${exercise.name}
방금 추가한 운동 부위: ${targetLabel}
운동 방식: ${equipmentLabels[String(exercise.equipment)] ?? exercise.equipment ?? "미분류"}

이 운동을 추가한 것에 대한 즉시 피드백을 작성해주세요.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "exercise_add_feedback",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    fit: { type: "string" },
                    orderTip: { type: "string" },
                    volumeTip: { type: "string" },
                    caution: { type: "string" },
                  },
                  required: ["title", "fit", "orderTip", "volumeTip", "caution"],
                  additionalProperties: false,
                },
              },
            },
          });
          const rawContent = response.choices[0]?.message?.content;
          const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : null;
          return {
            title: String(parsed?.title ?? fallback.title),
            fit: String(parsed?.fit ?? fallback.fit),
            orderTip: String(parsed?.orderTip ?? fallback.orderTip),
            volumeTip: String(parsed?.volumeTip ?? fallback.volumeTip),
            caution: String(parsed?.caution ?? fallback.caution),
            source: "ai" as const,
          };
        } catch {
          return fallback;
        }
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
      .input(workoutLogInputSchema.extend({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        const logId = await addWorkoutLog(input);
        return { logId };
      }),

    updateSession: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        workoutDate: z.date().optional(),
        durationMinutes: z.number().min(0).max(24 * 60),
        notes: z.string().max(500).optional(),
        logs: z.array(workoutLogInputSchema).min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getWorkoutSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Not found");
        await updateWorkoutSession(input.sessionId, input);
        return { success: true };
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
        const sessions = await getSessionsInDateRange(ctx.user.id, from, to);
        const result: any[] = [];
        for (const session of sessions) {
          const logs = await getWorkoutLogsBySession(session.id);
          result.push({ ...session, logs });
        }
        return result;
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
    parseWorkoutCapture: protectedProcedure
      .input(z.object({
        imageDataUrl: z.string().min(100).max(5_800_000),
      }))
      .mutation(async ({ input }) => {
        if (!input.imageDataUrl.startsWith("data:image/")) {
          throw new Error("이미지 파일만 분석할 수 있습니다.");
        }

        const exercises = await getExercises();
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `당신은 운동 기록 스크린샷을 읽어 구조화하는 OCR/운동 기록 정리 도우미입니다.
이미지에 보이는 실제 운동 기록만 추출하세요. 보이지 않는 운동, 세트, 무게, 횟수는 추측하지 마세요.
운동명은 화면에 보이는 이름을 그대로 적고, 한국어/영어가 함께 보이면 둘 다 적으세요.
exerciseId는 항상 0으로 반환하세요. 서버가 운동 DB와 별도로 매칭합니다.
근력 운동은 세트별 weightKg/reps를 채우고, 유산소/시간형 운동은 durationMinutes/distanceKm를 채우세요.
운동 시간이 전체 세션 시간만 보이면 각 운동에 억지로 나누지 말고 notes에 남기세요.
날짜가 이미지에 명확히 보이면 YYYY-MM-DD로 반환하고, 없으면 빈 문자열로 반환하세요.
응답은 반드시 JSON만 반환하세요.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `반환 규칙:
- mode는 strength, cardio, duration 중 하나
- 숫자를 모르면 0
- 세트 번호는 1부터
- confidence는 0~1 사이
- 운동명은 추론하지 말고 이미지에 보이는 텍스트 기반으로만 작성`,
                },
                {
                  type: "image_url",
                  image_url: { url: input.imageDataUrl },
                },
              ],
            },
          ],
          maxTokens: 4096,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "workout_capture_parse",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  workoutDate: { type: "string" },
                  confidence: { type: "number" },
                  notes: { type: "string" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exerciseId: { type: "number" },
                        nameKo: { type: "string" },
                        name: { type: "string" },
                        mode: { type: "string" },
                        durationMinutes: { type: "number" },
                        distanceKm: { type: "number" },
                        intensity: { type: "string" },
                        sets: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              setNumber: { type: "number" },
                              weightKg: { type: "number" },
                              reps: { type: "number" },
                              durationMinutes: { type: "number" },
                              distanceKm: { type: "number" },
                            },
                            required: ["setNumber", "weightKg", "reps", "durationMinutes", "distanceKm"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["exerciseId", "nameKo", "name", "mode", "durationMinutes", "distanceKm", "intensity", "sets"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["workoutDate", "confidence", "notes", "exercises"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "";
        let parsed: any = null;
        try {
          parsed = content ? JSON.parse(content) : null;
        } catch {
          throw new Error("캡처 분석 결과를 읽지 못했습니다. 글자가 선명한 캡처로 다시 시도해주세요.");
        }

        return normalizeWorkoutCaptureResult(parsed, exercises);
      }),

    exerciseSelectionFeedback: protectedProcedure
      .input(z.object({
        exerciseId: z.number(),
        selectedExerciseIds: z.array(z.number()).max(30).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const exercise = await getExerciseById(input.exerciseId);
        if (!exercise) throw new Error("Exercise not found");
        const selectedExercises = (
          await Promise.all(input.selectedExerciseIds.map((id) => getExerciseById(id)))
        ).filter(Boolean) as any[];
        const goals = await getUserGoals(ctx.user.id);
        const goal = await getUserGoal(ctx.user.id);
        const experienceLevel = await getUserPreference(ctx.user.id, "experienceLevel") ?? "beginner";
        const targetLabel = bodyPartLabels[String(exercise.bodyPart)] ?? String(exercise.bodyPart ?? "기타");
        const fallback = {
          title: `${exercise.nameKo} 추가 피드백`,
          fit: `${targetLabel} 운동으로 기록에 추가했습니다. 오늘 같은 부위를 많이 넣었다면 세트 수를 낮춰 시작하세요.`,
          orderTip: "복합 운동은 앞쪽, 보조/고립 운동은 뒤쪽에 기록하는 흐름이 좋습니다.",
          volumeTip: "처음 기록하는 운동이면 2~3세트부터 시작하고, 다음 기록에서 점진적으로 늘리세요.",
          caution: "통증이 있으면 중량보다 자세와 가동 범위를 우선하세요.",
          source: "fallback" as const,
        };

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `당신은 자유 운동 기록에 운동을 추가할 때 즉시 피드백하는 퍼스널 트레이너입니다.
                한국어로 짧게 답하세요. 지금 추가한 운동이 현재 선택 목록과 목표에 맞는지, 순서, 세트 시작점, 주의점을 알려주세요.
                응답은 반드시 JSON 형식으로 해주세요.`,
              },
              {
                role: "user",
                content: `사용자 목표: ${formatRecommendationGoal(goals, goal)}
숙련도: ${experienceLevel}
현재 선택된 운동: ${selectedExercises.map((item) => `${item.nameKo}(${bodyPartLabels[String(item.bodyPart)] ?? item.bodyPart ?? "기타"})`).join(", ") || "없음"}
방금 추가한 운동: ${exercise.nameKo} / ${exercise.name}
방금 추가한 운동 부위: ${targetLabel}
운동 방식: ${equipmentLabels[String(exercise.equipment)] ?? exercise.equipment ?? "미분류"}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "exercise_selection_feedback",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    fit: { type: "string" },
                    orderTip: { type: "string" },
                    volumeTip: { type: "string" },
                    caution: { type: "string" },
                  },
                  required: ["title", "fit", "orderTip", "volumeTip", "caution"],
                  additionalProperties: false,
                },
              },
            },
          });
          const rawContent = response.choices[0]?.message?.content;
          const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : null;
          return {
            title: String(parsed?.title ?? fallback.title),
            fit: String(parsed?.fit ?? fallback.fit),
            orderTip: String(parsed?.orderTip ?? fallback.orderTip),
            volumeTip: String(parsed?.volumeTip ?? fallback.volumeTip),
            caution: String(parsed?.caution ?? fallback.caution),
            source: "ai" as const,
          };
        } catch {
          return fallback;
        }
      }),

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
        gymName: z.string().max(80).optional(),
        equipment: z.array(z.string()).default([]),
        equipmentDetails: z.array(z.string().min(1).max(50)).max(40).default([]),
        sessionDuration: z.number().int().min(20).max(180).default(60),
        targetBodyParts: z.array(z.enum(["chest", "back", "shoulders", "biceps", "triceps", "arms", "legs", "glutes", "abs"])).min(1).max(5),
        includeCardio: z.boolean().default(false),
        includeCore: z.boolean().default(true),
        warmupStretchMinutes: z.number().int().min(0).max(40).default(10),
        cooldownStretchMinutes: z.number().int().min(0).max(40).default(10),
        cardioMinutes: z.number().int().min(0).max(90).default(20),
        intensity: z.enum(["light", "normal", "hard"]).default("normal"),
        injuryNotes: z.string().max(500).optional(),
        avoidExercises: z.string().max(500).optional(),
        preferredExercises: z.string().max(500).optional(),
        availableWorkoutTimes: z.string().max(300).optional(),
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
        const equipmentDetailText = input.equipmentDetails.length
          ? `등록된 실제 기구 목록: ${normalizeEquipmentDetails(input.equipmentDetails).join(", ")}`
          : "등록된 실제 기구 목록: 미입력";
        const personalConstraintText = [
          input.injuryNotes?.trim() ? `부상/통증/주의 부위: ${input.injuryNotes.trim()}` : "부상/통증/주의 부위: 미입력",
          input.avoidExercises?.trim() ? `피하고 싶은 운동/동작: ${input.avoidExercises.trim()}` : "피하고 싶은 운동/동작: 미입력",
          input.preferredExercises?.trim() ? `선호 운동/동작: ${input.preferredExercises.trim()}` : "선호 운동/동작: 미입력",
          input.availableWorkoutTimes?.trim() ? `운동 가능 시간대/요일: ${input.availableWorkoutTimes.trim()}` : "운동 가능 시간대/요일: 미입력",
        ].join("\n");
        const recentHistoryText = summarizeWorkoutHistoryForPrompt(recentSessions, logsBySession);
        const cardioText = input.includeCardio
          ? `유산소 포함: ${input.cardioMinutes}분. 단, 하체가 주요 타겟이면 고강도 유산소는 제외하고 저강도 또는 생략.`
          : "유산소 제외";
        const mainWorkoutMinutes = Math.max(20, input.sessionDuration - input.warmupStretchMinutes - input.cooldownStretchMinutes);
        const plannedCardioMinutes = input.includeCardio ? Math.min(input.cardioMinutes, Math.max(0, mainWorkoutMinutes - 20)) : 0;
        const strengthWorkoutMinutes = Math.max(20, mainWorkoutMinutes - plannedCardioMinutes);
        const targetExerciseCount = getTargetStrengthExerciseCount(
          input.sessionDuration,
          input.warmupStretchMinutes,
          input.cooldownStretchMinutes,
          plannedCardioMinutes,
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
              - 총 세션 시간은 ${input.sessionDuration}분입니다. 스트레칭 ${input.warmupStretchMinutes + input.cooldownStretchMinutes}분을 제외한 exercises 블록은 약 ${mainWorkoutMinutes}분을 채워야 합니다.
              - 유산소를 포함하면 ${plannedCardioMinutes}분만 유산소로 쓰고, 남은 근력 운동 시간 ${strengthWorkoutMinutes}분에 맞춰 근력 운동을 구성하세요.
              - exercises의 근력 운동은 ${targetExerciseCount}개 안팎으로 구성하세요. 긴 운동 시간인데 4~6개로 짧게 끝내지 말고, 타겟 부위에 맞는 메인/보조/고립 운동으로 시간을 채우세요.
              - 근력 운동 시간 계산은 각 운동의 세트 수행 1분 + 세트 사이 휴식 + 운동 전환 1~2분으로 잡으세요. 합산이 ${strengthWorkoutMinutes}분보다 10분 이상 짧으면 운동을 추가하거나 주요 운동 세트를 늘리세요.
              - 근력 운동은 "ID:123 | 한국어 운동명 (영어 운동명) - 세트x횟수 - 휴식" 형식으로 작성하세요.
              - 근력 운동 줄에는 "20분" 같은 운동 시간을 붙이지 마세요. 시간은 세트 수, 반복 수, 휴식 시간을 통해 맞추세요.
              - 유산소는 세트/횟수가 아니라 "ID:123 | 러닝, 트레드밀 (Running, Treadmill) - ${plannedCardioMinutes}분"처럼 시간 형식으로 작성하세요.
              - 유산소는 하루에 한 줄만 허용합니다.
              - 지정된 기구 종류와 등록된 실제 기구 목록을 우선 반영하세요. 실제 기구 목록에 있는 머신, 케이블, 랙, 벤치, 플랫폼 이름과 맞는 운동을 우선 추천하세요.
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
${input.gymName?.trim() ? `등록된 운동 장소 이름: ${input.gymName.trim()}` : "등록된 운동 장소 이름: 미입력"}
${equipmentText}
${equipmentDetailText}
${personalConstraintText}
총 세션 시간: ${input.sessionDuration}분
스트레칭 제외 실제 운동 시간: ${mainWorkoutMinutes}분
유산소 제외 근력 운동 시간: ${strengthWorkoutMinutes}분
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
스트레칭과 유산소를 제외한 근력 운동 합산 시간이 ${strengthWorkoutMinutes}분에 최대한 가깝도록 운동 수와 세트 수를 조정하세요.
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
        gymName: z.string().max(80).optional(),
        equipment: z.array(z.string()).default([]),
        equipmentDetails: z.array(z.string().min(1).max(50)).max(40).default([]),
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
        injuryNotes: z.string().max(500).optional(),
        avoidExercises: z.string().max(500).optional(),
        preferredExercises: z.string().max(500).optional(),
        availableWorkoutTimes: z.string().max(300).optional(),
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
      const gymNameText = input?.gymName?.trim()
        ? `등록된 운동 장소 이름: ${input.gymName.trim()}`
        : "등록된 운동 장소 이름: 미입력";

      const equipmentText = input?.equipment && input.equipment.length > 0
        ? `사용 가능한 기구: ${input.equipment.map((item) => equipmentLabels[item] || item).join(", ")}`
        : input?.location === "home"
          ? "사용 가능한 기구: 맨몸 운동만 가능 (기구 없음)"
          : "사용 가능한 기구: 헬스장 전체 기구 (바벨, 덤벨, 머신, 케이블 등)";
      const equipmentDetailText = input?.equipmentDetails && input.equipmentDetails.length > 0
        ? `등록된 실제 기구 목록: ${normalizeEquipmentDetails(input.equipmentDetails).join(", ")}`
        : "등록된 실제 기구 목록: 미입력";
      const personalConstraintText = [
        input?.injuryNotes?.trim() ? `부상/통증/주의 부위: ${input.injuryNotes.trim()}` : "부상/통증/주의 부위: 미입력",
        input?.avoidExercises?.trim() ? `피하고 싶은 운동/동작: ${input.avoidExercises.trim()}` : "피하고 싶은 운동/동작: 미입력",
        input?.preferredExercises?.trim() ? `선호 운동/동작: ${input.preferredExercises.trim()}` : "선호 운동/동작: 미입력",
        input?.availableWorkoutTimes?.trim() ? `운동 가능 시간대/요일: ${input.availableWorkoutTimes.trim()}` : "운동 가능 시간대/요일: 미입력",
      ].join("\n");

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
      const sessionDuration = input?.sessionDuration ?? 60;
      const mainWorkoutMinutes = Math.max(20, sessionDuration - warmupStretchMinutes - cooldownStretchMinutes);
      const plannedCardioMinutes = includeCardio ? Math.min(cardioMinutes, Math.max(0, mainWorkoutMinutes - 20)) : 0;
      const strengthWorkoutMinutes = Math.max(20, mainWorkoutMinutes - plannedCardioMinutes);
      const targetExerciseCount = getTargetStrengthExerciseCount(
        sessionDuration,
        warmupStretchMinutes,
        cooldownStretchMinutes,
        plannedCardioMinutes,
      );
      const accessoryText = [
        includeCardio ? `유산소를 주간 계획에 적절히 포함, 유산소를 넣는 날은 ${plannedCardioMinutes}분` : "유산소는 제외",
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
        "먼저 사용자의 목표/숙련도/최근 기록/운동 가능 시간/기구를 바탕으로 각 운동일의 focus를 직접 설계한 뒤, 그 focus에 맞는 운동만 선택하세요.",
        "각 운동일의 focus와 맞는 운동만 넣으세요. 예를 들어 등/어깨/이두 날에는 스쿼트, 핵스쿼트, 런지, 레그프레스, 레그컬, 카프레이즈 같은 하체 운동을 넣지 말고, 하체 운동은 하체/둔근 포커스 날에만 배치하세요.",
        "가슴 날에는 등/하체 운동을, 등 날에는 가슴/하체 운동을, 어깨/팔 날에는 하체 운동을 섞지 마세요. 복근은 includeCore가 켜진 경우에만 코어 보조로 배치하세요.",
        includeCardio
          ? `유산소는 같은 운동일에 중복해서 넣지 마세요. 러닝/트레드밀은 하루에 한 줄만 허용하고, 유산소 시간은 ${plannedCardioMinutes}분으로 작성하세요.`
          : "유산소 운동은 넣지 마세요.",
        "등/이두, 가슴/삼두, 하체, 어깨/코어처럼 서로 보조 작용이 자연스러운 조합을 우선하세요.",
        "사용자가 운동일별 희망 구성을 적으면 그 구성을 기준으로 삼고, 비어 있는 날이나 애매한 표현만 AI가 보완하세요. 사용자가 적은 순번을 다른 날로 옮기지 마세요.",
      ].join("\n            - ");
      const dayFocusText = input?.dayFocusNotes?.trim()
        ? `운동일별 희망 구성: ${input.dayFocusNotes.trim()}`
        : "운동일별 희망 구성: AI가 목표, 숙련도, 최근 기록, 회복을 고려해 1일차부터 직접 설계";
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
            - 지정된 기구 종류와 등록된 실제 기구 목록을 우선 반영하세요. 실제 기구 목록에 있는 머신, 케이블, 랙, 벤치, 플랫폼 이름과 맞는 운동을 우선 추천하세요.
            - weeklyPlan은 반드시 사용자가 선택한 주 운동일 수와 같은 개수로 구성하세요.
            - 루틴은 요일 기준이 아닙니다. day 값은 반드시 "1일차", "2일차", "3일차"처럼 주간 순번으로 작성하세요.
            - 사용자가 운동일별 희망 구성을 입력했다면 그 구성을 기준으로 각 일차 focus를 먼저 확정하고, 그 focus에 맞는 운동만 선택하세요. 서버가 나중에 재배치하지 않으므로 AI가 처음부터 올바르게 나눠야 합니다.
            - 사용자가 운동일별 희망 구성을 입력하지 않았다면 AI가 직접 "1일차 등/이두", "2일차 가슴/삼두"처럼 부위 구성을 설계하세요.
            - 각 운동일의 총 세션 시간은 ${sessionDuration}분입니다. 스트레칭 ${warmupStretchMinutes + cooldownStretchMinutes}분을 제외한 exercises 블록은 약 ${mainWorkoutMinutes}분을 채워야 합니다.
            - 유산소가 포함된 날은 유산소 ${plannedCardioMinutes}분을 제외하고, 근력 운동 ${strengthWorkoutMinutes}분에 맞춰 메인/보조/고립 운동 볼륨을 구성하세요.
            - 각 운동일의 총 시간이 지정된 운동 가능 시간을 초과하지 않도록 하되, 긴 운동 시간인데 운동량이 너무 적게 나오지 않게 하세요.
            - 각 운동일의 exercises 근력 운동은 ${targetExerciseCount}개 안팎으로 구성하세요. 120분처럼 긴 운동 시간인데 3~4개만 추천하지 마세요.
            - 근력 운동 시간 계산은 각 운동의 세트 수행 1분 + 세트 사이 휴식 + 운동 전환 1~2분으로 잡으세요. 합산이 ${strengthWorkoutMinutes}분보다 10분 이상 짧으면 운동을 추가하거나 주요 운동 세트를 늘리세요.
            - 근력 운동 줄에는 "20분" 같은 운동 시간을 붙이지 마세요. 시간은 세트 수, 반복 수, 휴식 시간을 통해 맞추세요.
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
${gymNameText}
${equipmentText}
${equipmentDetailText}
${personalConstraintText}
${durationText}
스트레칭 제외 실제 운동 시간: 각 운동일 ${mainWorkoutMinutes}분
유산소 제외 근력 운동 시간: 각 운동일 ${strengthWorkoutMinutes}분
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
각 운동일은 스트레칭과 유산소를 제외한 근력 운동 합산 시간이 ${strengthWorkoutMinutes}분에 최대한 가깝도록 운동 수와 세트 수를 조정하세요.
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
