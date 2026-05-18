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
  replaceUserGoals,
  setUserPreference,
  toggleFavorite,
  updateRoutine,
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
    "스캐풀라 풀업 - 5분 (팔은 편 채 견갑만 내리고 올려 광배 활성화)",
    "월 슬라이드 - 5분 (벽에 등과 팔을 붙이고 견갑을 위아래로 움직임)",
    "밴드 풀 어파트 - 5분 (팔을 편 채 밴드를 벌려 후면 어깨와 등 활성화)",
  ],
  shoulders: [
    "암 서클 - 5분 (작은 원에서 큰 원으로 어깨 관절을 천천히 회전)",
    "밴드 외회전 - 5분 (팔꿈치를 옆구리에 붙이고 회전근개 활성화)",
    "스캐풀라 푸시업 - 5분 (팔은 편 채 견갑만 밀고 모으기)",
    "월 슬라이드 - 5분 (팔꿈치와 손등을 벽에 붙이고 위아래로 이동)",
  ],
  chest: [
    "암 스윙 - 5분 (팔을 앞뒤로 교차하며 가슴과 어깨 앞쪽 예열)",
    "스캐풀라 푸시업 - 5분 (견갑 안정화 후 푸시 동작 준비)",
    "밴드 체스트 오프너 - 5분 (밴드를 등 뒤로 잡고 가슴을 열기)",
    "인클라인 푸시업 워밍업 - 5분 (낮은 강도로 8~12회 반복)",
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
    "월드 그레이티스트 스트레치 - 5분 (런지 자세에서 흉추 회전)",
    "바디웨이트 스쿼트 - 5분 (천천히 앉았다 일어나며 무릎/고관절 준비)",
  ],
  glutes: [
    "글루트 브릿지 - 5분 (엉덩이를 조이며 둔근 활성화)",
    "클램쉘 - 5분 (무릎을 벌려 중둔근 활성화)",
    "힙 에어플레인 - 5분 (고관절 회전 조절 연습)",
    "몬스터 워크 - 5분 (밴드가 있으면 무릎 위에 걸고 좌우 이동)",
  ],
  abs: [
    "데드 버그 - 5분 (허리를 바닥에 붙이고 팔다리 교차)",
    "버드 독 - 5분 (몸통 흔들림 없이 팔/다리 뻗기)",
    "플랭크 숄더 탭 - 5분 (골반을 고정하고 어깨 터치)",
    "캣 카우 - 5분 (복압 잡기 전 척추 가동성 확보)",
  ],
  full_body: [
    "인치웜 - 5분 (햄스트링과 어깨를 함께 예열)",
    "월드 그레이티스트 스트레치 - 5분 (런지와 흉추 회전)",
    "암 서클 - 5분 (어깨 관절을 전후 방향으로 회전)",
    "바디웨이트 스쿼트 - 5분 (하체와 코어를 함께 준비)",
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

function buildDetailedStretchRoutine(day: any, phase: "warmup" | "cooldown") {
  const catalog = phase === "warmup" ? warmupStretchCatalog : cooldownStretchCatalog;
  const parts = getBodyPartsFromFocus(day);
  const selected: string[] = [];

  for (const part of parts) {
    for (const item of catalog[part] ?? catalog.full_body) {
      if (!selected.includes(item)) selected.push(item);
      if (selected.length >= 4) return selected;
    }
  }

  for (const item of catalog.full_body) {
    if (!selected.includes(item)) selected.push(item);
    if (selected.length >= 4) break;
  }

  return selected;
}

function isGenericStretchLine(value: string) {
  const text = String(value).toLowerCase();
  return /^(등|어깨|가슴|하체|팔|복근|전신|둔근|고관절)\s*스트레칭\s*-\s*(10|20)분/.test(text)
    || !/[()]/.test(text) && !/(포즈|밴드|월|암|레그|브릿지|로테이션|도어웨이|폼롤러|스윙|스캐풀라|스트레치|서클|카우|버그|독|플랭크|스쿼트|런지|피전|코브라|나비|카프)/.test(text);
}

function normalizeStretchBlock(day: any, phase: "warmup" | "cooldown") {
  const key = phase === "warmup" ? "warmupStretch" : "cooldownStretch";
  const items = Array.isArray(day?.[key]) ? day[key].map(String).filter(Boolean) : [];
  const totalIsTooSmall = items.length < 3;
  const hasGeneric = items.some(isGenericStretchLine);
  return totalIsTooSmall || hasGeneric ? buildDetailedStretchRoutine(day, phase) : items;
}

function normalizeProgramRecommendation(program: any) {
  if (!program?.weeklyPlan || !Array.isArray(program.weeklyPlan)) return program;

  return {
    ...program,
    weeklyPlan: program.weeklyPlan.map((day: any, index: number) => {
      const exercises = Array.isArray(day.exercises) ? day.exercises : [];
      const warmupStretch = Array.isArray(day.warmupStretch) ? day.warmupStretch : [];
      const cooldownStretch = Array.isArray(day.cooldownStretch) ? day.cooldownStretch : [];
      const mixedStretches = exercises.filter((item: string) => isStretchExerciseText(String(item)));
      const mainExercises = exercises.filter((item: string) => !isStretchExerciseText(String(item)));
      const sequenceLabel = `${index + 1}일차`;

      if (!warmupStretch.length && !cooldownStretch.length && mixedStretches.length) {
        const midpoint = Math.ceil(mixedStretches.length / 2);
        const nextDay = {
          ...day,
          day: sequenceLabel,
          warmupStretch: mixedStretches.slice(0, midpoint),
          cooldownStretch: mixedStretches.slice(midpoint),
          exercises: mainExercises,
        };
        return {
          ...nextDay,
          warmupStretch: normalizeStretchBlock(nextDay, "warmup"),
          cooldownStretch: normalizeStretchBlock(nextDay, "cooldown"),
        };
      }

      return {
        ...day,
        day: sequenceLabel,
        warmupStretch: normalizeStretchBlock({ ...day, exercises: mainExercises, warmupStretch, cooldownStretch }, "warmup"),
        cooldownStretch: normalizeStretchBlock({ ...day, exercises: mainExercises, warmupStretch, cooldownStretch }, "cooldown"),
        exercises: mainExercises,
      };
    }),
  };
}

function getPlanDayOrder(dayLabel: string) {
  const match = String(dayLabel).match(/(\d+)/);
  return match ? Number(match[1]) : 99;
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
  return `${exercise.nameKo} (${exercise.name}) | ${category} | ${equipment}`;
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
      .mutation(async ({ input }) => {
        await removeExerciseFromRoutine(input.id);
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

    programRecommendation: protectedProcedure
      .input(z.object({
        location: z.enum(["gym", "home", "outdoor"]).default("gym"),
        equipment: z.array(z.string()).default([]),
        sessionDuration: z.number().int().min(20).max(180).default(60),
        daysPerWeek: z.number().int().min(1).max(7).default(3),
        splitPreference: z.string().default("auto"),
        excludedBodyParts: z.array(z.string()).default([]),
        includeCardio: z.boolean().default(true),
        includeCore: z.boolean().default(true),
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
      const includeCore = input?.includeCore ?? true;
      const accessoryText = [
        includeCardio ? "유산소를 주간 계획에 적절히 포함" : "유산소는 제외",
        includeCore ? "복근/코어를 주간 계획에 적절히 포함" : "복근/코어는 제외",
      ].join(", ");
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
            - exercises 배열의 각 항목은 반드시 "한국어 운동명 (영어 운동명) - 세트x횟수 - 휴식" 형식으로 작성하세요.
            - 지정된 기구만 사용하는 운동으로 구성하세요.
            - weeklyPlan은 반드시 사용자가 선택한 주 운동일 수와 같은 개수로 구성하세요.
            - 루틴은 요일 기준이 아닙니다. day 값은 반드시 "1일차", "2일차", "3일차"처럼 주간 순번으로 작성하세요.
            - 각 운동일의 총 시간이 지정된 운동 가능 시간을 초과하지 않도록 하세요.
            - 홈트레이닝이면 맨몸 운동 위주로, 헬스장이면 기구 운동을 포함하세요.
            - 머신과 케이블은 서로 다른 기구입니다. 케이블이 선택되지 않았으면 케이블 운동을 넣지 말고, 머신이 선택되지 않았으면 머신 운동을 넣지 마세요.
            - 운동명은 한국어 운동명을 우선 사용하고, 필요하면 괄호 안에 영어명을 보조로 적으세요.
            - 사용자가 제외한 부위/운동은 넣지 마세요.
            - 유산소/복근 포함 여부와 사용자 추가 요청을 우선순위 높게 반영하세요.
            - exercises에는 메인 운동, 보조 운동, 선택된 경우 유산소/복근만 넣으세요. 스트레칭은 exercises에 넣지 마세요.
            - 각 운동일마다 warmupStretch 배열과 cooldownStretch 배열을 반드시 작성하세요.
            - warmupStretch는 운동 전 동적 스트레칭/가동성 루틴 총 20분, cooldownStretch는 운동 후 정적 스트레칭 총 20분으로 구성하세요.
            - 스트레칭은 DB 후보의 부위별 스트레칭에서 골라 "등 스트레칭 - 5분", "어깨 스트레칭 - 5분"처럼 시간 단위로 적고, 세트x횟수/휴식 형식을 쓰지 마세요.
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
각 운동일에는 운동 전 스트레칭 20분과 운동 후 스트레칭 20분을 따로 분리해서 포함해주세요. 스트레칭은 exercises에 섞지 마세요.`,
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
                        description: "운동 전 동적 스트레칭/가동성 루틴. 총 20분.",
                      },
                      exercises: {
                        type: "array",
                        items: { type: "string" },
                        description: "메인/보조/유산소/복근 운동 목록. 스트레칭 제외.",
                      },
                      cooldownStretch: {
                        type: "array",
                        items: { type: "string" },
                        description: "운동 후 정적 스트레칭 루틴. 총 20분.",
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
      parsed = normalizeProgramRecommendation(parsed);

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
              item.isStretch ? 1 : 3,
              item.isStretch ? getMinutesFromText(item.text) : 10,
              item.isStretch ? 0 : 90,
            );
            order += 1;
            addedCount += 1;
          }

          created.push({ routineId, name: `AI ${day.day} ${day.focus}`.trim(), addedCount });
        }

        return { success: true, created };
      }),

    dietRecommendation: protectedProcedure.query(async ({ ctx }) => {
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

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `당신은 전문 스포츠 영양사입니다. 사용자의 운동 목표와 체중 데이터를 바탕으로 맞춤 하루 식단을 추천해주세요.
다음 사항을 반드시 포함하세요:
- 하루 권장 칼로리 및 단백질/탄수화물/지방 비율
- 아침/점심/저녀/간식 식단 (한국식 식품 위주로)
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

위 정보를 바탕으로 오늘 하루 맞춤 식단을 추천해주세요. 특히 권장 칼로리(${recommendedCalories}kcal), 식단 전략(${nutritionStrategy.label}), 단백질 목표(${nutritionStrategy.proteinTarget}g)를 기준으로 식단을 설계해주세요.`,
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
