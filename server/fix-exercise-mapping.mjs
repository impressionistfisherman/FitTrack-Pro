/**
 * 정밀 매핑 보완 - free-exercise-db에서 정확한 운동 찾아서 업데이트
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const rawData = JSON.parse(readFileSync("/home/ubuntu/exercises_raw.json", "utf-8"));

// 이름으로 검색하는 헬퍼
function findByName(searchName) {
  const lower = searchName.toLowerCase();
  return rawData.find(e => e.name.toLowerCase() === lower) ||
    rawData.find(e => e.name.toLowerCase().includes(lower)) ||
    rawData.find(e => lower.includes(e.name.toLowerCase().split(" ").slice(0,2).join(" ")));
}

// 정밀 매핑 테이블 (nameKo → free-exercise-db 검색어)
const PRECISE_MAPPINGS = [
  { nameKo: "푸시업",                   search: "Push-Up" },
  { nameKo: "디클라인 벤치프레스",        search: "Decline Barbell Bench Press" },
  { nameKo: "체스트 딥스",              search: "Dips - Chest Version" },
  { nameKo: "인클라인 덤벨 플라이",       search: "Incline Dumbbell Flyes" },
  { nameKo: "풀업",                     search: "Pullups" },
  { nameKo: "바벨 로우",                search: "Bent Over Barbell Row" },
  { nameKo: "랫 풀다운",                search: "Wide-Grip Lat Pulldown" },
  { nameKo: "시티드 케이블 로우",         search: "Seated Cable Rows" },
  { nameKo: "덤벨 로우",                search: "Bent Over Two-Dumbbell Row" },
  { nameKo: "레터럴 레이즈",             search: "Side Lateral Raise" },
  { nameKo: "프론트 레이즈",             search: "Front Dumbbell Raise" },
  { nameKo: "리어 델트 플라이",           search: "Seated Bent-Over Rear Delt Raise" },
  { nameKo: "업라이트 로우",             search: "Barbell Upright Row" },
  { nameKo: "트라이셉 딥스",             search: "Tricep Dips" },
  { nameKo: "프리처 컬",                search: "Preacher Curl" },
  { nameKo: "오버헤드 트라이셉 익스텐션",  search: "Overhead Triceps Extension" },
  { nameKo: "케이블 컬",                search: "Cable Hammer Curls - Rope Attachment" },
  { nameKo: "컨센트레이션 컬",           search: "Concentration Curls" },
  { nameKo: "클로즈 그립 벤치프레스",     search: "Close-Grip Barbell Bench Press" },
  { nameKo: "불가리안 스플릿 스쿼트",     search: "Barbell Bulgarian Split Squat" },
  { nameKo: "박스 점프",                search: "Box Jump" },
  { nameKo: "글루트 브릿지",             search: "Glute Bridge" },
  { nameKo: "크런치",                   search: "Crunch" },
  { nameKo: "바이시클 크런치",            search: "Bicycle Crunch" },
  { nameKo: "V업",                      search: "V-Up" },
  { nameKo: "사이드 플랭크",             search: "Side Plank" },
  { nameKo: "버피",                     search: "Burpees" },
  { nameKo: "마운틴 클라이머",            search: "Mountain Climbers" },
  { nameKo: "케틀벨 스윙",              search: "Kettlebell Swing" },
  { nameKo: "파머스 워크",              search: "Farmer's Walk" },
  { nameKo: "다운워드 독",              search: "Downward Dog" },
  { nameKo: "아이 자세",               search: "Child's Pose" },
  { nameKo: "펙 덱 머신",              search: "Pec Deck Fly" },
];

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  let updated = 0;

  for (const mapping of PRECISE_MAPPINGS) {
    const freeEx = findByName(mapping.search);
    if (!freeEx) {
      console.log(`❌ 찾기 실패: ${mapping.nameKo} (검색어: ${mapping.search})`);
      continue;
    }

    const instructions = freeEx.instructions || [];
    const images = freeEx.images || [];
    const imageUrls = images.map(img => `${IMAGE_BASE}/${encodeURIComponent(img)}`);
    const gifUrl = imageUrls[0] || null;
    const additionalImages = imageUrls.slice(1);

    const [rows] = await conn.execute(
      "SELECT id FROM exercises WHERE nameKo = ? LIMIT 1",
      [mapping.nameKo]
    );
    if (rows.length === 0) continue;

    await conn.execute(
      `UPDATE exercises SET gifUrl = ?, instructions = ?, secondaryImages = ? WHERE id = ?`,
      [gifUrl, JSON.stringify(instructions), JSON.stringify(additionalImages), rows[0].id]
    );

    console.log(`✅ ${mapping.nameKo} → "${freeEx.name}" (${instructions.length}개 단계, ${imageUrls.length}개 이미지)`);
    updated++;
  }

  console.log(`\n완료: ${updated}개 정밀 업데이트`);
  await conn.end();
}

run().catch(console.error);
