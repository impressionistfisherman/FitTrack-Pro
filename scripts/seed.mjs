import "dotenv/config";
import { getExercises } from "../server/db.ts";

const force = process.argv.includes("--force");

if (force) {
  console.warn("seed --force는 현재 참조 데이터 보존을 위해 운동 목록 동기화만 다시 수행합니다. 기존 운동 기록은 삭제하지 않습니다.");
}

const before = Date.now();
const exercises = await getExercises();
const elapsedMs = Date.now() - before;

console.log(JSON.stringify({
  ok: true,
  database: process.env.DATABASE_URL ? "remote" : "local-sqlite",
  exercises: exercises.length,
  elapsedMs,
}, null, 2));
