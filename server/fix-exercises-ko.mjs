/**
 * 운동 이미지 복구 + 한국어 수행 방법(instructionsKo) 업데이트 스크립트
 * - exercises_raw.json에서 실제 이미지 URL 복구
 * - 영어 instructions를 한국어로 변환하여 instructionsKo 컬럼에 저장
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// 우리 DB 운동명(nameKo) → free-exercise-db ID + 한국어 수행 방법
const EXERCISE_DATA = [
  // ── CHEST (가슴) ──
  {
    nameKo: "바벨 벤치프레스",
    freeId: "Barbell_Bench_Press_-_Medium_Grip",
    instructionsKo: [
      "플랫 벤치에 등을 대고 눕습니다.",
      "바를 어깨너비보다 약간 넓게 잡습니다.",
      "바를 가슴 중앙까지 천천히 내립니다.",
      "가슴 근육을 수축하며 바를 힘차게 밀어 올립니다.",
      "팔꿈치를 완전히 펴지 않도록 주의하며 반복합니다."
    ]
  },
  {
    nameKo: "인클라인 바벨 벤치프레스",
    freeId: "Barbell_Incline_Bench_Press_-_Medium_Grip",
    instructionsKo: [
      "벤치를 30~45도로 기울여 설정합니다.",
      "어깨너비보다 넓게 바를 잡습니다.",
      "바를 상부 가슴까지 천천히 내립니다.",
      "상부 가슴을 수축하며 위로 밀어 올립니다.",
      "동작 내내 허리가 과도하게 아치되지 않도록 합니다."
    ]
  },
  {
    nameKo: "덤벨 벤치프레스",
    freeId: "Dumbbell_Bench_Press",
    instructionsKo: [
      "양손에 덤벨을 들고 플랫 벤치에 눕습니다.",
      "덤벨을 가슴 옆으로 천천히 내립니다.",
      "가슴 근육을 수축하며 덤벨을 위로 밀어 올립니다.",
      "정점에서 덤벨을 살짝 모아 가슴을 더 수축합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "덤벨 플라이",
    freeId: "Dumbbell_Flyes",
    instructionsKo: [
      "양손에 덤벨을 들고 플랫 벤치에 눕습니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 옆으로 넓게 벌립니다.",
      "가슴 근육이 충분히 늘어나는 것을 느낍니다.",
      "가슴 근육을 수축하며 팔을 다시 모읍니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "케이블 크로스오버",
    freeId: "Cable_Crossover",
    instructionsKo: [
      "케이블 머신 중앙에 서서 양손으로 케이블을 잡습니다.",
      "상체를 약간 앞으로 기울입니다.",
      "케이블을 아래로 당기며 양손을 모읍니다.",
      "가슴 근육이 완전히 수축되는 것을 느낍니다.",
      "천천히 원래 위치로 돌아가며 반복합니다."
    ]
  },
  {
    nameKo: "푸시업",
    freeId: "Push-Up",
    instructionsKo: [
      "손을 어깨너비로 벌리고 플랭크 자세를 취합니다.",
      "몸을 일직선으로 유지하며 가슴이 바닥에 닿을 때까지 내립니다.",
      "가슴 근육을 수축하며 몸을 밀어 올립니다.",
      "동작 내내 코어를 단단히 유지합니다.",
      "목표 횟수만큼 반복합니다."
    ]
  },
  {
    nameKo: "디클라인 벤치프레스",
    freeId: "Barbell_Decline_Bench_Press",
    instructionsKo: [
      "벤치를 -15~-30도로 기울이고 발을 고정합니다.",
      "어깨너비보다 넓게 바를 잡습니다.",
      "바를 하부 가슴까지 천천히 내립니다.",
      "하부 가슴을 수축하며 바를 힘차게 밀어 올립니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "체스트 딥스",
    freeId: "Chest_Dip",
    instructionsKo: [
      "평행봉을 양손으로 잡고 몸을 들어 올립니다.",
      "상체를 약간 앞으로 기울입니다.",
      "가슴이 충분히 늘어날 때까지 천천히 내려갑니다.",
      "가슴 근육을 수축하며 다시 밀어 올립니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "펙 덱 머신",
    freeId: "Pec_Deck_Fly",
    instructionsKo: [
      "펙 덱 머신에 앉아 등을 패드에 밀착합니다.",
      "양팔을 패드에 올리고 팔꿈치를 90도로 구부립니다.",
      "가슴 근육을 수축하며 팔을 앞으로 모읍니다.",
      "정점에서 1초간 유지합니다.",
      "천천히 원래 위치로 돌아가며 반복합니다."
    ]
  },
  {
    nameKo: "인클라인 덤벨 플라이",
    freeId: "Dumbbell_Incline_Flyes",
    instructionsKo: [
      "벤치를 30~45도로 기울이고 덤벨을 들고 눕습니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 옆으로 넓게 벌립니다.",
      "상부 가슴이 충분히 늘어나는 것을 느낍니다.",
      "상부 가슴을 수축하며 팔을 다시 모읍니다.",
      "천천히 내리며 반복합니다."
    ]
  },

  // ── BACK (등) ──
  {
    nameKo: "데드리프트",
    freeId: "Barbell_Deadlift",
    instructionsKo: [
      "발을 어깨너비로 벌리고 바벨 앞에 섭니다.",
      "엉덩이를 뒤로 빼며 상체를 숙여 바를 잡습니다.",
      "코어와 등을 단단히 유지하며 바를 들어 올립니다.",
      "엉덩이를 앞으로 밀며 완전히 서서 동작을 마무리합니다.",
      "천천히 바를 내리며 반복합니다."
    ]
  },
  {
    nameKo: "풀업",
    freeId: "Pull-up",
    instructionsKo: [
      "오버핸드 그립으로 철봉을 어깨너비보다 넓게 잡습니다.",
      "팔을 완전히 펴고 매달립니다.",
      "가슴을 철봉 쪽으로 당기며 몸을 올립니다.",
      "턱이 철봉 위로 올라오면 잠시 유지합니다.",
      "천천히 내려가며 반복합니다."
    ]
  },
  {
    nameKo: "바벨 로우",
    freeId: "Barbell_Bent_Over_Row",
    instructionsKo: [
      "발을 어깨너비로 벌리고 바벨을 잡습니다.",
      "엉덩이를 뒤로 빼며 상체를 약 45도로 숙입니다.",
      "바를 복부 쪽으로 당깁니다.",
      "날개뼈를 모으며 등 근육을 수축합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "랫 풀다운",
    freeId: "Lat_Pulldown",
    instructionsKo: [
      "랫 풀다운 머신에 앉아 허벅지를 패드에 고정합니다.",
      "어깨너비보다 넓게 바를 잡습니다.",
      "바를 상부 가슴까지 당깁니다.",
      "광배근이 수축되는 것을 느낍니다.",
      "천천히 팔을 펴며 반복합니다."
    ]
  },
  {
    nameKo: "시티드 케이블 로우",
    freeId: "Seated_Cable_Row",
    instructionsKo: [
      "케이블 로우 머신에 앉아 발을 패드에 고정합니다.",
      "핸들을 잡고 상체를 약간 앞으로 기울입니다.",
      "핸들을 복부 쪽으로 당깁니다.",
      "날개뼈를 모으며 등 근육을 수축합니다.",
      "천천히 팔을 펴며 반복합니다."
    ]
  },
  {
    nameKo: "덤벨 로우",
    freeId: "Dumbbell_One-Arm_Row",
    instructionsKo: [
      "한쪽 무릎과 손을 벤치에 올려 지지합니다.",
      "반대 손으로 덤벨을 잡습니다.",
      "덤벨을 엉덩이 쪽으로 당깁니다.",
      "광배근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "T바 로우",
    freeId: "T-Bar_Row_with_Handle",
    instructionsKo: [
      "T바를 V자 핸들로 잡고 발을 어깨너비로 벌립니다.",
      "엉덩이를 뒤로 빼며 상체를 숙입니다.",
      "바를 가슴 쪽으로 당깁니다.",
      "날개뼈를 모으며 등 근육을 수축합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "페이스 풀",
    freeId: "Face_Pull",
    instructionsKo: [
      "케이블을 얼굴 높이로 설정하고 로프를 잡습니다.",
      "로프를 얼굴 쪽으로 당깁니다.",
      "동작 끝에서 팔꿈치를 뒤로 당기며 외회전합니다.",
      "후면 삼각근과 회전근개가 수축되는 것을 느낍니다.",
      "천천히 원래 위치로 돌아가며 반복합니다."
    ]
  },
  {
    nameKo: "친업",
    freeId: "Chin-Up",
    instructionsKo: [
      "언더핸드 그립으로 철봉을 어깨너비로 잡습니다.",
      "팔을 완전히 펴고 매달립니다.",
      "가슴을 철봉 쪽으로 당기며 몸을 올립니다.",
      "턱이 철봉 위로 올라오면 잠시 유지합니다.",
      "천천히 내려가며 반복합니다."
    ]
  },
  {
    nameKo: "굿모닝",
    freeId: "Good_Morning",
    instructionsKo: [
      "바벨을 상부 등에 올리고 발을 어깨너비로 벌립니다.",
      "무릎을 약간 구부린 상태로 엉덩이를 뒤로 빼며 상체를 숙입니다.",
      "등을 일직선으로 유지합니다.",
      "햄스트링이 충분히 늘어나면 멈춥니다.",
      "엉덩이를 앞으로 밀며 다시 서서 반복합니다."
    ]
  },
  {
    nameKo: "랙 풀",
    freeId: "Barbell_Deadlift",
    instructionsKo: [
      "랙에서 바를 무릎 높이로 설정합니다.",
      "데드리프트 자세로 바를 잡습니다.",
      "코어와 상부 등을 단단히 유지하며 바를 들어 올립니다.",
      "엉덩이를 완전히 펴며 동작을 마무리합니다.",
      "천천히 바를 내리며 반복합니다."
    ]
  },

  // ── SHOULDERS (어깨) ──
  {
    nameKo: "오버헤드 프레스",
    freeId: "Barbell_Shoulder_Press",
    instructionsKo: [
      "바벨을 어깨 앞에 위치시키고 어깨너비로 잡습니다.",
      "코어를 단단히 유지하며 바를 머리 위로 밀어 올립니다.",
      "팔꿈치를 완전히 펴며 정점에서 잠시 유지합니다.",
      "천천히 바를 어깨 위치로 내립니다.",
      "반복합니다."
    ]
  },
  {
    nameKo: "덤벨 숄더 프레스",
    freeId: "Dumbbell_Shoulder_Press",
    instructionsKo: [
      "양손에 덤벨을 들고 어깨 높이로 올립니다.",
      "덤벨을 머리 위로 밀어 올립니다.",
      "정점에서 어깨 근육을 수축합니다.",
      "천천히 어깨 높이로 내립니다.",
      "반복합니다."
    ]
  },
  {
    nameKo: "레터럴 레이즈",
    freeId: "Dumbbell_Lateral_Raise",
    instructionsKo: [
      "양손에 덤벨을 들고 바르게 섭니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 옆으로 올립니다.",
      "어깨 높이까지 올려 측면 삼각근을 수축합니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "프론트 레이즈",
    freeId: "Dumbbell_Front_Raise",
    instructionsKo: [
      "양손에 덤벨을 들고 바르게 섭니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 앞으로 올립니다.",
      "어깨 높이까지 올려 전면 삼각근을 수축합니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "리어 델트 플라이",
    freeId: "Dumbbell_Rear_Lateral_Raise",
    instructionsKo: [
      "양손에 덤벨을 들고 상체를 앞으로 숙입니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 옆으로 올립니다.",
      "후면 삼각근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "등이 둥글어지지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "아놀드 프레스",
    freeId: "Arnold_Dumbbell_Press",
    instructionsKo: [
      "양손에 덤벨을 들고 손바닥이 몸 쪽을 향하도록 합니다.",
      "덤벨을 올리면서 손목을 회전시켜 손바닥이 앞을 향하게 합니다.",
      "머리 위로 완전히 밀어 올립니다.",
      "내리면서 반대로 손목을 회전시킵니다.",
      "반복합니다."
    ]
  },
  {
    nameKo: "업라이트 로우",
    freeId: "Barbell_Upright_Row",
    instructionsKo: [
      "바벨을 어깨너비보다 좁게 잡고 허벅지 앞에 위치시킵니다.",
      "팔꿈치를 높이 들며 바를 턱 아래까지 당깁니다.",
      "어깨와 승모근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "손목이 꺾이지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "슈러그",
    freeId: "Barbell_Shrug",
    instructionsKo: [
      "바벨을 어깨너비로 잡고 허벅지 앞에 위치시킵니다.",
      "어깨를 귀 쪽으로 최대한 올립니다.",
      "정점에서 1~2초 유지합니다.",
      "천천히 어깨를 내립니다.",
      "반복합니다."
    ]
  },
  {
    nameKo: "케이블 레터럴 레이즈",
    freeId: "Dumbbell_Lateral_Raise",
    instructionsKo: [
      "케이블 머신 옆에 서서 케이블을 잡습니다.",
      "팔꿈치를 약간 구부린 상태로 팔을 옆으로 올립니다.",
      "어깨 높이까지 올려 측면 삼각근을 수축합니다.",
      "천천히 내리며 반복합니다.",
      "케이블이 지속적인 장력을 제공합니다."
    ]
  },

  // ── ARMS (팔) ──
  {
    nameKo: "바벨 컬",
    freeId: "Barbell_Curl",
    instructionsKo: [
      "바벨을 어깨너비로 잡고 바르게 섭니다.",
      "팔꿈치를 몸에 붙인 채 바를 어깨 쪽으로 올립니다.",
      "이두근이 완전히 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "덤벨 컬",
    freeId: "Dumbbell_Alternate_Bicep_Curl",
    instructionsKo: [
      "양손에 덤벨을 들고 바르게 섭니다.",
      "한 팔씩 번갈아가며 덤벨을 어깨 쪽으로 올립니다.",
      "이두근이 완전히 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "해머 컬",
    freeId: "Hammer_Curls",
    instructionsKo: [
      "양손에 덤벨을 들고 손바닥이 서로 마주보게 합니다.",
      "팔꿈치를 몸에 붙인 채 덤벨을 올립니다.",
      "상완근과 이두근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "트라이셉 푸시다운",
    freeId: "Triceps_Pushdown_-_Rope_Attachment",
    instructionsKo: [
      "케이블 머신에 로프를 연결하고 잡습니다.",
      "팔꿈치를 몸에 붙인 채 로프를 아래로 밀어 내립니다.",
      "삼두근이 완전히 수축되는 것을 느낍니다.",
      "천천히 올리며 반복합니다.",
      "팔꿈치가 움직이지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "스컬 크러셔",
    freeId: "EZ-Bar_Skullcrusher",
    instructionsKo: [
      "EZ바를 잡고 플랫 벤치에 눕습니다.",
      "팔꿈치를 고정한 채 바를 이마 쪽으로 내립니다.",
      "삼두근이 늘어나는 것을 느낍니다.",
      "삼두근을 수축하며 바를 올립니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "트라이셉 딥스",
    freeId: "Tricep_Dips",
    instructionsKo: [
      "평행봉을 양손으로 잡고 몸을 들어 올립니다.",
      "상체를 수직으로 유지합니다.",
      "팔꿈치가 90도가 될 때까지 내려갑니다.",
      "삼두근을 수축하며 다시 밀어 올립니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "프리처 컬",
    freeId: "EZ-Bar_Preacher_Curl",
    instructionsKo: [
      "프리처 컬 벤치에 앉아 팔을 패드에 올립니다.",
      "EZ바를 잡고 팔을 완전히 펍니다.",
      "이두근을 수축하며 바를 올립니다.",
      "정점에서 잠시 유지합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "오버헤드 트라이셉 익스텐션",
    freeId: "Dumbbell_Seated_Triceps_Extension",
    instructionsKo: [
      "덤벨을 양손으로 잡고 머리 위로 올립니다.",
      "팔꿈치를 고정한 채 덤벨을 머리 뒤로 내립니다.",
      "삼두근이 늘어나는 것을 느낍니다.",
      "삼두근을 수축하며 덤벨을 올립니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "케이블 컬",
    freeId: "Cable_Curl",
    instructionsKo: [
      "케이블 머신 앞에 서서 바를 잡습니다.",
      "팔꿈치를 몸에 붙인 채 바를 어깨 쪽으로 올립니다.",
      "이두근이 완전히 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "케이블이 지속적인 장력을 제공합니다."
    ]
  },
  {
    nameKo: "컨센트레이션 컬",
    freeId: "Dumbbell_Concentration_Curls",
    instructionsKo: [
      "벤치에 앉아 팔꿈치를 허벅지 안쪽에 고정합니다.",
      "덤벨을 잡고 팔을 완전히 펍니다.",
      "이두근을 수축하며 덤벨을 올립니다.",
      "정점에서 잠시 유지합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "클로즈 그립 벤치프레스",
    freeId: "Barbell_Close-Grip_Bench_Press",
    instructionsKo: [
      "플랫 벤치에 눕고 바를 어깨너비로 좁게 잡습니다.",
      "팔꿈치를 몸에 붙인 채 바를 하부 가슴까지 내립니다.",
      "삼두근을 수축하며 바를 밀어 올립니다.",
      "천천히 내리며 반복합니다.",
      "손목이 꺾이지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "손목 컬",
    freeId: "Barbell_Curl",
    instructionsKo: [
      "벤치에 앉아 전완을 벤치 위에 올립니다.",
      "바벨을 언더핸드 그립으로 잡습니다.",
      "손목을 위로 올립니다.",
      "전완 굴곡근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다."
    ]
  },

  // ── LEGS (하체) ──
  {
    nameKo: "바벨 스쿼트",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "바벨을 상부 등에 올리고 발을 어깨너비로 벌립니다.",
      "가슴을 펴고 코어를 단단히 유지합니다.",
      "엉덩이를 뒤로 빼며 무릎이 발끝 방향으로 향하게 내려갑니다.",
      "허벅지가 바닥과 평행이 될 때까지 내려갑니다.",
      "발뒤꿈치로 바닥을 밀며 일어서서 반복합니다."
    ]
  },
  {
    nameKo: "루마니안 데드리프트",
    freeId: "Romanian_Deadlift",
    instructionsKo: [
      "바벨을 어깨너비로 잡고 바르게 섭니다.",
      "무릎을 약간 구부린 채 엉덩이를 뒤로 빼며 상체를 숙입니다.",
      "등을 일직선으로 유지합니다.",
      "햄스트링이 충분히 늘어나면 멈춥니다.",
      "엉덩이를 앞으로 밀며 다시 서서 반복합니다."
    ]
  },
  {
    nameKo: "레그 프레스",
    freeId: "Leg_Press",
    instructionsKo: [
      "레그 프레스 머신에 앉아 발을 플랫폼에 어깨너비로 놓습니다.",
      "안전 장치를 해제하고 무릎이 90도가 될 때까지 내립니다.",
      "발뒤꿈치로 플랫폼을 밀며 다리를 펍니다.",
      "무릎을 완전히 펴지 않도록 주의합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "런지",
    freeId: "Barbell_Lunge",
    instructionsKo: [
      "바르게 서서 한 발을 앞으로 내딛습니다.",
      "뒷 무릎이 바닥에 닿을 때까지 내려갑니다.",
      "앞 무릎이 발끝을 넘지 않도록 합니다.",
      "앞발로 바닥을 밀며 원래 자세로 돌아옵니다.",
      "반대 발로 반복합니다."
    ]
  },
  {
    nameKo: "레그 컬",
    freeId: "Lying_Leg_Curls",
    instructionsKo: [
      "레그 컬 머신에 엎드려 발목을 패드에 고정합니다.",
      "햄스트링을 수축하며 발목을 엉덩이 쪽으로 올립니다.",
      "정점에서 잠시 유지합니다.",
      "천천히 내리며 반복합니다.",
      "허리가 들리지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "레그 익스텐션",
    freeId: "Leg_Extensions",
    instructionsKo: [
      "레그 익스텐션 머신에 앉아 발목을 패드에 고정합니다.",
      "대퇴사두근을 수축하며 다리를 완전히 펍니다.",
      "정점에서 잠시 유지합니다.",
      "천천히 내리며 반복합니다.",
      "무릎 관절에 무리가 가지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "카프 레이즈",
    freeId: "Standing_Calf_Raises",
    instructionsKo: [
      "카프 레이즈 머신에 서서 어깨에 패드를 올립니다.",
      "발뒤꿈치를 최대한 올립니다.",
      "종아리 근육이 완전히 수축되는 것을 느낍니다.",
      "발뒤꿈치를 플랫폼 아래로 내립니다.",
      "충분히 늘어나면 반복합니다."
    ]
  },
  {
    nameKo: "불가리안 스플릿 스쿼트",
    freeId: "Dumbbell_Bulgarian_Split_Squat",
    instructionsKo: [
      "뒷발을 벤치에 올리고 앞발을 앞으로 내딛습니다.",
      "상체를 수직으로 유지하며 내려갑니다.",
      "앞 무릎이 90도가 될 때까지 내려갑니다.",
      "앞발로 바닥을 밀며 올라옵니다.",
      "목표 횟수만큼 반복 후 다리를 바꿉니다."
    ]
  },
  {
    nameKo: "핵 스쿼트",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "핵 스쿼트 머신에 등을 대고 어깨에 패드를 올립니다.",
      "발을 플랫폼에 어깨너비로 놓습니다.",
      "무릎이 90도가 될 때까지 내려갑니다.",
      "대퇴사두근을 수축하며 올라옵니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "힙 스러스트",
    freeId: "Barbell_Hip_Thrust",
    instructionsKo: [
      "벤치에 등 상부를 기대고 바벨을 골반에 올립니다.",
      "발을 바닥에 어깨너비로 놓습니다.",
      "엉덩이를 위로 밀어 올립니다.",
      "정점에서 둔근을 최대한 수축합니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "스모 데드리프트",
    freeId: "Sumo_Deadlift",
    instructionsKo: [
      "발을 어깨너비보다 넓게 벌리고 발끝을 바깥으로 향합니다.",
      "바를 다리 안쪽으로 잡습니다.",
      "코어를 단단히 유지하며 바를 들어 올립니다.",
      "엉덩이를 앞으로 밀며 완전히 서서 동작을 마무리합니다.",
      "천천히 바를 내리며 반복합니다."
    ]
  },
  {
    nameKo: "스텝업",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "박스나 벤치 앞에 서서 덤벨을 양손에 듭니다.",
      "한 발을 박스 위에 올립니다.",
      "앞발로 바닥을 밀며 올라옵니다.",
      "다른 발을 박스 위로 올립니다.",
      "천천히 내려와 반복합니다."
    ]
  },
  {
    nameKo: "월 싯",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "벽에 등을 대고 섭니다.",
      "무릎이 90도가 될 때까지 미끄러져 내려갑니다.",
      "허벅지가 바닥과 평행이 되도록 합니다.",
      "이 자세를 목표 시간만큼 유지합니다.",
      "무릎이 발끝 위에 오도록 합니다."
    ]
  },
  {
    nameKo: "박스 점프",
    freeId: "Box_Jump_(Multiple_Response)",
    instructionsKo: [
      "박스 앞에 어깨너비로 서서 무릎을 약간 구부립니다.",
      "팔을 뒤로 당겼다가 앞으로 흔들며 박스 위로 점프합니다.",
      "부드럽게 착지하며 무릎을 구부려 충격을 흡수합니다.",
      "박스에서 조심스럽게 내려옵니다.",
      "반복합니다."
    ]
  },

  // ── GLUTES (둔근) ──
  {
    nameKo: "글루트 브릿지",
    freeId: "Glute_Bridge",
    instructionsKo: [
      "등을 대고 누워 무릎을 구부리고 발을 바닥에 놓습니다.",
      "엉덩이를 위로 밀어 올립니다.",
      "정점에서 둔근을 최대한 수축합니다.",
      "천천히 내리며 반복합니다.",
      "허리가 과도하게 아치되지 않도록 합니다."
    ]
  },
  {
    nameKo: "케이블 킥백",
    freeId: "Glute_Bridge",
    instructionsKo: [
      "발목에 케이블 스트랩을 연결합니다.",
      "케이블 머신을 마주 보고 섭니다.",
      "다리를 뒤로 들어 올립니다.",
      "둔근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "당나귀 킥",
    freeId: "Glute_Bridge",
    instructionsKo: [
      "네발 기기 자세를 취합니다.",
      "한 다리를 뒤로 들어 올립니다.",
      "둔근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "반대 다리로 반복합니다."
    ]
  },
  {
    nameKo: "어브덕터 머신",
    freeId: "Glute_Bridge",
    instructionsKo: [
      "어브덕터 머신에 앉아 패드를 허벅지 바깥쪽에 위치시킵니다.",
      "다리를 바깥쪽으로 밀어 냅니다.",
      "고관절 외전근이 수축되는 것을 느낍니다.",
      "천천히 원래 위치로 돌아옵니다.",
      "반복합니다."
    ]
  },

  // ── ABS (복근) ──
  {
    nameKo: "크런치",
    freeId: "Crunch",
    instructionsKo: [
      "등을 대고 누워 무릎을 구부립니다.",
      "손을 머리 뒤에 가볍게 올립니다.",
      "복근을 수축하며 어깨를 바닥에서 들어 올립니다.",
      "복근이 완전히 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "플랭크",
    freeId: "Plank",
    instructionsKo: [
      "전완을 바닥에 놓고 플랭크 자세를 취합니다.",
      "몸을 일직선으로 유지합니다.",
      "코어를 단단히 수축합니다.",
      "목표 시간만큼 자세를 유지합니다.",
      "엉덩이가 처지거나 올라가지 않도록 합니다."
    ]
  },
  {
    nameKo: "레그 레이즈",
    freeId: "Flat_Bench_Leg_Pull-In",
    instructionsKo: [
      "등을 대고 누워 다리를 펍니다.",
      "다리를 곧게 유지하며 90도까지 올립니다.",
      "하복근이 수축되는 것을 느낍니다.",
      "바닥에 닿지 않도록 천천히 내립니다.",
      "반복합니다."
    ]
  },
  {
    nameKo: "러시안 트위스트",
    freeId: "Russian_Twist",
    instructionsKo: [
      "무릎을 구부리고 앉아 상체를 약간 뒤로 기울입니다.",
      "양손을 모아 몸통을 좌우로 회전합니다.",
      "복사근이 수축되는 것을 느낍니다.",
      "코어를 단단히 유지합니다.",
      "목표 횟수만큼 반복합니다."
    ]
  },
  {
    nameKo: "케이블 크런치",
    freeId: "Cable_Crunch",
    instructionsKo: [
      "케이블 머신 앞에 무릎을 꿇습니다.",
      "로프를 머리 옆에 잡습니다.",
      "복근을 수축하며 아래로 구부립니다.",
      "복근이 완전히 수축되는 것을 느낍니다.",
      "천천히 원래 위치로 돌아가며 반복합니다."
    ]
  },
  {
    nameKo: "행잉 레그 레이즈",
    freeId: "Hanging_Leg_Raise",
    instructionsKo: [
      "철봉에 매달립니다.",
      "다리를 곧게 유지하며 90도까지 올립니다.",
      "하복근이 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다.",
      "반동을 사용하지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "AB 휠 롤아웃",
    freeId: "Crunch",
    instructionsKo: [
      "무릎을 꿇고 AB 휠을 잡습니다.",
      "코어를 단단히 유지하며 앞으로 굴립니다.",
      "몸이 완전히 펴질 때까지 굴립니다.",
      "코어를 수축하며 다시 당겨옵니다.",
      "허리가 처지지 않도록 주의합니다."
    ]
  },
  {
    nameKo: "사이드 플랭크",
    freeId: "Side_Plank",
    instructionsKo: [
      "옆으로 누워 전완을 바닥에 놓습니다.",
      "엉덩이를 들어 올려 몸을 일직선으로 만듭니다.",
      "복사근을 수축합니다.",
      "목표 시간만큼 자세를 유지합니다.",
      "반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "바이시클 크런치",
    freeId: "Bicycle_Crunch",
    instructionsKo: [
      "등을 대고 누워 손을 머리 뒤에 놓습니다.",
      "한쪽 무릎을 당기며 반대쪽 팔꿈치를 무릎 쪽으로 가져갑니다.",
      "좌우를 번갈아가며 반복합니다.",
      "복사근이 수축되는 것을 느낍니다.",
      "허리가 바닥에서 들리지 않도록 합니다."
    ]
  },
  {
    nameKo: "V업",
    freeId: "V_Up",
    instructionsKo: [
      "등을 대고 팔과 다리를 펴고 눕습니다.",
      "동시에 상체와 다리를 올립니다.",
      "손이 발에 닿도록 합니다.",
      "복근이 완전히 수축되는 것을 느낍니다.",
      "천천히 내리며 반복합니다."
    ]
  },
  {
    nameKo: "드래곤 플래그",
    freeId: "Crunch",
    instructionsKo: [
      "벤치에 누워 머리 위 벤치를 잡습니다.",
      "몸을 수직으로 들어 올립니다.",
      "몸을 일직선으로 유지하며 천천히 내립니다.",
      "벤치에 닿기 직전에 멈춥니다.",
      "다시 올리며 반복합니다."
    ]
  },

  // ── CARDIO (유산소) ──
  {
    nameKo: "트레드밀 달리기",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "원하는 속도를 설정합니다.",
      "워밍업 걷기로 시작합니다.",
      "달리기 속도로 증가합니다.",
      "목표 시간 또는 거리를 달립니다.",
      "쿨다운 걷기로 마무리합니다."
    ]
  },
  {
    nameKo: "줄넘기",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "줄넘기 손잡이를 양손에 잡습니다.",
      "양발로 함께 점프합니다.",
      "일정한 리듬을 유지합니다.",
      "발볼로 부드럽게 착지합니다.",
      "목표 횟수 또는 시간만큼 반복합니다."
    ]
  },
  {
    nameKo: "버피",
    freeId: "Burpee",
    instructionsKo: [
      "바르게 서서 시작합니다.",
      "손을 바닥에 짚으며 발을 뒤로 뻗어 푸시업 자세를 만듭니다.",
      "푸시업을 한 번 합니다.",
      "발을 손 쪽으로 당기며 점프합니다.",
      "손을 위로 올리며 점프하고 반복합니다."
    ]
  },
  {
    nameKo: "로잉 머신",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "로잉 머신에 앉아 발을 고정합니다.",
      "핸들을 잡고 다리를 먼저 밀어냅니다.",
      "다리가 펴지면 핸들을 가슴 쪽으로 당깁니다.",
      "팔을 펴며 상체를 앞으로 기울입니다.",
      "다리를 구부리며 원래 자세로 돌아가 반복합니다."
    ]
  },
  {
    nameKo: "고정식 자전거",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "안장 높이를 조절합니다.",
      "편안한 속도로 페달링을 시작합니다.",
      "일정한 케이던스를 유지합니다.",
      "필요에 따라 저항을 높입니다.",
      "목표 시간만큼 유지합니다."
    ]
  },
  {
    nameKo: "마운틴 클라이머",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "플랭크 자세를 취합니다.",
      "한쪽 무릎을 가슴 쪽으로 당깁니다.",
      "빠르게 다리를 교체합니다.",
      "코어를 단단히 유지합니다.",
      "목표 횟수 또는 시간만큼 반복합니다."
    ]
  },

  // ── STRETCHING (스트레칭) ──
  {
    nameKo: "가슴 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "바르게 서거나 앉습니다.",
      "양팔을 뒤로 모아 손을 깍지 낍니다.",
      "가슴을 앞으로 내밀며 어깨를 뒤로 당깁니다.",
      "가슴 근육이 늘어나는 것을 느낍니다.",
      "30초간 유지합니다."
    ]
  },
  {
    nameKo: "고관절 굴곡근 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "한쪽 무릎을 바닥에 꿇습니다.",
      "앞발을 앞으로 내딛어 런지 자세를 만듭니다.",
      "엉덩이를 앞으로 밀며 고관절 굴곡근을 늘입니다.",
      "상체를 수직으로 유지합니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "햄스트링 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "바닥에 앉아 다리를 앞으로 펍니다.",
      "엉덩이를 뒤로 빼며 상체를 앞으로 숙입니다.",
      "손이 발 쪽으로 향하도록 합니다.",
      "햄스트링이 늘어나는 것을 느낍니다.",
      "30~60초간 유지합니다."
    ]
  },
  {
    nameKo: "어깨 크로스 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "한쪽 팔을 가슴 앞으로 뻗습니다.",
      "반대 팔로 뻗은 팔의 팔꿈치를 잡아당깁니다.",
      "후면 삼각근이 늘어나는 것을 느낍니다.",
      "30초간 유지합니다.",
      "반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "캣-카우 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "네발 기기 자세를 취합니다.",
      "숨을 내쉬며 등을 위로 둥글게 만듭니다 (캣 자세).",
      "숨을 들이쉬며 등을 아래로 내립니다 (카우 자세).",
      "천천히 반복합니다.",
      "척추 전체가 움직이는 것을 느낍니다."
    ]
  },
  {
    nameKo: "비둘기 자세",
    freeId: "Child_Pose",
    instructionsKo: [
      "한쪽 다리를 앞으로 구부려 바닥에 놓습니다.",
      "뒷다리를 뒤로 뻗습니다.",
      "상체를 앞으로 숙입니다.",
      "둔근이 늘어나는 것을 느낍니다.",
      "30~60초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "아이 자세",
    freeId: "Child_Pose",
    instructionsKo: [
      "무릎을 꿇고 앉습니다.",
      "상체를 앞으로 숙이며 팔을 앞으로 뻗습니다.",
      "이마를 바닥에 내립니다.",
      "허리와 등이 늘어나는 것을 느낍니다.",
      "30~60초간 유지합니다."
    ]
  },
  {
    nameKo: "흉추 회전 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "네발 기기 자세를 취합니다.",
      "한 손을 머리 뒤에 올립니다.",
      "팔꿈치를 위로 향하며 상체를 회전합니다.",
      "흉추가 회전되는 것을 느낍니다.",
      "반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "종아리 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "벽 앞에 서서 한 발을 뒤로 뻗습니다.",
      "뒷발 뒤꿈치를 바닥에 붙입니다.",
      "앞으로 기울이며 종아리를 늘입니다.",
      "종아리 근육이 늘어나는 것을 느낍니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "삼두근 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "한 팔을 머리 위로 올립니다.",
      "팔꿈치를 구부려 손이 등 위쪽에 닿도록 합니다.",
      "반대 손으로 팔꿈치를 잡아당깁니다.",
      "삼두근이 늘어나는 것을 느낍니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "대퇴사두근 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "바르게 서서 한 발을 뒤로 들어 올립니다.",
      "같은 쪽 손으로 발목을 잡습니다.",
      "무릎을 모으며 대퇴사두근을 늘입니다.",
      "균형을 유지합니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "둔근 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "등을 대고 누워 한쪽 무릎을 구부립니다.",
      "구부린 다리를 반대쪽으로 넘깁니다.",
      "둔근이 늘어나는 것을 느낍니다.",
      "30초간 유지합니다.",
      "반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "앉아서 앞으로 굽히기",
    freeId: "Child_Pose",
    instructionsKo: [
      "바닥에 앉아 다리를 앞으로 펍니다.",
      "엉덩이를 뒤로 빼며 상체를 앞으로 숙입니다.",
      "손이 발 쪽으로 향하도록 합니다.",
      "후면 근육 전체가 늘어나는 것을 느낍니다.",
      "60초간 유지합니다."
    ]
  },
  {
    nameKo: "척추 비틀기",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "등을 대고 눕습니다.",
      "한쪽 무릎을 반대쪽으로 넘깁니다.",
      "반대 팔을 옆으로 뻗습니다.",
      "척추가 회전되는 것을 느낍니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "문틀 어깨 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "문틀 앞에 서서 팔을 90도로 구부립니다.",
      "팔꿈치를 문틀에 올립니다.",
      "몸을 앞으로 기울입니다.",
      "전면 어깨와 가슴이 늘어나는 것을 느낍니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "목 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "바르게 앉거나 섭니다.",
      "머리를 한쪽으로 기울입니다.",
      "같은 쪽 손으로 머리를 가볍게 당깁니다.",
      "목 옆 근육이 늘어나는 것을 느낍니다.",
      "30초간 유지 후 반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "나비 스트레칭",
    freeId: "Child_Pose",
    instructionsKo: [
      "바닥에 앉아 발바닥을 서로 붙입니다.",
      "양손으로 발을 잡습니다.",
      "무릎을 바닥 쪽으로 누릅니다.",
      "내전근이 늘어나는 것을 느낍니다.",
      "60초간 유지합니다."
    ]
  },
  {
    nameKo: "다운워드 독",
    freeId: "Downward_Dog",
    instructionsKo: [
      "네발 기기 자세에서 시작합니다.",
      "엉덩이를 위로 들어 올립니다.",
      "다리를 최대한 펍니다.",
      "발뒤꿈치를 바닥 쪽으로 누릅니다.",
      "햄스트링과 종아리가 늘어나는 것을 느낍니다."
    ]
  },
  {
    nameKo: "세계 최고의 스트레칭",
    freeId: "Cat_Stretch",
    instructionsKo: [
      "런지 자세를 취합니다.",
      "앞발 안쪽에 손을 놓습니다.",
      "상체를 회전하며 팔을 천장 쪽으로 뻗습니다.",
      "전신의 여러 근육이 늘어나는 것을 느낍니다.",
      "반대쪽으로 반복합니다."
    ]
  },

  // ── FULL BODY (전신) ──
  {
    nameKo: "클린 앤 프레스",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "바벨을 어깨너비로 잡고 바르게 섭니다.",
      "바를 어깨 높이로 빠르게 당겨 올립니다 (클린).",
      "바를 머리 위로 밀어 올립니다 (프레스).",
      "천천히 바를 어깨로 내립니다.",
      "바를 바닥으로 내리며 반복합니다."
    ]
  },
  {
    nameKo: "케틀벨 스윙",
    freeId: "Kettlebell_Swing",
    instructionsKo: [
      "발을 어깨너비로 벌리고 케틀벨을 잡습니다.",
      "엉덩이를 뒤로 빼며 케틀벨을 다리 사이로 내립니다.",
      "엉덩이를 앞으로 밀며 케틀벨을 어깨 높이로 올립니다.",
      "코어를 단단히 유지합니다.",
      "리듬감 있게 반복합니다."
    ]
  },
  {
    nameKo: "터키시 겟업",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "등을 대고 누워 한 손으로 케틀벨을 들어 올립니다.",
      "반대 팔과 다리로 지지하며 일어납니다.",
      "완전히 서서 케틀벨을 위로 유지합니다.",
      "역순으로 다시 눕습니다.",
      "반대쪽으로 반복합니다."
    ]
  },
  {
    nameKo: "스러스터",
    freeId: "Barbell_Squat",
    instructionsKo: [
      "바벨을 어깨에 올리고 스쿼트 자세를 취합니다.",
      "스쿼트를 내려갑니다.",
      "올라오는 힘을 이용해 바를 머리 위로 밀어 올립니다.",
      "바를 어깨로 내리며 반복합니다.",
      "전신을 연속적으로 사용합니다."
    ]
  },
  {
    nameKo: "배틀 로프",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "로프 끝을 양손에 잡습니다.",
      "무릎을 약간 구부리고 코어를 단단히 유지합니다.",
      "번갈아가며 파도를 만들듯 로프를 움직입니다.",
      "일정한 리듬을 유지합니다.",
      "목표 시간만큼 반복합니다."
    ]
  },
  {
    nameKo: "파머스 워크",
    freeId: "Farmer_Walk",
    instructionsKo: [
      "무거운 덤벨을 양손에 듭니다.",
      "상체를 수직으로 유지하며 걷습니다.",
      "코어를 단단히 유지합니다.",
      "목표 거리 또는 시간만큼 걷습니다.",
      "덤벨을 조심스럽게 내려놓습니다."
    ]
  },
  {
    nameKo: "슬레드 푸시",
    freeId: "Mountain_Climber",
    instructionsKo: [
      "슬레드 핸들을 잡습니다.",
      "상체를 앞으로 기울이며 다리로 밀어냅니다.",
      "낮은 자세를 유지합니다.",
      "목표 거리만큼 슬레드를 밉니다.",
      "코어를 단단히 유지합니다."
    ]
  },
];

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const rawData = JSON.parse(readFileSync("/home/ubuntu/exercises_raw.json", "utf-8"));
  const IMAGE_BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

  // id → 운동 데이터 맵
  const freeDbMap = {};
  for (const ex of rawData) {
    freeDbMap[ex.id] = ex;
  }

  let updated = 0;
  let notFound = 0;

  for (const mapping of EXERCISE_DATA) {
    const freeEx = freeDbMap[mapping.freeId];
    
    // DB에서 운동 찾기
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

    let gifUrl = null;
    let secondaryImages = [];

    if (freeEx && freeEx.images && freeEx.images.length > 0) {
      const imageUrls = freeEx.images.map(img =>
        `${IMAGE_BASE_URL}/${encodeURIComponent(img)}`
      );
      gifUrl = imageUrls[0];
      secondaryImages = imageUrls.slice(1);
    }

    await conn.execute(
      `UPDATE exercises SET
        gifUrl = ?,
        secondaryImages = ?,
        instructionsKo = ?
       WHERE id = ?`,
      [
        gifUrl,
        JSON.stringify(secondaryImages),
        JSON.stringify(mapping.instructionsKo),
        dbId,
      ]
    );

    console.log(`✅ 업데이트: ${mapping.nameKo} (이미지: ${gifUrl ? '있음' : '없음'}, 한국어 수행방법: ${mapping.instructionsKo.length}개)`);
    updated++;
  }

  console.log(`\n완료: ${updated}개 업데이트, ${notFound}개 실패`);
  await conn.end();
}

run().catch(console.error);
