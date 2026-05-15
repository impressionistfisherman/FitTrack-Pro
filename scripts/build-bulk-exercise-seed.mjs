import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.resolve(projectRoot, "%TEMP%", "free-exercise-db-codex", "dist", "exercises.json");
const baselinePath = path.resolve(projectRoot, "server", "data", "core-exercises-baseline.json");
const targetPath = path.resolve(projectRoot, "server", "data", "bulk-exercises.json");

const existingExercises = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

async function loadSourceExercises() {
  if (fs.existsSync(sourcePath)) {
    return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  }

  const response = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
  if (!response.ok) {
    throw new Error(`Failed to download free-exercise-db source: ${response.status}`);
  }
  return await response.json();
}

const manualNameOverrides = new Map([
  ["3/4 Sit-Up", "3/4 싯업"],
  ["90/90 Hamstring", "90/90 햄스트링 스트레치"],
  ["Ab Crunch Machine", "앱 크런치 머신"],
  ["Ab Roller", "AB 롤러"],
  ["Abdominal Stretch", "복근 스트레칭"],
  ["Advanced Kettlebell Windmill", "어드밴스드 케틀벨 윈드밀"],
  ["Adductor", "어덕터"],
  ["Adductor/Groin", "어덕터 그로인 스트레치"],
  ["Air Bike", "에어 바이크"],
  ["All Fours Quad Stretch", "올포 쿼드 스트레치"],
  ["Alternate Hammer Curl", "얼터네이트 해머 컬"],
  ["Alternate Heel Touchers", "얼터네이트 힐 터치"],
  ["Alternate Incline Dumbbell Curl", "얼터네이트 인클라인 덤벨 컬"],
  ["Alternate Leg Diagonal Bound", "얼터네이트 레그 다이아고널 바운드"],
  ["Alternating Renegade Row", "얼터네이팅 레니게이드 로우"],
  ["Arnold Dumbbell Press", "아놀드 덤벨 프레스"],
  ["Around The Worlds", "어라운드 더 월드"],
  ["Atlas Stones", "아틀라스 스톤"],
  ["Atlas Stone Trainer", "아틀라스 스톤 트레이너"],
  ["Back Flyes - With Bands", "밴드 백 플라이"],
  ["Balance Board", "밸런스 보드"],
  ["Band Assisted Pull-Up", "밴드 어시스트 풀업"],
  ["Band Pull Apart", "밴드 풀어파트"],
  ["Barbell Bench Press - Medium Grip", "바벨 벤치프레스"],
  ["Barbell Full Squat", "바벨 풀 스쿼트"],
  ["Barbell Glute Bridge", "바벨 글루트 브리지"],
  ["Barbell Hip Thrust", "바벨 힙 스러스트"],
  ["Barbell Incline Bench Press - Medium Grip", "인클라인 바벨 벤치프레스"],
  ["Barbell Rollout from Bench", "바벨 롤아웃"],
  ["Battling Ropes", "배틀 로프"],
  ["Bench Dips", "벤치 딥스"],
  ["Bodyweight Flyes", "맨몸 플라이"],
  ["Butterfly", "버터플라이 스트레치"],
  ["Cable Chest Press", "케이블 체스트 프레스"],
  ["Cable Crossover", "케이블 크로스오버"],
  ["Cable Crunch", "케이블 크런치"],
  ["Cable Hammer Curls - Rope Attachment", "케이블 해머 컬"],
  ["Cable Hip Adduction", "케이블 힙 어덕션"],
  ["Cable Incline Triceps Extension", "케이블 인클라인 트라이셉스 익스텐션"],
  ["Cable Internal Rotation", "케이블 내회전"],
  ["Cable Iron Cross", "케이블 아이언 크로스"],
  ["Decline EZ Bar Triceps Extension", "디클라인 EZ바 트라이셉스 익스텐션"],
  ["Foot-SMR", "발바닥 폼롤링"],
  ["Calf Press", "카프 프레스"],
  ["Calf Raise On A Dumbbell", "덤벨 카프 레이즈"],
  ["Cat Stretch", "캣 스트레치"],
  ["Child's Pose", "아이 자세"],
  ["Chin-Up", "친업"],
  ["Clean and Jerk", "클린 앤 저크"],
  ["Close-Grip Barbell Bench Press", "클로즈 그립 벤치프레스"],
  ["Concentration Curls", "컨센트레이션 컬"],
  ["Deadlift with Bands", "밴드 데드리프트"],
  ["Decline Barbell Bench Press", "디클라인 벤치프레스"],
  ["Dips - Chest Version", "체스트 딥스"],
  ["Dips - Triceps Version", "트라이셉 딥스"],
  ["Dumbbell Alternate Bicep Curl", "덤벨 컬"],
  ["Dumbbell Bench Press", "덤벨 벤치프레스"],
  ["Dumbbell Flyes", "덤벨 플라이"],
  ["Dumbbell Incline Flyes", "인클라인 덤벨 플라이"],
  ["Dumbbell One-Arm Row", "원암 덤벨 로우"],
  ["EZ-Bar Curl", "EZ바 컬"],
  ["EZ-Bar Preacher Curl", "EZ바 프리처 컬"],
  ["EZ-Bar Skullcrusher", "EZ바 스컬 크러셔"],
  ["Face Pull", "페이스 풀"],
  ["Farmer's Walk", "파머스 워크"],
  ["Flat Bench Leg Pull-In", "레그 풀인"],
  ["Hammer Grip Incline DB Bench Press", "해머 그립 인클라인 덤벨 벤치프레스"],
  ["Glute Bridge", "글루트 브리지"],
  ["Good Morning", "굿모닝"],
  ["Hack Squat", "핵 스쿼트"],
  ["Hammer Curls", "해머 컬"],
  ["Hanging Leg Raise", "행잉 레그 레이즈"],
  ["Incline Dumbbell Press", "인클라인 덤벨 벤치프레스"],
  ["Kettlebell Swing", "케틀벨 스윙"],
  ["Lat Pulldown", "랫 풀다운"],
  ["Leg Extensions", "레그 익스텐션"],
  ["Leg Press", "레그 프레스"],
  ["Lying Leg Curls", "라잉 레그 컬"],
  ["Mountain Climbers", "마운틴 클라이머"],
  ["Pec Deck Fly", "펙 덱 플라이"],
  ["Plank", "플랭크"],
  ["Pull-Up", "풀업"],
  ["Push-Up", "푸시업"],
  ["Romanian Deadlift", "루마니안 데드리프트"],
  ["Russian Twist", "러시안 트위스트"],
  ["Seated Cable Row", "시티드 케이블 로우"],
  ["Side Plank", "사이드 플랭크"],
  ["See-Saw Press (Alternating Side Press)", "시소 프레스"],
  ["Sumo Deadlift", "스모 데드리프트"],
  ["T-Bar Row with Handle", "T바 로우"],
  ["Triceps Pushdown - Rope Attachment", "트라이셉 푸시다운"],
  ["V-Up", "V업"],
  ["Wide-Grip Lat Pulldown", "와이드 그립 랫 풀다운"],
  ["World's Greatest Stretch", "세계 최고의 스트레칭"],
  ["Hyperextensions With No Hyperextension Bench", "무장비 하이퍼익스텐션"],
]);

const englishPhraseMap = [
  ["single-leg", "싱글 레그"],
  ["single arm", "싱글 암"],
  ["single-arm", "싱글 암"],
  ["alternate", "얼터네이트"],
  ["alternating", "얼터네이팅"],
  ["advanced", "어드밴스드"],
  ["all fours", "올포"],
  ["one arm", "원암"],
  ["one-arm", "원암"],
  ["two-arm", "투암"],
  ["two-dumbbell", "투 덤벨"],
  ["bent over", "벤트 오버"],
  ["behind the back", "비하인드 더 백"],
  ["behind head", "비하인드 헤드"],
  ["close-grip", "클로즈 그립"],
  ["wide-grip", "와이드 그립"],
  ["underhand", "언더핸드"],
  ["overhand", "오버핸드"],
  ["bodyweight", "맨몸"],
  ["smr", "폼롤링"],
  ["ez-bar", "EZ바"],
  ["ez bar", "EZ바"],
  ["db", "덤벨"],
  ["hyperextensions", "하이퍼익스텐션"],
  ["pallof", "팔로프"],
  ["supinated", "슈피네이티드"],
  ["leverage", "레버리지"],
  ["iso", "아이소"],
  ["see-saw", "시소"],
  ["see saw", "시소"],
  ["it band", "IT 밴드"],
  ["iliotibial tract", "장경인대"],
  ["latissimus dorsi", "광배근"],
  ["rhomboids", "능형근"],
  ["quadriceps", "대퇴사두근"],
  ["piriformis", "이상근"],
  ["peroneals", "비골근"],
  ["anterior tibialis", "전경골근"],
  ["brachialis", "상완근"],
  ["lower back", "허리"],
  ["neck", "목"],
  ["calves", "종아리"],
  ["hamstring", "햄스트링"],
  ["with rotation", "로테이션"],
  ["with band", "밴드 포함"],
  ["with bands", "밴드 포함"],
  ["with no", "무장비"],
  ["barbell", "바벨"],
  ["dumbbell", "덤벨"],
  ["kettlebell", "케틀벨"],
  ["cable", "케이블"],
  ["machine", "머신"],
  ["bands", "밴드"],
  ["band", "밴드"],
  ["medicine ball", "메디신 볼"],
  ["exercise ball", "짐볼"],
  ["foam roll", "폼롤"],
  ["bench press", "벤치프레스"],
  ["shoulder press", "숄더 프레스"],
  ["chest press", "체스트 프레스"],
  ["pull-up", "풀업"],
  ["chin-up", "친업"],
  ["push-up", "푸시업"],
  ["pushdown", "푸시다운"],
  ["pulldown", "풀다운"],
  ["deadlift", "데드리프트"],
  ["squat", "스쿼트"],
  ["lunge", "런지"],
  ["flyes", "플라이"],
  ["fly", "플라이"],
  ["crossover", "크로스오버"],
  ["crunch", "크런치"],
  ["sit-up", "싯업"],
  ["row", "로우"],
  ["curl", "컬"],
  ["raise", "레이즈"],
  ["extension", "익스텐션"],
  ["shrug", "슈러그"],
  ["pullover", "풀오버"],
  ["walk", "워크"],
  ["press", "프레스"],
  ["dip", "딥"],
  ["pullover", "풀오버"],
  ["rollout", "롤아웃"],
  ["roller", "롤러"],
  ["twist", "트위스트"],
  ["bridge", "브리지"],
  ["thrust", "스러스트"],
  ["step up", "스텝업"],
  ["step-up", "스텝업"],
  ["kickback", "킥백"],
  ["woodchopper", "우드초퍼"],
  ["windmill", "윈드밀"],
  ["drag", "드래그"],
  ["stretch", "스트레치"],
  ["rotation", "로테이션"],
  ["rotation", "로테이션"],
  ["circles", "서클"],
  ["circle", "서클"],
  ["jump", "점프"],
  ["carry", "캐리"],
  ["swing", "스윙"],
  ["clean", "클린"],
  ["jerk", "저크"],
  ["snatch", "스내치"],
  ["farmer's", "파머스"],
  ["farmers", "파머스"],
  ["arnold", "아놀드"],
  ["atlas", "아틀라스"],
  ["ab", "AB"],
  ["lat", "랫"],
  ["glute", "글루트"],
  ["hamstring", "햄스트링"],
  ["calf", "카프"],
  ["tricep", "트라이셉"],
  ["triceps", "트라이셉스"],
  ["bicep", "바이셉"],
  ["biceps", "바이셉스"],
  ["rear delt", "리어 델트"],
  ["front raise", "프론트 레이즈"],
  ["lateral raise", "레터럴 레이즈"],
  ["face pull", "페이스 풀"],
];

const cleanupReplacements = [
  [/벤치 프레스/g, "벤치프레스"],
  [/원 암/g, "원암"],
  [/투 암/g, "투암"],
  [/풀 업/g, "풀업"],
  [/친 업/g, "친업"],
  [/싯 업/g, "싯업"],
  [/스텝 업/g, "스텝업"],
  [/Ez Bar/g, "EZ바"],
  [/Db/g, "덤벨"],
  [/Smr/g, "폼롤링"],
  [/ And /g, " & "],
  [/ With /g, " "],
  [/파머의 워크/g, "파머스 워크"],
  [/세계 최대의 스트레칭/g, "세계 최고의 스트레칭"],
  [/Ab /g, "AB "],
  [/ - (미디엄|중간) 그립/g, ""],
  [/ \(단일 응답\)/g, ""],
  [/ \(여러 응답\)/g, ""],
  [/ +/g, " "],
];

function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/\(multiple response\)|\(single response\)|- medium grip/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function translateFallback(name) {
  const lower = name.toLowerCase();
  let value = ` ${lower} `;
  for (const [from, to] of englishPhraseMap.sort((a, b) => b[0].length - a[0].length)) {
    const pattern = new RegExp(`(?<![a-z])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "gi");
    value = value.replace(pattern, ` ${to} `);
  }
  value = value
    .replace(/[()]/g, " ")
    .replace(/\//g, " / ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let titled = value
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (/^[A-Z0-9/]+$/.test(token)) return token;
      if (/[가-힣]/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
  for (const [pattern, replacement] of cleanupReplacements) titled = titled.replace(pattern, replacement).trim();
  return titled;
}

function mapEquipment(value, name = "") {
  const equipment = String(value ?? "").toLowerCase();
  const lowerName = String(name).toLowerCase();
  if (lowerName.includes("band")) return "resistance_band";
  if (equipment === "barbell") return "barbell";
  if (equipment === "dumbbell") return "dumbbell";
  if (equipment === "machine") return "machine";
  if (equipment === "cable") return "cable";
  if (equipment === "body only") return "bodyweight";
  if (equipment === "kettlebells") return "kettlebell";
  if (equipment === "bands") return "resistance_band";
  if (equipment === "e-z curl bar") return "barbell";
  return "none";
}

function mapDifficulty(level) {
  if (level === "beginner") return "beginner";
  if (level === "intermediate") return "intermediate";
  return "advanced";
}

function mapCategory(exercise) {
  const category = String(exercise.category ?? "").toLowerCase();
  if (category === "stretching") return "flexibility";
  if (category === "cardio" || category === "plyometrics") return "cardio";
  if (category === "powerlifting" || category === "olympic weightlifting" || category === "strongman") return "strength";
  if (category === "strength" && exercise.mechanic === "isolation") return "hypertrophy";
  if (exercise.force === "static") return "endurance";
  return "strength";
}

function mapBodyPart(exercise) {
  const category = String(exercise.category ?? "").toLowerCase();
  if (category === "stretching") return "stretching";
  if (category === "cardio" || category === "plyometrics") return "cardio";
  if (category === "powerlifting" || category === "olympic weightlifting" || category === "strongman") return "full_body";

  const primary = (exercise.primaryMuscles ?? []).map((item) => String(item).toLowerCase());
  const secondary = (exercise.secondaryMuscles ?? []).map((item) => String(item).toLowerCase());
  const primaryText = primary.join(" ");
  const combinedText = [...primary, ...secondary].join(" ");

  if (/(chest|pectoral)/.test(primaryText)) return "chest";
  if (/(lat|middle back|lower back|traps|trapezius|rhomboids|erector spinae)/.test(primaryText)) return "back";
  if (/(deltoid|shoulder|rotator cuff|levator scapulae)/.test(primaryText)) return "shoulders";
  if (/(biceps|triceps|forearms|brachialis|brachioradialis|wrist flexors)/.test(primaryText)) return "arms";
  if (/(quadriceps|hamstrings|calves|adductors|abductors|tibialis|groin)/.test(primaryText)) return "legs";
  if (/(glutes|glute medius|glute)/.test(primaryText)) return "glutes";
  if (/(abdominals|obliques|abs|serratus)/.test(primaryText) && primary.length <= 2) return "abs";

  if (/(chest|pectoral)/.test(combinedText)) return "chest";
  if (/(lat|middle back|lower back|traps|trapezius|rhomboids|erector spinae)/.test(combinedText)) return "back";
  if (/(deltoid|shoulder|rotator cuff|levator scapulae)/.test(combinedText)) return "shoulders";
  if (/(biceps|triceps|forearms|brachialis|brachioradialis|wrist flexors)/.test(combinedText)) return "arms";
  if (/(quadriceps|hamstrings|calves|adductors|abductors|tibialis|groin)/.test(combinedText)) return "legs";
  if (/(glutes|glute medius|glute)/.test(combinedText)) return "glutes";
  if (/(abdominals|obliques|abs|serratus)/.test(combinedText)) return "abs";

  if ((exercise.primaryMuscles ?? []).length >= 3) return "full_body";
  return "full_body";
}

async function translateBatch(names) {
  const query = names.join("\n");
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Translate request failed: ${response.status}`);
  const payload = await response.json();
  const text = payload[0].map((item) => item[0]).join("");
  return text.split("\n");
}

function buildImageUrls(images = []) {
  const urls = images.map((image) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${encodeURIComponent(image)}`);
  return {
    gifUrl: urls[0] ?? null,
    secondaryImages: urls.slice(1),
  };
}

async function main() {
  const sourceExercises = await loadSourceExercises();
  const existingKeys = new Set();
  for (const exercise of existingExercises) {
    existingKeys.add(normalizeKey(exercise.name));
    existingKeys.add(normalizeKey(exercise.nameKo));
  }

  const candidates = sourceExercises
    .filter((exercise) => !existingKeys.has(normalizeKey(exercise.name)))
    .map((exercise) => ({
      name: exercise.name,
      translatedName: "",
      bodyPart: mapBodyPart(exercise),
      equipment: mapEquipment(exercise.equipment, exercise.name),
      category: mapCategory(exercise),
      difficulty: mapDifficulty(exercise.level),
      description: exercise.name,
      descriptionKo: null,
      primaryMuscles: exercise.primaryMuscles ?? [],
      secondaryMuscles: exercise.secondaryMuscles ?? [],
      instructions: exercise.instructions ?? [],
      instructionsKo: null,
      ...buildImageUrls(exercise.images),
    }));

  const batchSize = 40;
  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const names = batch.map((item) => item.name);
    let translated = [];
    try {
      translated = await translateBatch(names);
    } catch (error) {
      translated = names.map(() => "");
    }
    batch.forEach((item, offset) => {
      const sourceName = item.name;
      let nameKo = manualNameOverrides.get(sourceName) ?? translated[offset] ?? "";
      if (!nameKo || /[A-Za-z]{2,}/.test(nameKo)) {
        nameKo = manualNameOverrides.get(sourceName) ?? translateFallback(sourceName);
      }
      for (const [pattern, replacement] of cleanupReplacements) nameKo = nameKo.replace(pattern, replacement).trim();
      item.translatedName = nameKo;
    });
  }

  const output = candidates
    .filter((item) => item.translatedName)
    .map(({ translatedName, ...item }) => ({
      ...item,
      nameKo: translatedName,
    }));

  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Generated ${output.length} bulk exercises to ${path.relative(projectRoot, targetPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
