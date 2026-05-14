/**
 * free-exercise-db 공개 데이터를 우리 DB의 운동 데이터에 매핑하여
 * 상세 instructions, 이미지 URL을 업데이트하는 스크립트
 *
 * 이미지 base URL:
 * https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/{n}.jpg
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// 우리 DB 운동명 → free-exercise-db 운동 ID 매핑 테이블
// 키: 우리 DB의 nameKo (또는 name), 값: free-exercise-db의 id 필드
const EXERCISE_MAPPING = [
  // ── CHEST ──
  { nameKo: "바벨 벤치프레스",         freeId: "Barbell_Bench_Press_-_Medium_Grip" },
  { nameKo: "인클라인 바벨 벤치프레스", freeId: "Barbell_Incline_Bench_Press_-_Medium_Grip" },
  { nameKo: "덤벨 벤치프레스",         freeId: "Dumbbell_Bench_Press" },
  { nameKo: "덤벨 플라이",             freeId: "Dumbbell_Flyes" },
  { nameKo: "케이블 크로스오버",        freeId: "Cable_Crossover" },
  { nameKo: "푸시업",                  freeId: "Push-Up" },
  { nameKo: "디클라인 벤치프레스",      freeId: "Barbell_Decline_Bench_Press" },
  { nameKo: "체스트 딥스",             freeId: "Chest_Dip" },
  { nameKo: "펙 덱 머신",              freeId: "Pec_Deck_Fly" },
  { nameKo: "인클라인 덤벨 플라이",     freeId: "Dumbbell_Incline_Flyes" },

  // ── BACK ──
  { nameKo: "데드리프트",              freeId: "Barbell_Deadlift" },
  { nameKo: "풀업",                    freeId: "Pull-up" },
  { nameKo: "바벨 로우",               freeId: "Barbell_Bent_Over_Row" },
  { nameKo: "랫 풀다운",               freeId: "Lat_Pulldown" },
  { nameKo: "시티드 케이블 로우",       freeId: "Seated_Cable_Row" },
  { nameKo: "덤벨 로우",               freeId: "Dumbbell_One-Arm_Row" },
  { nameKo: "페이스 풀",               freeId: "Face_Pull" },
  { nameKo: "친업",                    freeId: "Chin-Up" },
  { nameKo: "굿모닝",                  freeId: "Good_Morning" },
  { nameKo: "T바 로우",                freeId: "T-Bar_Row_with_Handle" },

  // ── SHOULDERS ──
  { nameKo: "오버헤드 프레스",          freeId: "Barbell_Shoulder_Press" },
  { nameKo: "덤벨 숄더 프레스",         freeId: "Dumbbell_Shoulder_Press" },
  { nameKo: "레터럴 레이즈",            freeId: "Dumbbell_Lateral_Raise" },
  { nameKo: "프론트 레이즈",            freeId: "Dumbbell_Front_Raise" },
  { nameKo: "리어 델트 플라이",          freeId: "Dumbbell_Rear_Lateral_Raise" },
  { nameKo: "아놀드 프레스",            freeId: "Arnold_Dumbbell_Press" },
  { nameKo: "업라이트 로우",            freeId: "Barbell_Upright_Row" },
  { nameKo: "슈러그",                  freeId: "Barbell_Shrug" },

  // ── ARMS ──
  { nameKo: "바벨 컬",                 freeId: "Barbell_Curl" },
  { nameKo: "덤벨 컬",                 freeId: "Dumbbell_Alternate_Bicep_Curl" },
  { nameKo: "해머 컬",                 freeId: "Hammer_Curls" },
  { nameKo: "트라이셉 푸시다운",         freeId: "Triceps_Pushdown_-_Rope_Attachment" },
  { nameKo: "스컬 크러셔",              freeId: "EZ-Bar_Skullcrusher" },
  { nameKo: "트라이셉 딥스",            freeId: "Tricep_Dips" },
  { nameKo: "프리처 컬",               freeId: "EZ-Bar_Preacher_Curl" },
  { nameKo: "오버헤드 트라이셉 익스텐션", freeId: "Dumbbell_Seated_Triceps_Extension" },
  { nameKo: "케이블 컬",               freeId: "Cable_Curl" },
  { nameKo: "컨센트레이션 컬",          freeId: "Dumbbell_Concentration_Curls" },
  { nameKo: "클로즈 그립 벤치프레스",    freeId: "Barbell_Close-Grip_Bench_Press" },

  // ── LEGS ──
  { nameKo: "바벨 스쿼트",             freeId: "Barbell_Squat" },
  { nameKo: "루마니안 데드리프트",       freeId: "Romanian_Deadlift" },
  { nameKo: "레그 프레스",              freeId: "Leg_Press" },
  { nameKo: "런지",                    freeId: "Barbell_Lunge" },
  { nameKo: "레그 컬",                 freeId: "Lying_Leg_Curls" },
  { nameKo: "레그 익스텐션",            freeId: "Leg_Extensions" },
  { nameKo: "카프 레이즈",              freeId: "Standing_Calf_Raises" },
  { nameKo: "불가리안 스플릿 스쿼트",    freeId: "Dumbbell_Bulgarian_Split_Squat" },
  { nameKo: "힙 스러스트",              freeId: "Barbell_Hip_Thrust" },
  { nameKo: "스모 데드리프트",           freeId: "Sumo_Deadlift" },
  { nameKo: "박스 점프",               freeId: "Box_Jump_(Multiple_Response)" },
  { nameKo: "글루트 브릿지",            freeId: "Glute_Bridge" },

  // ── ABS ──
  { nameKo: "크런치",                  freeId: "Crunch" },
  { nameKo: "플랭크",                  freeId: "Plank" },
  { nameKo: "레그 레이즈",              freeId: "Flat_Bench_Leg_Pull-In" },
  { nameKo: "러시안 트위스트",           freeId: "Russian_Twist" },
  { nameKo: "케이블 크런치",            freeId: "Cable_Crunch" },
  { nameKo: "행잉 레그 레이즈",          freeId: "Hanging_Leg_Raise" },
  { nameKo: "바이시클 크런치",           freeId: "Bicycle_Crunch" },
  { nameKo: "V업",                     freeId: "V_Up" },
  { nameKo: "사이드 플랭크",            freeId: "Side_Plank" },

  // ── CARDIO ──
  { nameKo: "버피",                    freeId: "Burpee" },
  { nameKo: "마운틴 클라이머",           freeId: "Mountain_Climber" },

  // ── FULL BODY ──
  { nameKo: "케틀벨 스윙",              freeId: "Kettlebell_Swing" },
  { nameKo: "파머스 워크",              freeId: "Farmer_Walk" },

  // ── STRETCHING ──
  { nameKo: "캣-카우 스트레칭",          freeId: "Cat_Stretch" },
  { nameKo: "다운워드 독",              freeId: "Downward_Dog" },
  { nameKo: "아이 자세",               freeId: "Child_Pose" },
];

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // free-exercise-db JSON 로드
  const { readFileSync } = await import("fs");
  const rawData = JSON.parse(readFileSync("/home/ubuntu/exercises_raw.json", "utf-8"));

  // id → 운동 데이터 맵
  const freeDbMap = {};
  for (const ex of rawData) {
    freeDbMap[ex.id] = ex;
  }

  let updated = 0;
  let notFound = 0;

  for (const mapping of EXERCISE_MAPPING) {
    const freeEx = freeDbMap[mapping.freeId];
    if (!freeEx) {
      // 비슷한 이름으로 재시도
      const similar = rawData.find(e =>
        e.id.toLowerCase().includes(mapping.freeId.toLowerCase().split("_")[0]) ||
        e.name.toLowerCase().includes(mapping.nameKo.replace(/\s/g, "").toLowerCase())
      );
      if (!similar) {
        console.log(`⚠️  매핑 실패: ${mapping.nameKo} (${mapping.freeId})`);
        notFound++;
        continue;
      }
      console.log(`🔄 유사 매핑: ${mapping.nameKo} → ${similar.name}`);
      Object.assign(freeEx || {}, similar);
    }

    const ex = freeEx || {};
    const instructions = ex.instructions || [];
    const images = ex.images || [];

    // 이미지 URL 생성 (GitHub raw)
    const imageUrls = images.map(img =>
      `${IMAGE_BASE}/${encodeURIComponent(img)}`
    );

    // 첫 번째 이미지를 gifUrl로, 나머지를 additionalImages로
    const gifUrl = imageUrls[0] || null;
    const additionalImages = imageUrls.slice(1);

    // DB 업데이트
    const [rows] = await conn.execute(
      "SELECT id FROM exercises WHERE nameKo = ? LIMIT 1",
      [mapping.nameKo]
    );

    if (rows.length === 0) {
      console.log(`❌ DB에 없음: ${mapping.nameKo}`);
      notFound++;
      continue;
    }

    const dbId = rows[0].id;

    await conn.execute(
      `UPDATE exercises SET
        gifUrl = ?,
        instructions = ?,
        secondaryImages = ?
       WHERE id = ?`,
      [
        gifUrl,
        JSON.stringify(instructions),
        JSON.stringify(additionalImages),
        dbId,
      ]
    );

    console.log(`✅ 업데이트: ${mapping.nameKo} (${instructions.length}개 instruction, ${imageUrls.length}개 이미지)`);
    updated++;
  }

  console.log(`\n완료: ${updated}개 업데이트, ${notFound}개 실패`);
  await conn.end();
}

run().catch(console.error);
