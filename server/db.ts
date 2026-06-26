import path from "node:path";
import { createRequire } from "node:module";
import type { InsertUser } from "../drizzle/schema";
import mysql from "mysql2/promise";
import { Pool as PgPool } from "pg";
import bulkExercises from "./data/bulk-exercises.json";
import { ENV } from "./_core/env";
import { expandExerciseSearchTerms, getExerciseSearchTokenGroups, getReadableKoreanExerciseName, matchesExerciseSearchText, scoreExerciseSearchMatch } from "../shared/exerciseSearch";

const databaseUrl = process.env.DATABASE_URL?.trim();
const sqlitePath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.resolve("local-db", "fittrack_local.sqlite");

let sqlite: any = null;
let mysqlPool: mysql.Pool | null = null;
let pgPool: PgPool | null = null;
let databaseType: "sqlite" | "mysql" | "postgres" = "sqlite";

if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  const protocol = parsed.protocol.replace(":", "");

  if (protocol === "postgres" || protocol === "postgresql") {
    databaseType = "postgres";
    pgPool = new PgPool({
      connectionString: databaseUrl,
      max: 10,
      ssl: { rejectUnauthorized: false },
    });
  } else if (protocol === "mysql" || protocol === "mysql2") {
    databaseType = "mysql";
    mysqlPool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
    });
  } else {
    throw new Error(`Unsupported DATABASE_URL protocol: ${protocol}`);
  }
} else {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite");

  sqlite = new DatabaseSync(sqlitePath);
  sqlite.exec("PRAGMA foreign_keys = OFF");
  sqlite.exec("PRAGMA journal_mode = WAL");
}

type Row = Record<string, any>;

const pgQuotedIdentifiers = [
  "openId",
  "loginMethod",
  "createdAt",
  "updatedAt",
  "lastSignedIn",
  "profileImageUrl",
  "nameKo",
  "bodyPart",
  "descriptionKo",
  "primaryMuscles",
  "secondaryMuscles",
  "secondaryImages",
  "instructionsKo",
  "targetWeight",
  "weeklyWorkouts",
  "heightCm",
  "birthYear",
  "isActive",
  "daysPerWeek",
  "isPublic",
  "routineId",
  "exerciseId",
  "weightKg",
  "restSeconds",
  "setDetails",
  "startedAt",
  "completedAt",
  "durationMinutes",
  "totalVolume",
  "workoutDate",
  "sessionId",
  "setNumber",
  "durationSeconds",
  "distanceM",
  "isWarmup",
  "recordedAt",
  "bodyFatPct",
  "muscleMassPct",
  "targetWeightKg",
  "targetReps",
  "userId",
  "gifUrl",
] as const;

let userProfileImageColumnReady = false;

async function ensureUserProfileImageColumn() {
  if (userProfileImageColumnReady) return;

  if (databaseType === "postgres") {
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileImageUrl" text`);
  } else if (databaseType === "mysql") {
    try {
      await run("ALTER TABLE users ADD COLUMN profileImageUrl TEXT");
    } catch (error: any) {
      if (error?.code !== "ER_DUP_FIELDNAME" && error?.errno !== 1060) throw error;
    }
  } else {
    const columns = await all<{ name: string }>("PRAGMA table_info(users)");
    if (!columns.some((column) => column.name === "profileImageUrl")) {
      await run("ALTER TABLE users ADD COLUMN profileImageUrl TEXT");
    }
  }

  userProfileImageColumnReady = true;
}

function quotePostgresIdentifiers(sql: string) {
  return pgQuotedIdentifiers.reduce((current, identifier) => {
    const pattern = new RegExp(String.raw`(?<!["\w])${identifier}(?!["\w])`, "g");
    return current.replaceAll(pattern, `"${identifier}"`);
  }, sql);
}

export function preparePostgresSql(sql: string) {
  let text = quotePostgresIdentifiers(sql.trim());
  if (
    /^insert\s+/i.test(text) &&
    !/\b(user_preferences|trainer_codes|coaching_read_states)\b/i.test(text) &&
    !/\breturning\b/i.test(text)
  ) {
    text = `${text} RETURNING id`;
  }
  return text;
}

function buildQuery(sql: string, params: any[]): { text: string; values: any[] } {
  if (databaseType === "postgres") {
    let index = 0;
    const sqlParts = preparePostgresSql(sql).split("?");
    return {
      text: sqlParts.map((part) => index < sqlParts.length - 1 ? `${part}$${++index}` : part).join(""),
      values: params,
    };
  }

  return { text: sql, values: params };
}

function getInsertId(result: any) {
  if (databaseType === "postgres") {
    return Number(result?.rows?.[0]?.id ?? 0);
  }
  return Number(result?.insertId ?? result?.lastInsertRowid ?? 0);
}

function sqliteParams(params: any[]) {
  return params.map((param) => {
    if (typeof param !== "boolean") return param;
    return param ? 1 : 0;
  });
}

async function all<T = Row>(sql: string, ...params: any[]): Promise<T[]> {
  if (databaseType === "mysql" && mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows as T[];
  }

  if (databaseType === "postgres" && pgPool) {
    const { text, values } = buildQuery(sql, params);
    const result = await pgPool.query(text, values);
    return result.rows as T[];
  }

  return sqlite.prepare(sql).all(...sqliteParams(params)) as T[];
}

async function get<T = Row>(sql: string, ...params: any[]): Promise<T | null> {
  if (databaseType === "mysql" && mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    const result = (rows as T[])[0];
    return result ?? null;
  }

  if (databaseType === "postgres" && pgPool) {
    const { text, values } = buildQuery(sql, params);
    const result = await pgPool.query(text, values);
    return (result.rows[0] as T | undefined) ?? null;
  }

  return (sqlite.prepare(sql).get(...sqliteParams(params)) as T | undefined) ?? null;
}

async function run(sql: string, ...params: any[]) {
  if (databaseType === "mysql" && mysqlPool) {
    const [result] = await mysqlPool.execute(sql, params);
    return result;
  }

  if (databaseType === "postgres" && pgPool) {
    const { text, values } = buildQuery(sql, params);
    const result = await pgPool.query(text, values);
    return result;
  }

  return sqlite.prepare(sql).run(...sqliteParams(params));
}

function toDbDate(value?: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function parseJson(value: unknown, fallback: any = null) {
  if (value == null) return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeExercise<T extends Row | null>(exercise: T): T {
  if (!exercise) return exercise;
  return {
    ...exercise,
    nameKo: getReadableKoreanExerciseName(exercise),
    primaryMuscles: parseJson(exercise.primaryMuscles, []),
    secondaryMuscles: parseJson(exercise.secondaryMuscles, []),
    secondaryImages: parseJson(exercise.secondaryImages, []),
    instructions: parseJson(exercise.instructions, []),
    instructionsKo: parseJson(exercise.instructionsKo, null),
  };
}

function normalizeRoutineExercise<T extends Row>(row: T): T {
  return {
    ...row,
    setDetails: parseJson(row.setDetails, []),
  };
}

function normalizeUser<T extends Row | null>(user: T): T {
  if (!user) return user;
  let displayName = "사용자";
  if (typeof user.email === "string" && user.email.includes("@")) {
    displayName = user.email.split("@")[0];
  }
  if (typeof user.name === "string" && user.name.trim()) {
    displayName = user.name.trim();
  }
  return {
    ...user,
    name: displayName,
    role: user.role ?? "user",
  };
}

function aliasValue(row: Row, key: string) {
  return row[key] ?? row[key.toLowerCase()];
}

export const db = pgPool ?? mysqlPool ?? sqlite;

const supplementalExercises = [
  {
    name: "Basketball",
    nameKo: "농구",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "beginner",
    description: "Court sport combining sprints, jumps, agility, and coordination.",
    descriptionKo: "질주, 점프, 민첩성, 협응력을 함께 쓰는 전신 구기 운동입니다.",
    primaryMuscles: ["full body", "cardiovascular system"],
    secondaryMuscles: ["legs", "core", "shoulders"],
    instructions: ["가볍게 드리블과 슈팅으로 몸을 풉니다.", "짧은 질주와 방향 전환을 반복합니다.", "무릎과 발목 충격을 줄이도록 착지에 집중합니다."],
  },
  {
    name: "Soccer",
    nameKo: "축구",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "beginner",
    description: "Field sport emphasizing running endurance, acceleration, and lower-body coordination.",
    descriptionKo: "지구력, 순간 가속, 하체 협응력을 함께 기르는 구기 운동입니다.",
    primaryMuscles: ["legs", "cardiovascular system"],
    secondaryMuscles: ["core", "glutes"],
    instructions: ["동적 스트레칭 후 가볍게 패스와 드리블을 시작합니다.", "전력 질주와 회복 조깅을 번갈아 수행합니다.", "발목과 햄스트링 부상을 막기 위해 충분히 정리운동합니다."],
  },
  {
    name: "Badminton",
    nameKo: "배드민턴",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "beginner",
    description: "Racket sport for agility, shoulder endurance, and interval conditioning.",
    descriptionKo: "민첩성, 어깨 지구력, 인터벌 체력을 기르는 라켓 구기 운동입니다.",
    primaryMuscles: ["shoulders", "legs", "cardiovascular system"],
    secondaryMuscles: ["arms", "core"],
    instructions: ["손목과 어깨를 충분히 풀어줍니다.", "풋워크를 짧고 빠르게 유지합니다.", "스매시 후에는 어깨에 무리가 가지 않게 회복 시간을 둡니다."],
  },
  {
    name: "Tennis",
    nameKo: "테니스",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "intermediate",
    description: "Racket sport using rotational power, agility, and repeated acceleration.",
    descriptionKo: "회전 파워, 민첩성, 반복 가속 능력을 쓰는 전신 구기 운동입니다.",
    primaryMuscles: ["core", "legs", "shoulders"],
    secondaryMuscles: ["arms", "cardiovascular system"],
    instructions: ["어깨와 흉추 회전을 충분히 준비합니다.", "스텝으로 공 위치에 먼저 접근합니다.", "허리 부담을 줄이도록 팔만 쓰지 말고 몸통 회전을 사용합니다."],
  },
  {
    name: "Table Tennis",
    nameKo: "탁구",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "beginner",
    description: "Fast racket sport for reaction speed, coordination, and light conditioning.",
    descriptionKo: "반응 속도, 협응력, 가벼운 유산소 능력을 기르는 구기 운동입니다.",
    primaryMuscles: ["arms", "core"],
    secondaryMuscles: ["legs", "shoulders"],
    instructions: ["손목과 팔꿈치를 가볍게 풀어줍니다.", "상체를 낮추고 짧은 스텝을 유지합니다.", "반복 플레이 후 전완과 어깨를 스트레칭합니다."],
  },
  {
    name: "Volleyball",
    nameKo: "배구",
    bodyPart: "full_body",
    equipment: "none",
    category: "cardio",
    difficulty: "intermediate",
    description: "Team sport emphasizing jumping power, shoulder endurance, and quick reactions.",
    descriptionKo: "점프력, 어깨 지구력, 빠른 반응을 요구하는 전신 구기 운동입니다.",
    primaryMuscles: ["legs", "shoulders", "glutes"],
    secondaryMuscles: ["core", "arms"],
    instructions: ["어깨와 무릎을 충분히 준비합니다.", "점프 후 무릎이 안쪽으로 무너지지 않게 착지합니다.", "어깨 사용량이 많으면 강도를 조절합니다."],
  },
  {
    name: "Cable Rope Hammer Curl",
    nameKo: "케이블 로프 해머 컬",
    bodyPart: "arms",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "beginner",
    description: "Cable biceps and brachialis exercise with constant tension.",
    descriptionKo: "지속 장력으로 이두근과 상완근을 자극하는 케이블 운동입니다.",
    primaryMuscles: ["biceps", "brachialis"],
    secondaryMuscles: ["forearms"],
    instructions: ["로프를 하단 케이블에 연결합니다.", "팔꿈치를 몸 옆에 고정합니다.", "손목을 중립으로 유지하며 로프를 들어 올립니다.", "천천히 내려 장력을 유지합니다."],
  },
  {
    name: "Cable Overhead Triceps Extension",
    nameKo: "케이블 오버헤드 트라이셉스 익스텐션",
    bodyPart: "arms",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "intermediate",
    description: "Cable triceps exercise emphasizing the long head.",
    descriptionKo: "삼두근 장두를 강조하는 케이블 삼두 운동입니다.",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["core"],
    instructions: ["로프를 케이블에 연결하고 등을 돌려 섭니다.", "팔꿈치를 머리 옆에 고정합니다.", "팔을 펴며 로프를 앞으로 밀어냅니다.", "팔꿈치 위치가 흔들리지 않게 돌아옵니다."],
  },
  {
    name: "Straight Arm Cable Pulldown",
    nameKo: "스트레이트 암 케이블 풀다운",
    bodyPart: "back",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "beginner",
    description: "Cable lat isolation movement using straight arms.",
    descriptionKo: "팔을 거의 편 상태로 광배근을 고립하는 케이블 운동입니다.",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["triceps", "core"],
    instructions: ["상단 케이블에 바를 연결합니다.", "팔꿈치를 살짝 굽힌 채 고정합니다.", "광배근으로 바를 허벅지 쪽으로 당깁니다.", "어깨가 으쓱하지 않게 천천히 돌아갑니다."],
  },
  {
    name: "Cable High Row",
    nameKo: "케이블 하이 로우",
    bodyPart: "back",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "intermediate",
    description: "Cable row variation targeting upper back and lats.",
    descriptionKo: "상부 등과 광배근을 함께 자극하는 케이블 로우 변형입니다.",
    primaryMuscles: ["lats", "upper back"],
    secondaryMuscles: ["biceps", "rear delts"],
    instructions: ["케이블을 가슴보다 높은 위치에 둡니다.", "팔꿈치를 뒤쪽 아래로 당깁니다.", "견갑을 모으며 등을 수축합니다.", "반동 없이 천천히 팔을 폅니다."],
  },
  {
    name: "Cable Reverse Fly",
    nameKo: "케이블 리버스 플라이",
    bodyPart: "shoulders",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "intermediate",
    description: "Cable rear delt and upper back isolation exercise.",
    descriptionKo: "후면 삼각근과 상부 등을 고립하는 케이블 운동입니다.",
    primaryMuscles: ["rear delts"],
    secondaryMuscles: ["upper back", "traps"],
    instructions: ["케이블을 어깨 높이에 맞춥니다.", "반대쪽 손잡이를 각각 잡습니다.", "팔꿈치를 살짝 굽힌 채 양옆으로 벌립니다.", "후면 어깨 수축을 느끼며 천천히 돌아옵니다."],
  },
  {
    name: "Cable Woodchopper",
    nameKo: "케이블 우드초퍼",
    bodyPart: "abs",
    equipment: "cable",
    category: "strength",
    difficulty: "intermediate",
    description: "Rotational cable core exercise.",
    descriptionKo: "회전 저항으로 코어와 복사근을 강화하는 케이블 운동입니다.",
    primaryMuscles: ["obliques", "core"],
    secondaryMuscles: ["shoulders", "glutes"],
    instructions: ["케이블을 높거나 낮은 위치에 설정합니다.", "몸통을 회전해 손잡이를 대각선으로 당깁니다.", "골반과 코어를 단단히 고정합니다.", "반동 없이 시작 자세로 돌아옵니다."],
  },
  {
    name: "Cable Pull Through",
    nameKo: "케이블 풀 스루",
    bodyPart: "glutes",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "beginner",
    description: "Hip hinge cable exercise for glutes and hamstrings.",
    descriptionKo: "힙 힌지 패턴으로 둔근과 햄스트링을 자극하는 케이블 운동입니다.",
    primaryMuscles: ["glutes", "hamstrings"],
    secondaryMuscles: ["lower back", "core"],
    instructions: ["하단 케이블에 로프를 연결하고 등을 돌려 섭니다.", "엉덩이를 뒤로 빼며 상체를 숙입니다.", "둔근을 수축해 골반을 앞으로 밀어냅니다.", "허리가 꺾이지 않게 코어를 유지합니다."],
  },
  {
    name: "Low To High Cable Fly",
    nameKo: "로우 투 하이 케이블 플라이",
    bodyPart: "chest",
    equipment: "cable",
    category: "hypertrophy",
    difficulty: "intermediate",
    description: "Cable fly variation emphasizing upper chest.",
    descriptionKo: "상부 가슴을 강조하는 아래에서 위로 당기는 케이블 플라이입니다.",
    primaryMuscles: ["upper chest"],
    secondaryMuscles: ["front delts", "biceps"],
    instructions: ["케이블을 하단에 설정합니다.", "양손을 아래에서 위로 모읍니다.", "팔꿈치를 살짝 굽힌 각도를 유지합니다.", "가슴 수축 후 천천히 내려옵니다."],
  },
] as const;

type SeedExercise = {
  name: string;
  nameKo: string;
  bodyPart: string;
  equipment: string;
  category: string;
  difficulty: string;
  description?: string | null;
  descriptionKo?: string | null;
  primaryMuscles?: readonly string[];
  secondaryMuscles?: readonly string[];
  gifUrl?: string | null;
  secondaryImages?: readonly string[];
  instructions?: readonly string[];
  instructionsKo?: readonly string[] | null;
};

let supplementalExercisesReady = false;

function normalizeExerciseSeedKey(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";

  return String(value)
    .toLowerCase()
    .replaceAll(/\(multiple response\)|\(single response\)|- medium grip/g, "")
    .replaceAll("rope jumping", "jump rope")
    .replaceAll("triceps", "tricep")
    .replaceAll(/[^a-z0-9가-힣]+/g, "");
}

function shouldUpdateExerciseKoreanName(currentNameKo: unknown, nextNameKo: unknown): boolean {
  if (typeof currentNameKo !== "string" || typeof nextNameKo !== "string") return false;
  const current = currentNameKo.trim();
  const next = nextNameKo.trim();
  if (!current || !next || current === next) return false;
  return /[a-z]/i.test(current) && !/[a-z]/i.test(next);
}

function uniqueExercisesByName(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const unique: Row[] = [];
  for (const row of rows) {
    const key = normalizeExerciseSeedKey(row.name) || normalizeExerciseSeedKey(row.nameKo) || String(row.id ?? "");
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    unique.push(row);
  }
  return unique;
}

async function ensureSupplementalExercises() {
  if (supplementalExercisesReady) return;

  const existingRows = await all("SELECT id, name, nameKo FROM exercises");
  const existingKeys = new Set<string>();
  const existingByNameKey = new Map<string, Row>();
  for (const row of existingRows) {
    const nameKey = normalizeExerciseSeedKey(row.name);
    const nameKoKey = normalizeExerciseSeedKey(row.nameKo);
    if (nameKey) existingKeys.add(nameKey);
    if (nameKoKey) existingKeys.add(nameKoKey);
    if (nameKey && !existingByNameKey.has(nameKey)) existingByNameKey.set(nameKey, row);
  }

  const seedExercises: SeedExercise[] = [
    ...supplementalExercises.map((exercise) => ({ ...exercise })),
    ...(bulkExercises as SeedExercise[]),
  ];

  for (const exercise of seedExercises) {
    const nameKey = normalizeExerciseSeedKey(exercise.name);
    const nameKoKey = normalizeExerciseSeedKey(exercise.nameKo);
    const existingByName = nameKey ? existingByNameKey.get(nameKey) : null;
    if (existingByName) {
      if (shouldUpdateExerciseKoreanName(existingByName.nameKo, exercise.nameKo)) {
        await run("UPDATE exercises SET nameKo = ? WHERE id = ?", exercise.nameKo, existingByName.id);
        existingByName.nameKo = exercise.nameKo;
        if (nameKoKey) existingKeys.add(nameKoKey);
      }
      continue;
    }
    if (nameKoKey && existingKeys.has(nameKoKey)) continue;

    const result = await run(
      `INSERT INTO exercises
       (name, nameKo, bodyPart, equipment, category, difficulty, description, descriptionKo, primaryMuscles, secondaryMuscles, gifUrl, secondaryImages, instructions, instructionsKo, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      exercise.name,
      exercise.nameKo,
      exercise.bodyPart,
      exercise.equipment,
      exercise.category,
      exercise.difficulty,
      exercise.description ?? null,
      exercise.descriptionKo ?? null,
      JSON.stringify(exercise.primaryMuscles ?? []),
      JSON.stringify(exercise.secondaryMuscles ?? []),
      exercise.gifUrl ?? null,
      JSON.stringify(exercise.secondaryImages ?? []),
      JSON.stringify(exercise.instructions ?? []),
      JSON.stringify(exercise.instructionsKo ?? exercise.instructions ?? []),
      new Date().toISOString(),
    );
    if (nameKey) existingKeys.add(nameKey);
    if (nameKoKey) existingKeys.add(nameKoKey);
    if (nameKey) existingByNameKey.set(nameKey, { id: getInsertId(result), name: exercise.name, nameKo: exercise.nameKo });
  }
  supplementalExercisesReady = true;
}

export async function getUserByOpenId(openId: string): Promise<any> {
  await ensureUserProfileImageColumn();
  return normalizeUser(await get("SELECT * FROM users WHERE openId = ? LIMIT 1", openId));
}

export async function getUserByEmail(email: string): Promise<any> {
  await ensureUserProfileImageColumn();
  return normalizeUser(await get("SELECT * FROM users WHERE lower(email) = lower(?) ORDER BY lastSignedIn DESC, id DESC LIMIT 1", email));
}

export async function getUserById(userId: number): Promise<any> {
  await ensureUserProfileImageColumn();
  return normalizeUser(await get("SELECT * FROM users WHERE id = ? LIMIT 1", userId));
}

export async function getFirstUser(): Promise<any> {
  await ensureUserProfileImageColumn();
  return normalizeUser(await get("SELECT * FROM users ORDER BY id LIMIT 1"));
}

export async function upsertUser(input: InsertUser): Promise<any> {
  await ensureUserProfileImageColumn();
  const existingByOpenId = await getUserByOpenId(input.openId);
  const existingByEmail = typeof input.email === "string" && input.email.includes("@")
    ? await getUserByEmail(input.email)
    : null;
  const existing = existingByOpenId ?? existingByEmail;
  const email = typeof input.email === "string"
    ? input.email.toLowerCase()
    : typeof existing?.email === "string"
      ? existing.email.toLowerCase()
      : "";
  const role = ENV.adminEmails.includes(email) ? "admin" : input.role ?? "user";
  if (existing) {
    await run(
      `UPDATE users
       SET openId = ?, name = ?, email = ?, loginMethod = ?, role = ?, lastSignedIn = ?, updatedAt = ?
       WHERE id = ?`,
      input.openId ?? existing.openId,
      input.name ?? existing.name ?? null,
      input.email ?? existing.email ?? null,
      input.loginMethod ?? existing.loginMethod ?? null,
      existing.role === "admin" ? "admin" : role,
      new Date().toISOString(),
      new Date().toISOString(),
      existing.id,
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.openId,
    input.name ?? null,
    input.email ?? null,
    input.loginMethod ?? null,
    role,
    toDbDate(input.createdAt as any) ?? new Date().toISOString(),
    toDbDate(input.updatedAt as any) ?? new Date().toISOString(),
    toDbDate(input.lastSignedIn as any) ?? new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function touchUserLastSignedIn(userId: number, signedInAt = new Date()): Promise<void> {
  await ensureUserProfileImageColumn();
  const timestamp = signedInAt.toISOString();
  await run(
    "UPDATE users SET lastSignedIn = ?, updatedAt = ? WHERE id = ?",
    timestamp,
    timestamp,
    userId,
  );
}

export async function updateUserProfileName(userId: number, name: string): Promise<void> {
  await ensureUserProfileImageColumn();
  await run(
    "UPDATE users SET name = ?, updatedAt = ? WHERE id = ?",
    name,
    new Date().toISOString(),
    userId,
  );
}

export async function updateUserProfileImage(userId: number, profileImageUrl: string | null): Promise<void> {
  await ensureUserProfileImageColumn();
  await run(
    "UPDATE users SET profileImageUrl = ?, updatedAt = ? WHERE id = ?",
    profileImageUrl,
    new Date().toISOString(),
    userId,
  );
}

export async function updateUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  await ensureUserProfileImageColumn();
  await run(
    "UPDATE users SET role = ?, updatedAt = ? WHERE id = ?",
    role,
    new Date().toISOString(),
    userId,
  );
}

export async function listAdminMembers(filters?: {
  search?: string;
  role?: "user" | "admin" | "all";
  appRole?: "trainer" | "member" | "all";
  limit?: number;
}): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const where: string[] = [];
  const params: any[] = [];
  const search = filters?.search?.trim();
  const role = filters?.role && filters.role !== "all" ? filters.role : undefined;
  const appRole = filters?.appRole && filters.appRole !== "all" ? filters.appRole : undefined;
  const limit = Math.min(Math.max(Number(filters?.limit ?? 100), 1), 200);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    const searchParts = ["lower(u.name) LIKE ?", "lower(u.email) LIKE ?"];
    params.push(term, term);
    if (/^\d+$/.test(search)) {
      searchParts.push("u.id = ?");
      params.push(Number(search));
    }
    where.push(`(${searchParts.join(" OR ")})`);
  }
  if (role) {
    where.push("u.role = ?");
    params.push(role);
  }
  if (appRole === "trainer") {
    where.push("up.pref_value = ?");
    params.push("trainer");
  } else if (appRole === "member") {
    where.push("COALESCE(up.pref_value, 'member') != ?");
    params.push("trainer");
  }

  const rows = await all(
    `SELECT
       u.id,
       u.openId,
       u.name,
       u.email,
       u.profileImageUrl,
       u.loginMethod,
       u.role,
       u.createdAt,
       u.updatedAt,
       u.lastSignedIn,
       up.pref_value AS app_role,
       tc.code AS trainer_code,
       COUNT(DISTINCT ws.id) AS workout_count,
       COUNT(DISTINCT r.id) AS routine_count,
       COUNT(DISTINCT bw.id) AS body_weight_count,
       COUNT(DISTINCT uf.id) AS feedback_count,
       COUNT(DISTINCT active_clients.id) AS trainer_client_count,
       COUNT(DISTINCT active_trainers.id) AS linked_trainer_count,
       MAX(ws.workoutDate) AS last_workout_at
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id AND up.pref_key = 'appRole'
     LEFT JOIN trainer_codes tc ON tc.trainer_user_id = u.id AND tc.is_active = ?
     LEFT JOIN workout_sessions ws ON ws.userId = u.id
     LEFT JOIN routines r ON r.userId = u.id
     LEFT JOIN body_weights bw ON bw.userId = u.id
     LEFT JOIN user_feedback uf ON uf.user_id = u.id
     LEFT JOIN trainer_client_links active_clients
       ON active_clients.trainer_user_id = u.id AND active_clients.status = 'active'
     LEFT JOIN trainer_client_links active_trainers
       ON active_trainers.client_user_id = u.id AND active_trainers.status = 'active'
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY
       u.id, u.openId, u.name, u.email, u.profileImageUrl, u.loginMethod, u.role,
       u.createdAt, u.updatedAt, u.lastSignedIn, up.pref_value, tc.code
     ORDER BY u.lastSignedIn DESC, u.updatedAt DESC, u.id DESC
     LIMIT ?`,
    true,
    ...params,
    limit,
  );

  return rows.map((row) => ({
    ...normalizeUser(row),
    appRole: aliasValue(row, "app_role") === "trainer" ? "trainer" : "member",
    trainerCode: aliasValue(row, "trainer_code") ?? null,
    workoutCount: Number(aliasValue(row, "workout_count")) || 0,
    routineCount: Number(aliasValue(row, "routine_count")) || 0,
    bodyWeightCount: Number(aliasValue(row, "body_weight_count")) || 0,
    feedbackCount: Number(aliasValue(row, "feedback_count")) || 0,
    trainerClientCount: Number(aliasValue(row, "trainer_client_count")) || 0,
    linkedTrainerCount: Number(aliasValue(row, "linked_trainer_count")) || 0,
    lastWorkoutAt: aliasValue(row, "last_workout_at") ?? null,
  }));
}

export async function getAdminMemberSummary(): Promise<Row> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const row = await get(
    `SELECT
       COUNT(*) AS total_members,
       SUM(CASE WHEN u.role = 'admin' THEN 1 ELSE 0 END) AS admin_members,
       SUM(CASE WHEN up.pref_value = 'trainer' THEN 1 ELSE 0 END) AS trainer_members,
       SUM(CASE WHEN u.lastSignedIn >= ? THEN 1 ELSE 0 END) AS active_30d_members
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id AND up.pref_key = 'appRole'`,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  return {
    totalMembers: Number(aliasValue(row ?? {}, "total_members")) || 0,
    adminMembers: Number(aliasValue(row ?? {}, "admin_members")) || 0,
    trainerMembers: Number(aliasValue(row ?? {}, "trainer_members")) || 0,
    active30dMembers: Number(aliasValue(row ?? {}, "active_30d_members")) || 0,
  };
}

export async function getAdminDataDiagnostics(): Promise<Row> {
  await ensureTrainerTables();
  await ensureUserFeedbackTable();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionRow = await get(
    `SELECT
       COUNT(*) AS total_sessions,
       SUM(CASE WHEN COALESCE(ws.totalVolume, 0) = 0 AND EXISTS (
         SELECT 1
         FROM workout_logs zwl
         JOIN exercises ze ON ze.id = zwl.exerciseId
         WHERE zwl.sessionId = ws.id
           AND COALESCE(zwl.durationSeconds, 0) = 0
           AND COALESCE(ze.equipment, '') <> 'bodyweight'
           AND COALESCE(ze.bodyPart, '') NOT IN ('abs', 'cardio', 'stretching')
           AND COALESCE(ze.category, '') NOT IN ('cardio', 'flexibility')
       ) THEN 1 ELSE 0 END) AS zero_volume_sessions,
       SUM(CASE WHEN ws.createdAt >= ? THEN 1 ELSE 0 END) AS recent_sessions
     FROM workout_sessions ws`,
    thirtyDaysAgo,
  );
  const logRow = await get(
    `SELECT
       COUNT(*) AS total_logs,
       SUM(CASE WHEN COALESCE(wl.weightKg, 0) = 0
          AND COALESCE(wl.durationSeconds, 0) = 0
          AND COALESCE(e.equipment, '') <> 'bodyweight'
          AND COALESCE(e.bodyPart, '') NOT IN ('abs', 'cardio', 'stretching')
          AND COALESCE(e.category, '') NOT IN ('cardio', 'flexibility')
        THEN 1 ELSE 0 END) AS missing_weight_logs,
       SUM(CASE WHEN COALESCE(wl.reps, 0) = 0 AND COALESCE(wl.durationSeconds, 0) = 0 THEN 1 ELSE 0 END) AS missing_reps_logs
     FROM workout_logs wl
     JOIN exercises e ON e.id = wl.exerciseId`,
  );
  const inactiveRow = await get(
    `SELECT COUNT(*) AS active_users_without_workouts
     FROM (
       SELECT u.id
       FROM users u
       LEFT JOIN workout_sessions ws ON ws.userId = u.id
       WHERE u.lastSignedIn >= ?
       GROUP BY u.id
       HAVING COUNT(ws.id) = 0
     ) active_without_workouts`,
    thirtyDaysAgo,
  );
  const feedbackRow = await get(
    `SELECT COUNT(*) AS open_feedback
     FROM user_feedback
     WHERE status IN ('open', 'reviewing')`,
  );

  const zeroVolumeSessions = Number(aliasValue(sessionRow ?? {}, "zero_volume_sessions")) || 0;
  const missingWeightLogs = Number(aliasValue(logRow ?? {}, "missing_weight_logs")) || 0;
  const missingRepsLogs = Number(aliasValue(logRow ?? {}, "missing_reps_logs")) || 0;
  const openFeedback = Number(aliasValue(feedbackRow ?? {}, "open_feedback")) || 0;

  return {
    totalSessions: Number(aliasValue(sessionRow ?? {}, "total_sessions")) || 0,
    recentSessions: Number(aliasValue(sessionRow ?? {}, "recent_sessions")) || 0,
    zeroVolumeSessions,
    totalLogs: Number(aliasValue(logRow ?? {}, "total_logs")) || 0,
    missingWeightLogs,
    missingRepsLogs,
    activeUsersWithoutWorkouts: Number(aliasValue(inactiveRow ?? {}, "active_users_without_workouts")) || 0,
    openFeedback,
    issueCount: zeroVolumeSessions + missingWeightLogs + missingRepsLogs + openFeedback,
  };
}

export async function updateAdminMember(userId: number, input: {
  name?: string;
  role?: "user" | "admin";
}): Promise<Row> {
  await ensureUserProfileImageColumn();
  const user = await getUserById(userId);
  if (!user) throw new Error("회원을 찾을 수 없습니다.");

  const assignments: string[] = [];
  const params: any[] = [];
  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (!name) throw new Error("회원 이름을 입력해주세요.");
    assignments.push("name = ?");
    params.push(name);
  }
  if (input.role) {
    assignments.push("role = ?");
    params.push(input.role);
  }
  if (!assignments.length) return user;

  assignments.push("updatedAt = ?");
  params.push(new Date().toISOString(), userId);
  await run(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?`, ...params);
  return await getUserById(userId);
}

export async function getExercises(filters?: {
  bodyPart?: string;
  equipment?: string;
  category?: string;
  search?: string;
}): Promise<Row[]> {
  await ensureSupplementalExercises();

  const where: string[] = [];
  const params: any[] = [];

  if (filters?.bodyPart) {
    where.push("bodyPart = ?");
    params.push(filters.bodyPart);
  }
  if (filters?.equipment) {
    where.push("equipment = ?");
    params.push(filters.equipment);
  }
  if (filters?.category) {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters?.search) {
    const tokenGroups = getExerciseSearchTokenGroups(filters.search).slice(0, 8);
    const terms = expandExerciseSearchTerms(filters.search).slice(0, 12);

    if (tokenGroups.length) {
      for (const group of tokenGroups) {
        const candidates = group.slice(0, 12);
        where.push(`(${candidates.map(() => "(LOWER(name) LIKE ? OR LOWER(nameKo) LIKE ?)").join(" OR ")})`);
        for (const token of candidates) {
          params.push(`%${token}%`, `%${token}%`);
        }
      }
    } else if (terms.length) {
      where.push(`(${terms.map(() => "(LOWER(name) LIKE ? OR LOWER(nameKo) LIKE ?)").join(" OR ")})`);
      for (const term of terms) {
        params.push(`%${term}%`, `%${term}%`);
      }
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await all(`SELECT * FROM exercises ${whereClause} ORDER BY nameKo`, ...params);
  const normalizedRows = uniqueExercisesByName(rows).map((row) => normalizeExercise(row));
  if (!filters?.search) return normalizedRows;

  return normalizedRows
    .map((row) => ({
      row,
      score: scoreExerciseSearchMatch(filters.search!, row.nameKo, row.name),
    }))
    .filter((item) => item.score > 0 || matchesExerciseSearchText(filters.search!, item.row.nameKo, item.row.name))
    .sort((a, b) => (
      b.score - a.score
      || String(a.row.nameKo ?? "").localeCompare(String(b.row.nameKo ?? ""), "ko-KR")
      || String(a.row.name ?? "").localeCompare(String(b.row.name ?? ""), "en")
    ))
    .map((item) => item.row);
}

export async function getExerciseById(id: number): Promise<Row | null> {
  return normalizeExercise(await get("SELECT * FROM exercises WHERE id = ? LIMIT 1", id));
}

export async function getUserGoal(userId: number): Promise<Row | null> {
  const goal = await get(
    `SELECT * FROM user_goals
     WHERE userId = ? AND isActive = ?
     ORDER BY createdAt DESC
     LIMIT 1`,
    userId,
    true,
  );
  return goal ? { ...goal, isActive: Boolean(goal.isActive) } : null;
}

export async function getUserGoals(userId: number): Promise<Row[]> {
  const goals = await all(
    `SELECT * FROM user_goals
     WHERE userId = ? AND isActive = ?
     ORDER BY createdAt DESC`,
    userId,
    true,
  );
  return goals.map((goal) => ({ ...goal, isActive: Boolean(goal.isActive) }));
}

export async function upsertUserGoal(
  userId: number,
  goal: string,
  weeklyWorkouts: number,
  targetWeight?: number,
  heightCm?: number,
  gender?: "male" | "female",
  birthYear?: number,
): Promise<any> {
  const existing = await getUserGoal(userId);
  const now = new Date().toISOString();
  if (existing) {
    await run(
      `UPDATE user_goals
       SET goal = ?, weeklyWorkouts = ?, targetWeight = ?, heightCm = ?, gender = ?, birthYear = ?, isActive = ?, updatedAt = ?
       WHERE id = ?`,
      goal,
      weeklyWorkouts,
      targetWeight ?? null,
      heightCm ?? null,
      gender ?? null,
      birthYear ?? null,
      true,
      now,
      existing.id,
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO user_goals
     (userId, goal, targetWeight, weeklyWorkouts, heightCm, gender, birthYear, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    goal,
    targetWeight ?? null,
    weeklyWorkouts,
    heightCm ?? null,
    gender ?? null,
    birthYear ?? null,
    true,
    now,
    now,
  );
  return getInsertId(result);
}

export async function replaceUserGoals(
  userId: number,
  goals: string[],
  weeklyWorkouts: number,
  targetWeight?: number,
  heightCm?: number,
  gender?: "male" | "female",
  birthYear?: number,
): Promise<void> {
  const uniqueGoals = Array.from(new Set(goals)).filter(Boolean);
  const now = new Date().toISOString();

  await run(
    `UPDATE user_goals SET isActive = ?, updatedAt = ? WHERE userId = ?`,
    false,
    now,
    userId,
  );

  for (const goal of uniqueGoals) {
    await run(
      `INSERT INTO user_goals
       (userId, goal, targetWeight, weeklyWorkouts, heightCm, gender, birthYear, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      goal,
      targetWeight ?? null,
      weeklyWorkouts,
      heightCm ?? null,
      gender ?? null,
      birthYear ?? null,
      true,
      now,
      now,
    );
  }
}

let preferencesReady = false;

async function ensureUserPreferencesTable() {
  if (preferencesReady) return;
  await run(
    `CREATE TABLE IF NOT EXISTS user_preferences (
      user_id integer NOT NULL,
      pref_key varchar(100) NOT NULL,
      pref_value text,
      updated_at timestamp,
      PRIMARY KEY (user_id, pref_key)
    )`,
  );
  preferencesReady = true;
}

export async function getUserPreference(userId: number, key: string): Promise<string | null> {
  await ensureUserPreferencesTable();
  const row = await get(
    "SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ? LIMIT 1",
    userId,
    key,
  );
  return typeof row?.pref_value === "string" ? row.pref_value : null;
}

export async function getUserPreferences(
  userId: number,
  keys?: string[],
): Promise<Record<string, string>> {
  await ensureUserPreferencesTable();
  const normalizedKeys = Array.from(new Set((keys ?? []).filter(Boolean)));
  const rows = normalizedKeys.length
    ? await all<{ pref_key: string; pref_value: string | null }>(
        `SELECT pref_key, pref_value
         FROM user_preferences
         WHERE user_id = ? AND pref_key IN (${normalizedKeys.map(() => "?").join(", ")})`,
        userId,
        ...normalizedKeys,
      )
    : await all<{ pref_key: string; pref_value: string | null }>(
        "SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?",
        userId,
      );
  return Object.fromEntries(
    rows
      .filter((row) => typeof row.pref_value === "string")
      .map((row) => [row.pref_key, row.pref_value as string]),
  );
}

export async function setUserPreference(userId: number, key: string, value: string): Promise<void> {
  await ensureUserPreferencesTable();
  const now = new Date().toISOString();
  const existing = await get(
    "SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ? LIMIT 1",
    userId,
    key,
  );

  if (existing) {
    await run(
      "UPDATE user_preferences SET pref_value = ?, updated_at = ? WHERE user_id = ? AND pref_key = ?",
      value,
      now,
      userId,
      key,
    );
    return;
  }

  await run(
    "INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at) VALUES (?, ?, ?, ?)",
    userId,
    key,
    value,
    now,
  );
}

let trainerTablesReady = false;

function autoIdColumn() {
  if (databaseType === "postgres") return "SERIAL PRIMARY KEY";
  if (databaseType === "mysql") return "integer PRIMARY KEY AUTO_INCREMENT";
  return "integer PRIMARY KEY AUTOINCREMENT";
}

async function ensureTrainerTables() {
  if (trainerTablesReady) return;
  const autoId = autoIdColumn();
  const activeType = databaseType === "postgres" ? "boolean" : "integer";
  const activeDefault = databaseType === "postgres" ? "true" : "1";
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_applications (
      id ${autoId},
      user_id integer NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'pending',
      display_name varchar(80),
      bio text,
      experience text,
      specialties text,
      contact text,
      review_note text,
      reviewed_by integer,
      reviewed_at timestamp,
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_codes (
      code varchar(24) PRIMARY KEY,
      trainer_user_id integer NOT NULL,
      is_active ${activeType} NOT NULL DEFAULT ${activeDefault},
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_client_links (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'pending',
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_feedback (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      session_id integer,
      message text NOT NULL,
      created_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_pt_sessions (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      session_id integer NOT NULL,
      title varchar(200),
      notes text,
      created_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS coaching_comments (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      author_user_id integer NOT NULL,
      target_type varchar(32) NOT NULL DEFAULT 'general',
      target_id integer,
      message text NOT NULL,
      created_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS coaching_tasks (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      title varchar(200) NOT NULL,
      description text,
      status varchar(24) NOT NULL DEFAULT 'open',
      due_date timestamp,
      completed_at timestamp,
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS trainer_client_notes (
      id ${autoId},
      trainer_user_id integer NOT NULL,
      client_user_id integer NOT NULL,
      note text NOT NULL,
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  await run(
    `CREATE TABLE IF NOT EXISTS coaching_read_states (
      user_id integer NOT NULL,
      scope varchar(64) NOT NULL,
      last_read_at timestamp NOT NULL,
      PRIMARY KEY (user_id, scope)
    )`,
  );
  trainerTablesReady = true;
}

let userFeedbackTableReady = false;

async function ensureUserFeedbackTable() {
  if (userFeedbackTableReady) return;
  await run(
    `CREATE TABLE IF NOT EXISTS user_feedback (
      id ${autoIdColumn()},
      user_id integer NOT NULL,
      category varchar(32) NOT NULL DEFAULT 'general',
      message text NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      admin_note text,
      created_at timestamp,
      updated_at timestamp
    )`,
  );
  userFeedbackTableReady = true;
}

function normalizeUserFeedback(row: Row | null): Row | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(aliasValue(row, "user_id")),
    category: row.category ?? "general",
    message: row.message ?? "",
    status: row.status ?? "open",
    adminNote: row.admin_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTrainerApplication(row: Row | null): Row | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(aliasValue(row, "user_id")),
    status: row.status,
    displayName: row.display_name ?? "",
    bio: row.bio ?? "",
    experience: row.experience ?? "",
    specialties: parseJson(row.specialties, []),
    contact: row.contact ?? "",
    reviewNote: row.review_note ?? "",
    reviewedBy: row.reviewed_by ? Number(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function trainerCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FT-";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export type UserFeedbackStatus = "open" | "reviewing" | "resolved" | "closed";

export async function addUserFeedback(
  userId: number,
  input: { category: string; message: string },
): Promise<number> {
  await ensureUserFeedbackTable();
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO user_feedback (user_id, category, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    input.category,
    input.message.trim(),
    "open",
    now,
    now,
  );
  return getInsertId(result);
}

export async function getUserFeedback(userId: number, limit = 20): Promise<Row[]> {
  await ensureUserFeedbackTable();
  const rows = await all(
    `SELECT *
     FROM user_feedback
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    userId,
    limit,
  );
  return rows.map((row) => normalizeUserFeedback(row) as Row);
}

export async function listUserFeedback(status?: UserFeedbackStatus, limit = 100): Promise<Row[]> {
  await ensureUserFeedbackTable();
  await ensureUserProfileImageColumn();
  const params: any[] = [];
  const where = status ? "WHERE f.status = ?" : "";
  if (status) params.push(status);
  params.push(limit);
  const rows = await all(
    `SELECT
       f.*,
       u.id AS user_row_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url
     FROM user_feedback f
     LEFT JOIN users u ON u.id = f.user_id
     ${where}
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT ?`,
    ...params,
  );
  return rows.map((row) => ({
    ...normalizeUserFeedback(row),
    user: normalizeUser({
      id: Number(row.user_row_id ?? aliasValue(row, "user_id")),
      name: row.user_name,
      email: row.user_email,
      profileImageUrl: row.user_profile_image_url,
      role: "user",
    }),
  }));
}

export async function updateUserFeedbackStatus(
  feedbackId: number,
  input: { status: UserFeedbackStatus; adminNote?: string },
): Promise<Row | null> {
  await ensureUserFeedbackTable();
  const now = new Date().toISOString();
  await run(
    `UPDATE user_feedback
     SET status = ?, admin_note = ?, updated_at = ?
     WHERE id = ?`,
    input.status,
    input.adminNote?.trim() || null,
    now,
    feedbackId,
  );
  const row = await get("SELECT * FROM user_feedback WHERE id = ? LIMIT 1", feedbackId);
  return normalizeUserFeedback(row);
}

export async function getUserAppRole(userId: number): Promise<"user" | "trainer"> {
  const role = await getUserPreference(userId, "appRole");
  return role === "trainer" ? "trainer" : "user";
}

export async function ensureTrainerCode(userId: number): Promise<string> {
  await ensureTrainerTables();
  await setUserPreference(userId, "appRole", "trainer");
  const existing = await get(
    "SELECT code FROM trainer_codes WHERE trainer_user_id = ? AND is_active = ? ORDER BY created_at DESC LIMIT 1",
    userId,
    true,
  );
  if (typeof existing?.code === "string" && existing.code) return existing.code;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = trainerCode();
    const now = new Date().toISOString();
    const duplicate = await get("SELECT code FROM trainer_codes WHERE code = ? LIMIT 1", code);
    if (duplicate) continue;
    await run(
      "INSERT INTO trainer_codes (code, trainer_user_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      code,
      userId,
      true,
      now,
      now,
    );
    return code;
  }

  throw new Error("트레이너 코드를 발급하지 못했습니다.");
}

export async function getTrainerCode(userId: number): Promise<string | null> {
  await ensureTrainerTables();
  const row = await get(
    "SELECT code FROM trainer_codes WHERE trainer_user_id = ? AND is_active = ? ORDER BY created_at DESC LIMIT 1",
    userId,
    true,
  );
  return typeof row?.code === "string" ? row.code : null;
}

export async function getTrainerApplication(userId: number): Promise<Row | null> {
  await ensureTrainerTables();
  const row = await get(
    "SELECT * FROM trainer_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    userId,
  );
  return normalizeTrainerApplication(row);
}

export async function submitTrainerApplication(userId: number, input: {
  displayName: string;
  bio: string;
  experience: string;
  specialties: string[];
  contact?: string;
}): Promise<Row> {
  await ensureTrainerTables();
  const now = new Date().toISOString();
  const existing = await getTrainerApplication(userId);
  if (existing && ["pending", "approved"].includes(existing.status)) {
    return existing;
  }

  const result = await run(
    `INSERT INTO trainer_applications
     (user_id, status, display_name, bio, experience, specialties, contact, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    "pending",
    input.displayName.trim(),
    input.bio.trim(),
    input.experience.trim(),
    JSON.stringify(input.specialties),
    input.contact?.trim() ?? "",
    now,
    now,
  );
  return {
    id: getInsertId(result),
    userId,
    status: "pending",
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listTrainerApplications(status?: string): Promise<Row[]> {
  await ensureTrainerTables();
  const where = status ? "WHERE a.status = ?" : "";
  const rows = await all(
    `SELECT
       a.*,
       u.name AS user_name,
       u.email AS user_email
     FROM trainer_applications a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC`,
    ...(status ? [status] : []),
  );
  return rows.map((row) => ({
    ...normalizeTrainerApplication(row),
    user: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
    }),
  }));
}

export async function reviewTrainerApplication(adminUserId: number, applicationId: number, status: "approved" | "rejected", reviewNote = ""): Promise<Row> {
  await ensureTrainerTables();
  const application = normalizeTrainerApplication(await get(
    "SELECT * FROM trainer_applications WHERE id = ? LIMIT 1",
    applicationId,
  ));
  if (!application) throw new Error("트레이너 신청을 찾을 수 없습니다.");
  if (application.status === "approved" && status === "approved") {
    return application;
  }

  const now = new Date().toISOString();
  await run(
    `UPDATE trainer_applications
     SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
     WHERE id = ?`,
    status,
    reviewNote.trim(),
    adminUserId,
    now,
    now,
    applicationId,
  );

  if (status === "approved") {
    await setUserPreference(application.userId, "appRole", "trainer");
    const displayName = application.displayName || "";
    if (displayName.trim()) await setUserPreference(application.userId, "displayName", displayName.trim());
    await ensureTrainerCode(application.userId);
  }

  return {
    ...application,
    status,
    reviewNote,
    reviewedBy: adminUserId,
    reviewedAt: now,
    updatedAt: now,
  };
}

export async function linkTrainerByCode(clientUserId: number, code: string): Promise<Row> {
  await ensureTrainerTables();
  const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
  const trainerCodeRow = await get(
    "SELECT trainer_user_id FROM trainer_codes WHERE code = ? AND is_active = ? LIMIT 1",
    normalizedCode,
    true,
  );
  const trainerUserId = Number(trainerCodeRow?.trainer_user_id ?? 0);
  if (!trainerUserId) throw new Error("유효하지 않은 트레이너 코드입니다.");
  if (trainerUserId === clientUserId) throw new Error("본인의 트레이너 코드는 등록할 수 없습니다.");

  const now = new Date().toISOString();
  const existing = await get(
    "SELECT id, status FROM trainer_client_links WHERE trainer_user_id = ? AND client_user_id = ? LIMIT 1",
    trainerUserId,
    clientUserId,
  );
  if (existing) {
    if (existing.status === "blocked") {
      throw new Error("차단된 트레이너 연결은 다시 요청할 수 없습니다.");
    }
    if (existing.status === "active") {
      throw new Error("이미 연결된 트레이너입니다.");
    }
    await run(
      "UPDATE trainer_client_links SET status = ?, updated_at = ? WHERE id = ?",
      "pending",
      now,
      existing.id,
    );
    return existing;
  }

  const result = await run(
    "INSERT INTO trainer_client_links (trainer_user_id, client_user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    trainerUserId,
    clientUserId,
    "pending",
    now,
    now,
  );
  return { id: getInsertId(result), trainerUserId };
}

export async function reviewTrainerClientLink(
  trainerUserId: number,
  linkId: number,
  status: "active" | "rejected" | "removed" | "blocked" | "expired",
): Promise<void> {
  await ensureTrainerTables();
  await run(
    "UPDATE trainer_client_links SET status = ?, updated_at = ? WHERE id = ? AND trainer_user_id = ?",
    status,
    new Date().toISOString(),
    linkId,
    trainerUserId,
  );
}

export async function unlinkTrainer(clientUserId: number, trainerUserId: number): Promise<void> {
  await ensureTrainerTables();
  await run(
    "UPDATE trainer_client_links SET status = ?, updated_at = ? WHERE trainer_user_id = ? AND client_user_id = ?",
    "removed",
    new Date().toISOString(),
    trainerUserId,
    clientUserId,
  );
}

const COACHING_CLIENT_SCOPE = "client_coaching";
const COACHING_TRAINER_SCOPE = "trainer_work";
const COACHING_LEGACY_SCOPE = "coaching";

async function getCoachingLastReadAt(userId: number, scope = COACHING_CLIENT_SCOPE): Promise<string> {
  await ensureTrainerTables();
  const row = await get(
    "SELECT last_read_at FROM coaching_read_states WHERE user_id = ? AND scope = ? LIMIT 1",
    userId,
    scope,
  );
  if (row?.last_read_at) return String(row.last_read_at);

  if (scope !== COACHING_LEGACY_SCOPE) {
    const legacy = await get(
      "SELECT last_read_at FROM coaching_read_states WHERE user_id = ? AND scope = ? LIMIT 1",
      userId,
      COACHING_LEGACY_SCOPE,
    );
    if (legacy?.last_read_at) return String(legacy.last_read_at);
  }

  return "1970-01-01T00:00:00.000Z";
}

async function upsertCoachingReadState(userId: number, scope: string, lastReadAt: string) {
  const existing = await get(
    "SELECT user_id FROM coaching_read_states WHERE user_id = ? AND scope = ? LIMIT 1",
    userId,
    scope,
  );
  if (existing) {
    await run(
      "UPDATE coaching_read_states SET last_read_at = ? WHERE user_id = ? AND scope = ?",
      lastReadAt,
      userId,
      scope,
    );
    return;
  }
  await run(
    "INSERT INTO coaching_read_states (user_id, scope, last_read_at) VALUES (?, ?, ?)",
    userId,
    scope,
    lastReadAt,
  );
}

function maxTimestampIso(...values: Array<string | null | undefined>): string {
  let maxTime = 0;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(String(value));
    if (Number.isFinite(time)) maxTime = Math.max(maxTime, time);
  }
  return new Date(maxTime).toISOString();
}

async function getLatestCoachingNotificationAt(userId: number, scope: string): Promise<string | null> {
  if (scope === COACHING_TRAINER_SCOPE) {
    const row = await get(
      `SELECT MAX(COALESCE(updated_at, created_at)) AS latest_at
       FROM trainer_client_links
       WHERE trainer_user_id = ?
         AND status = 'pending'`,
      userId,
    );
    return row?.latest_at ? String(row.latest_at) : null;
  }

  const row = await get(
    `SELECT MAX(event_at) AS latest_at
     FROM (
       SELECT f.created_at AS event_at
       FROM trainer_feedback f
       JOIN trainer_client_links l
         ON l.trainer_user_id = f.trainer_user_id
        AND l.client_user_id = f.client_user_id
        AND l.status = 'active'
       WHERE f.client_user_id = ?

       UNION ALL

       SELECT p.created_at AS event_at
       FROM trainer_pt_sessions p
       JOIN trainer_client_links l
         ON l.trainer_user_id = p.trainer_user_id
        AND l.client_user_id = p.client_user_id
        AND l.status = 'active'
       WHERE p.client_user_id = ?

       UNION ALL

       SELECT c.created_at AS event_at
       FROM coaching_comments c
       JOIN trainer_client_links l
         ON l.trainer_user_id = c.trainer_user_id
        AND l.client_user_id = c.client_user_id
        AND l.status = 'active'
       WHERE (c.client_user_id = ? OR c.trainer_user_id = ?)
         AND c.author_user_id != ?

       UNION ALL

       SELECT COALESCE(t.updated_at, t.created_at) AS event_at
       FROM coaching_tasks t
       JOIN trainer_client_links l
         ON l.trainer_user_id = t.trainer_user_id
        AND l.client_user_id = t.client_user_id
        AND l.status = 'active'
       WHERE t.client_user_id = ?
     ) events`,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
  );
  return row?.latest_at ? String(row.latest_at) : null;
}

export async function markCoachingRead(userId: number, scope = COACHING_CLIENT_SCOPE): Promise<void> {
  await ensureTrainerTables();
  const now = new Date().toISOString();
  const latestNotificationAt = await getLatestCoachingNotificationAt(userId, scope);
  const lastReadAt = maxTimestampIso(now, latestNotificationAt);
  await upsertCoachingReadState(userId, scope, lastReadAt);
  if (scope === COACHING_CLIENT_SCOPE) {
    await upsertCoachingReadState(userId, COACHING_LEGACY_SCOPE, lastReadAt);
  }
}

export async function markTrainerWorkRead(userId: number): Promise<void> {
  await markCoachingRead(userId, COACHING_TRAINER_SCOPE);
}

export async function getCoachingNotificationSummary(userId: number): Promise<Row> {
  await ensureTrainerTables();
  const [clientSince, trainerSince] = await Promise.all([
    getCoachingLastReadAt(userId, COACHING_CLIENT_SCOPE),
    getCoachingLastReadAt(userId, COACHING_TRAINER_SCOPE),
  ]);
  const [feedback, ptSessions, comments, tasks, requests] = await Promise.all([
    get(
    `SELECT COUNT(*) AS count
     FROM trainer_feedback f
     JOIN trainer_client_links l
       ON l.trainer_user_id = f.trainer_user_id
      AND l.client_user_id = f.client_user_id
      AND l.status = 'active'
     WHERE f.client_user_id = ? AND f.created_at > ?`,
    userId,
    clientSince,
    ),
    get(
    `SELECT COUNT(*) AS count
     FROM trainer_pt_sessions p
     JOIN trainer_client_links l
       ON l.trainer_user_id = p.trainer_user_id
      AND l.client_user_id = p.client_user_id
      AND l.status = 'active'
     WHERE p.client_user_id = ? AND p.created_at > ?`,
    userId,
    clientSince,
    ),
    get(
    `SELECT COUNT(*) AS count
     FROM coaching_comments c
     JOIN trainer_client_links l
       ON l.trainer_user_id = c.trainer_user_id
      AND l.client_user_id = c.client_user_id
      AND l.status = 'active'
     WHERE (c.client_user_id = ? OR c.trainer_user_id = ?)
       AND c.author_user_id != ?
       AND c.created_at > ?`,
    userId,
    userId,
    userId,
    clientSince,
    ),
    get(
    `SELECT COUNT(*) AS count
     FROM coaching_tasks t
     JOIN trainer_client_links l
       ON l.trainer_user_id = t.trainer_user_id
      AND l.client_user_id = t.client_user_id
      AND l.status = 'active'
     WHERE t.client_user_id = ? AND COALESCE(t.updated_at, t.created_at) > ?`,
    userId,
    clientSince,
    ),
    get(
    `SELECT COUNT(*) AS count
     FROM trainer_client_links
     WHERE trainer_user_id = ?
       AND status = 'pending'
       AND COALESCE(updated_at, created_at) > ?`,
    userId,
    trainerSince,
    ),
  ]);
  const counts = {
    feedback: Number(feedback?.count ?? 0),
    ptSessions: Number(ptSessions?.count ?? 0),
    comments: Number(comments?.count ?? 0),
    tasks: Number(tasks?.count ?? 0),
    requests: Number(requests?.count ?? 0),
  };
  const coachingUnreadCount = counts.feedback + counts.ptSessions + counts.comments + counts.tasks;
  const trainerUnreadCount = counts.requests;
  return {
    ...counts,
    coachingUnreadCount,
    trainerUnreadCount,
    unreadCount: coachingUnreadCount + trainerUnreadCount,
    clientLastReadAt: clientSince,
    trainerLastReadAt: trainerSince,
    lastReadAt: clientSince,
  };
}

export async function isTrainerLinkedToClient(trainerUserId: number, clientUserId: number): Promise<boolean> {
  await ensureTrainerTables();
  const row = await get(
    "SELECT id FROM trainer_client_links WHERE trainer_user_id = ? AND client_user_id = ? AND status = 'active' LIMIT 1",
    trainerUserId,
    clientUserId,
  );
  return Boolean(row);
}

export async function getTrainerClients(trainerUserId: number): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       l.id AS link_id,
       l.created_at AS connected_at,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url,
       MAX(COALESCE(ws.workoutDate, ws.startedAt)) AS last_workout_at,
       COUNT(ws.id) AS session_count
     FROM trainer_client_links l
     JOIN users u ON u.id = l.client_user_id
     LEFT JOIN workout_sessions ws ON ws.userId = l.client_user_id
     WHERE l.trainer_user_id = ? AND l.status = 'active'
     GROUP BY l.id, l.created_at, u.id, u.name, u.email, u.profileImageUrl
     ORDER BY connected_at DESC`,
    trainerUserId,
  );
  return rows.map((row) => ({
    linkId: Number(aliasValue(row, "link_id")),
    connectedAt: aliasValue(row, "connected_at"),
    user: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
      profileImageUrl: aliasValue(row, "user_profile_image_url"),
    }),
    lastWorkoutAt: aliasValue(row, "last_workout_at"),
    sessionCount: Number(aliasValue(row, "session_count")) || 0,
  }));
}

export async function getTrainerClientRequests(trainerUserId: number): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       l.id AS link_id,
       l.created_at AS connected_at,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url
     FROM trainer_client_links l
     JOIN users u ON u.id = l.client_user_id
     WHERE l.trainer_user_id = ? AND l.status = 'pending'
     ORDER BY connected_at DESC`,
    trainerUserId,
  );
  return rows.map((row) => ({
    linkId: Number(aliasValue(row, "link_id")),
    connectedAt: aliasValue(row, "connected_at"),
    user: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
      profileImageUrl: aliasValue(row, "user_profile_image_url"),
    }),
  }));
}

export async function getClientTrainers(clientUserId: number): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       l.id AS link_id,
       l.created_at AS connected_at,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url
     FROM trainer_client_links l
     JOIN users u ON u.id = l.trainer_user_id
     WHERE l.client_user_id = ? AND l.status = 'active'
     ORDER BY connected_at DESC`,
    clientUserId,
  );
  return rows.map((row) => ({
    linkId: Number(aliasValue(row, "link_id")),
    connectedAt: aliasValue(row, "connected_at"),
    trainer: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
      profileImageUrl: aliasValue(row, "user_profile_image_url"),
    }),
  }));
}

export async function getPendingClientTrainerLinks(clientUserId: number): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       l.id AS link_id,
       l.created_at AS connected_at,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url
     FROM trainer_client_links l
     JOIN users u ON u.id = l.trainer_user_id
     WHERE l.client_user_id = ? AND l.status = 'pending'
     ORDER BY connected_at DESC`,
    clientUserId,
  );
  return rows.map((row) => ({
    linkId: Number(aliasValue(row, "link_id")),
    connectedAt: aliasValue(row, "connected_at"),
    trainer: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
      profileImageUrl: aliasValue(row, "user_profile_image_url"),
    }),
  }));
}

export async function addTrainerFeedback(trainerUserId: number, clientUserId: number, message: string, sessionId?: number): Promise<number> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원에게만 피드백할 수 있습니다.");
  }
  const result = await run(
    "INSERT INTO trainer_feedback (trainer_user_id, client_user_id, session_id, message, created_at) VALUES (?, ?, ?, ?, ?)",
    trainerUserId,
    clientUserId,
    sessionId ?? null,
    message.trim(),
    new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function getTrainerFeedbackForClient(clientUserId: number, limit = 20): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       f.id,
       f.session_id,
       f.message,
       f.created_at,
       u.id AS trainer_id,
       u.name AS trainer_name,
       u.email AS trainer_email,
       u.profileImageUrl AS trainer_profile_image_url
     FROM trainer_feedback f
     JOIN users u ON u.id = f.trainer_user_id
     WHERE f.client_user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ?`,
    clientUserId,
    limit,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    sessionId: row.session_id ? Number(row.session_id) : null,
    message: row.message,
    createdAt: row.created_at,
    trainer: normalizeUser({
      id: Number(aliasValue(row, "trainer_id")),
      name: aliasValue(row, "trainer_name"),
      email: aliasValue(row, "trainer_email"),
      profileImageUrl: aliasValue(row, "trainer_profile_image_url"),
    }),
  }));
}

export async function getTrainerFeedbackForPair(trainerUserId: number, clientUserId: number, limit = 30): Promise<Row[]> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 피드백만 확인할 수 있습니다.");
  }
  const rows = await all(
    `SELECT
       f.id,
       f.session_id,
       f.message,
       f.created_at
     FROM trainer_feedback f
     WHERE f.trainer_user_id = ? AND f.client_user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ?`,
    trainerUserId,
    clientUserId,
    limit,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    sessionId: row.session_id ? Number(row.session_id) : null,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function addTrainerPtSession(
  trainerUserId: number,
  clientUserId: number,
  sessionId: number,
  title: string,
  notes?: string,
): Promise<number> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원에게만 PT 기록을 남길 수 있습니다.");
  }
  const result = await run(
    `INSERT INTO trainer_pt_sessions
     (trainer_user_id, client_user_id, session_id, title, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    trainerUserId,
    clientUserId,
    sessionId,
    title.trim() || "PT 운동 기록",
    notes?.trim() || null,
    new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function getTrainerPtSessionsForPair(trainerUserId: number, clientUserId: number, limit = 20): Promise<Row[]> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 PT 기록만 확인할 수 있습니다.");
  }
  const rows = await all(
    `SELECT
       p.id AS pt_id,
       p.session_id,
       p.title,
       p.notes AS pt_notes,
       p.created_at AS pt_created_at,
       ws.name AS session_name,
       ws.workoutDate AS workout_date,
       ws.durationMinutes AS duration_minutes,
       ws.totalVolume AS total_volume
     FROM trainer_pt_sessions p
     JOIN workout_sessions ws ON ws.id = p.session_id
     WHERE p.trainer_user_id = ? AND p.client_user_id = ?
     ORDER BY p.created_at DESC
     LIMIT ?`,
    trainerUserId,
    clientUserId,
    limit,
  );
  return await Promise.all(rows.map(async (row) => {
    const sessionId = Number(aliasValue(row, "session_id"));
    const logs = sessionId ? await getWorkoutLogsBySession(sessionId) : [];
    return {
      id: Number(aliasValue(row, "pt_id")),
      sessionId,
      title: aliasValue(row, "title"),
      notes: aliasValue(row, "pt_notes"),
      createdAt: aliasValue(row, "pt_created_at"),
      sessionName: aliasValue(row, "session_name"),
      workoutDate: aliasValue(row, "workout_date"),
      durationMinutes: Number(aliasValue(row, "duration_minutes")) || 0,
      totalVolume: Number(aliasValue(row, "total_volume")) || 0,
      logs,
    };
  }));
}

export async function getTrainerPtSessionsForClient(clientUserId: number, limit = 20): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       p.id AS pt_id,
       p.session_id,
       p.title,
       p.notes AS pt_notes,
       p.created_at AS pt_created_at,
       ws.name AS session_name,
       ws.workoutDate AS workout_date,
       ws.durationMinutes AS duration_minutes,
       ws.totalVolume AS total_volume,
       u.id AS trainer_id,
       u.name AS trainer_name,
       u.email AS trainer_email,
       u.profileImageUrl AS trainer_profile_image_url
     FROM trainer_pt_sessions p
     JOIN workout_sessions ws ON ws.id = p.session_id
     JOIN users u ON u.id = p.trainer_user_id
     JOIN trainer_client_links l
       ON l.trainer_user_id = p.trainer_user_id
      AND l.client_user_id = p.client_user_id
      AND l.status = 'active'
     WHERE p.client_user_id = ?
     ORDER BY p.created_at DESC
     LIMIT ?`,
    clientUserId,
    limit,
  );
  return await Promise.all(rows.map(async (row) => {
    const sessionId = Number(aliasValue(row, "session_id"));
    const logs = sessionId ? await getWorkoutLogsBySession(sessionId) : [];
    return {
      id: Number(aliasValue(row, "pt_id")),
      sessionId,
      title: aliasValue(row, "title"),
      notes: aliasValue(row, "pt_notes"),
      createdAt: aliasValue(row, "pt_created_at"),
      sessionName: aliasValue(row, "session_name"),
      workoutDate: aliasValue(row, "workout_date"),
      durationMinutes: Number(aliasValue(row, "duration_minutes")) || 0,
      totalVolume: Number(aliasValue(row, "total_volume")) || 0,
      logs,
      trainer: normalizeUser({
        id: Number(aliasValue(row, "trainer_id")),
        name: aliasValue(row, "trainer_name"),
        email: aliasValue(row, "trainer_email"),
        profileImageUrl: aliasValue(row, "trainer_profile_image_url"),
      }),
    };
  }));
}

async function assertLinkedPairForAuthor(authorUserId: number, trainerUserId: number, clientUserId: number) {
  if (authorUserId !== trainerUserId && authorUserId !== clientUserId) {
    throw new Error("해당 코칭 대화에 접근할 수 없습니다.");
  }
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 트레이너와 회원만 사용할 수 있습니다.");
  }
}

function normalizeCoachingComment(row: Row): Row {
  return {
    id: Number(row.id),
    trainerUserId: Number(aliasValue(row, "trainer_user_id")),
    clientUserId: Number(aliasValue(row, "client_user_id")),
    authorUserId: Number(aliasValue(row, "author_user_id")),
    targetType: aliasValue(row, "target_type"),
    targetId: aliasValue(row, "target_id") ? Number(aliasValue(row, "target_id")) : null,
    message: row.message,
    createdAt: aliasValue(row, "created_at"),
    author: normalizeUser({
      id: Number(aliasValue(row, "author_id")),
      name: aliasValue(row, "author_name"),
      email: aliasValue(row, "author_email"),
      profileImageUrl: aliasValue(row, "author_profile_image_url"),
    }),
  };
}

export async function addCoachingComment(input: {
  trainerUserId: number;
  clientUserId: number;
  authorUserId: number;
  targetType?: string;
  targetId?: number;
  message: string;
}): Promise<number> {
  await ensureTrainerTables();
  await assertLinkedPairForAuthor(input.authorUserId, input.trainerUserId, input.clientUserId);
  const result = await run(
    `INSERT INTO coaching_comments
     (trainer_user_id, client_user_id, author_user_id, target_type, target_id, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.trainerUserId,
    input.clientUserId,
    input.authorUserId,
    input.targetType ?? "general",
    input.targetId ?? null,
    input.message.trim(),
    new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function getCoachingCommentsForClient(clientUserId: number, limit = 50): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       c.*,
       u.id AS author_id,
       u.name AS author_name,
       u.email AS author_email,
       u.profileImageUrl AS author_profile_image_url
     FROM coaching_comments c
     JOIN users u ON u.id = c.author_user_id
     JOIN trainer_client_links l
       ON l.trainer_user_id = c.trainer_user_id
      AND l.client_user_id = c.client_user_id
      AND l.status = 'active'
     WHERE c.client_user_id = ?
     ORDER BY c.created_at DESC
     LIMIT ?`,
    clientUserId,
    limit,
  );
  return rows.map(normalizeCoachingComment);
}

export async function getCoachingCommentsForPair(trainerUserId: number, clientUserId: number, limit = 80): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 코칭 대화만 확인할 수 있습니다.");
  }
  const rows = await all(
    `SELECT
       c.*,
       u.id AS author_id,
       u.name AS author_name,
       u.email AS author_email,
       u.profileImageUrl AS author_profile_image_url
     FROM coaching_comments c
     JOIN users u ON u.id = c.author_user_id
     WHERE c.trainer_user_id = ? AND c.client_user_id = ?
     ORDER BY c.created_at DESC
     LIMIT ?`,
    trainerUserId,
    clientUserId,
    limit,
  );
  return rows.map(normalizeCoachingComment);
}

function normalizeCoachingTask(row: Row): Row {
  return {
    id: Number(row.id),
    trainerUserId: Number(aliasValue(row, "trainer_user_id")),
    clientUserId: Number(aliasValue(row, "client_user_id")),
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    dueDate: aliasValue(row, "due_date"),
    completedAt: aliasValue(row, "completed_at"),
    createdAt: aliasValue(row, "created_at"),
    updatedAt: aliasValue(row, "updated_at"),
  };
}

export async function addCoachingTask(trainerUserId: number, clientUserId: number, input: {
  title: string;
  description?: string;
  dueDate?: Date | string | null;
}): Promise<number> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원에게만 과제를 남길 수 있습니다.");
  }
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO coaching_tasks
     (trainer_user_id, client_user_id, title, description, status, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    trainerUserId,
    clientUserId,
    input.title.trim(),
    input.description?.trim() ?? null,
    "open",
    toDbDate(input.dueDate) ?? null,
    now,
    now,
  );
  return getInsertId(result);
}

export async function updateCoachingTaskStatus(authorUserId: number, taskId: number, status: "open" | "done"): Promise<void> {
  await ensureTrainerTables();
  const task = await get("SELECT * FROM coaching_tasks WHERE id = ? LIMIT 1", taskId);
  if (!task) throw new Error("과제를 찾을 수 없습니다.");
  await assertLinkedPairForAuthor(authorUserId, Number(task.trainer_user_id), Number(task.client_user_id));
  await run(
    "UPDATE coaching_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    status,
    status === "done" ? new Date().toISOString() : null,
    new Date().toISOString(),
    taskId,
  );
}

export async function getCoachingTasksForClient(clientUserId: number, limit = 50): Promise<Row[]> {
  await ensureTrainerTables();
  const rows = await all(
    `SELECT t.*
     FROM coaching_tasks t
     JOIN trainer_client_links l
       ON l.trainer_user_id = t.trainer_user_id
      AND l.client_user_id = t.client_user_id
      AND l.status = 'active'
     WHERE t.client_user_id = ?
     ORDER BY t.status ASC, COALESCE(t.due_date, t.created_at) ASC
     LIMIT ?`,
    clientUserId,
    limit,
  );
  return rows.map(normalizeCoachingTask);
}

export async function getCoachingTasksForPair(trainerUserId: number, clientUserId: number, limit = 50): Promise<Row[]> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 과제만 확인할 수 있습니다.");
  }
  const rows = await all(
    `SELECT * FROM coaching_tasks
     WHERE trainer_user_id = ? AND client_user_id = ?
     ORDER BY status ASC, COALESCE(due_date, created_at) ASC
     LIMIT ?`,
    trainerUserId,
    clientUserId,
    limit,
  );
  return rows.map(normalizeCoachingTask);
}

export async function upsertTrainerClientNote(trainerUserId: number, clientUserId: number, note: string): Promise<void> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원에게만 메모를 남길 수 있습니다.");
  }
  const existing = await get(
    "SELECT id FROM trainer_client_notes WHERE trainer_user_id = ? AND client_user_id = ? LIMIT 1",
    trainerUserId,
    clientUserId,
  );
  const now = new Date().toISOString();
  if (existing?.id) {
    await run("UPDATE trainer_client_notes SET note = ?, updated_at = ? WHERE id = ?", note.trim(), now, existing.id);
    return;
  }
  await run(
    "INSERT INTO trainer_client_notes (trainer_user_id, client_user_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    trainerUserId,
    clientUserId,
    note.trim(),
    now,
    now,
  );
}

export async function getTrainerClientNote(trainerUserId: number, clientUserId: number): Promise<Row | null> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 메모만 확인할 수 있습니다.");
  }
  const row = await get(
    "SELECT * FROM trainer_client_notes WHERE trainer_user_id = ? AND client_user_id = ? LIMIT 1",
    trainerUserId,
    clientUserId,
  );
  return row ? {
    id: Number(row.id),
    note: row.note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } : null;
}

export async function getTrainerClientReport(trainerUserId: number, clientUserId: number): Promise<Row> {
  await ensureTrainerTables();
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 리포트만 확인할 수 있습니다.");
  }
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 28);
  const sessions = await getSessionsInDateRange(clientUserId, from, now);
  const volume = await getWorkoutVolumeInDateRange(clientUserId, from, now);
  const tasks = await getCoachingTasksForPair(trainerUserId, clientUserId, 100);
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  return {
    periodDays: 28,
    sessionCount: sessions.length,
    totalVolume: volume,
    totalDurationMinutes: sessions.reduce((sum, session) => sum + (Number(session.durationMinutes) || 0), 0),
    openTasks,
    completedTasks,
    lastWorkoutAt: sessions[0]?.workoutDate ?? sessions[0]?.startedAt ?? null,
  };
}

export async function getLinkedClientWorkoutSessions(trainerUserId: number, clientUserId: number, limit = 10): Promise<Row[]> {
  if (!(await isTrainerLinkedToClient(trainerUserId, clientUserId))) {
    throw new Error("연결된 회원의 기록만 확인할 수 있습니다.");
  }
  return getWorkoutSessionsByUser(clientUserId, limit);
}

export async function listApprovedTrainers(): Promise<Row[]> {
  await ensureTrainerTables();
  await ensureUserProfileImageColumn();
  const rows = await all(
    `SELECT
       a.id AS application_id,
       a.display_name,
       a.specialties,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.profileImageUrl AS user_profile_image_url,
       tc.code AS trainer_code,
       COUNT(l.id) AS client_count
     FROM trainer_applications a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN trainer_codes tc ON tc.trainer_user_id = a.user_id AND tc.is_active = ?
     LEFT JOIN trainer_client_links l ON l.trainer_user_id = a.user_id AND l.status = 'active'
     WHERE a.status = 'approved'
     GROUP BY a.id, a.display_name, a.specialties, u.id, u.name, u.email, u.profileImageUrl, tc.code
     ORDER BY a.updated_at DESC`,
    true,
  );
  return rows.map((row) => ({
    applicationId: Number(aliasValue(row, "application_id")),
    displayName: row.display_name,
    specialties: parseJson(row.specialties, []),
    code: aliasValue(row, "trainer_code"),
    clientCount: Number(aliasValue(row, "client_count")) || 0,
    user: normalizeUser({
      id: Number(aliasValue(row, "user_id")),
      name: aliasValue(row, "user_name"),
      email: aliasValue(row, "user_email"),
      profileImageUrl: aliasValue(row, "user_profile_image_url"),
    }),
  }));
}

export async function getRoutinesByUser(userId: number): Promise<Row[]> {
  return (await all("SELECT * FROM routines WHERE userId = ? ORDER BY createdAt DESC", userId))
    .map((routine) => ({ ...routine, isPublic: Boolean(routine.isPublic) }));
}

export async function getRoutineById(id: number): Promise<Row | null> {
  const routine = await get("SELECT * FROM routines WHERE id = ? LIMIT 1", id);
  return routine ? { ...routine, isPublic: Boolean(routine.isPublic) } : null;
}

export async function createRoutine(userId: number, input: {
  name: string;
  description?: string;
  goal: string;
  daysPerWeek: number;
}): Promise<any> {
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO routines (userId, name, description, goal, daysPerWeek, isPublic, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    input.name,
    input.description ?? null,
    input.goal,
    input.daysPerWeek,
    false,
    now,
    now,
  );
  return getInsertId(result);
}

export async function updateRoutine(id: number, input: Row): Promise<any> {
  const allowed = ["name", "description", "goal", "daysPerWeek"];
  const keys = allowed.filter((key) => key in input);
  if (!keys.length) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  await run(
    `UPDATE routines SET ${assignments}, updatedAt = ? WHERE id = ?`,
    ...keys.map((key) => input[key] ?? null),
    new Date().toISOString(),
    id,
  );
}

export async function deleteRoutine(id: number): Promise<any> {
  await run("DELETE FROM routine_exercises WHERE routineId = ?", id);
  await run("DELETE FROM routines WHERE id = ?", id);
}

export async function getRoutineExercises(routineId: number): Promise<Row[]> {
  return (await all(
    `SELECT
       re.id AS re_id, re.routineId AS re_routineId, re.exerciseId AS re_exerciseId, re."order" AS re_order,
       re.sets AS re_sets, re.reps AS re_reps, re.weightKg AS re_weightKg, re.restSeconds AS re_restSeconds,
       re.setDetails AS re_setDetails, re.notes AS re_notes,
       e.*
     FROM routine_exercises re
     JOIN exercises e ON re.exerciseId = e.id
     WHERE re.routineId = ?
     ORDER BY re."order"`,
    routineId,
  )).map((row) => ({
    routineExercise: normalizeRoutineExercise({
      id: aliasValue(row, "re_id"),
      routineId: aliasValue(row, "re_routineId"),
      exerciseId: aliasValue(row, "re_exerciseId"),
      order: aliasValue(row, "re_order"),
      sets: aliasValue(row, "re_sets"),
      reps: aliasValue(row, "re_reps"),
      weightKg: aliasValue(row, "re_weightKg"),
      restSeconds: aliasValue(row, "re_restSeconds"),
      setDetails: aliasValue(row, "re_setDetails"),
      notes: aliasValue(row, "re_notes"),
    }),
    exercise: normalizeExercise(row),
  }));
}

export async function addExerciseToRoutine(
  routineId: number,
  exerciseId: number,
  order: number,
  sets: number,
  reps: number,
  restSeconds: number,
  setDetails?: { setNumber: number; weightKg?: number; reps?: number }[],
): Promise<any> {
  const result = await run(
    `INSERT INTO routine_exercises (routineId, exerciseId, "order", sets, reps, restSeconds, setDetails)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    routineId,
    exerciseId,
    order,
    sets,
    reps,
    restSeconds,
    JSON.stringify(setDetails ?? []),
  );
  return getInsertId(result);
}

export async function getRoutineExerciseById(id: number): Promise<Row | null> {
  return await get(
    `SELECT re.*, r.userId
     FROM routine_exercises re
     JOIN routines r ON re.routineId = r.id
     WHERE re.id = ?
     LIMIT 1`,
    id,
  );
}

export async function updateRoutineExercise(
  id: number,
  input: {
    exerciseId?: number;
    sets?: number;
    reps?: number;
    restSeconds?: number;
    setDetails?: { setNumber: number; weightKg?: number; reps?: number }[];
    notes?: string | null;
  },
): Promise<any> {
  const allowed = ["exerciseId", "sets", "reps", "restSeconds", "setDetails", "notes"] as const;
  const keys = allowed.filter((key) => key in input);
  if (!keys.length) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => {
    const value = input[key];
    return key === "setDetails" ? JSON.stringify(value ?? []) : value ?? null;
  });
  await run(`UPDATE routine_exercises SET ${assignments} WHERE id = ?`, ...values, id);
}

export async function reorderRoutineExercises(
  routineId: number,
  items: { id: number; order: number }[],
): Promise<void> {
  for (const item of items) {
    await run(
      `UPDATE routine_exercises SET "order" = ? WHERE id = ? AND routineId = ?`,
      item.order,
      item.id,
      routineId,
    );
  }
}

export async function removeExerciseFromRoutine(id: number): Promise<any> {
  await run("DELETE FROM routine_exercises WHERE id = ?", id);
}

export async function createWorkoutSession(userId: number, input: {
  routineId?: number;
  name?: string;
  workoutDate?: Date;
}): Promise<any> {
  const workoutDate = toDbDate(input.workoutDate) ?? new Date().toISOString();
  const result = await run(
    `INSERT INTO workout_sessions
     (userId, routineId, name, startedAt, workoutDate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    input.routineId ?? null,
    input.name ?? "자유 운동 세션",
    workoutDate,
    workoutDate,
    new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function getWorkoutSessionById(id: number): Promise<Row | null> {
  return await get("SELECT * FROM workout_sessions WHERE id = ? LIMIT 1", id);
}

async function recalculateWorkoutSessionVolume(sessionId: number): Promise<number> {
  const logs = await all("SELECT reps, weightKg FROM workout_logs WHERE sessionId = ?", sessionId);
  const totalVolume = logs.reduce((sum, log) => {
    const reps = Number(log.reps) || 0;
    const weightKg = Number(log.weightKg) || 0;
    return sum + reps * weightKg;
  }, 0);
  await run("UPDATE workout_sessions SET totalVolume = ? WHERE id = ?", totalVolume, sessionId);
  return totalVolume;
}

export async function completeWorkoutSession(sessionId: number, durationMinutes: number, notes?: string): Promise<any> {
  await run(
    `UPDATE workout_sessions
     SET completedAt = ?, durationMinutes = ?, notes = ?
     WHERE id = ?`,
    new Date().toISOString(),
    durationMinutes,
    notes ?? null,
    sessionId,
  );
}

export async function updateWorkoutSession(sessionId: number, input: {
  name?: string;
  workoutDate?: Date;
  durationMinutes: number;
  notes?: string;
  logs: Row[];
}): Promise<void> {
  const workoutDate = toDbDate(input.workoutDate);
  await run("DELETE FROM workout_logs WHERE sessionId = ?", sessionId);
  const createdAt = new Date().toISOString();
  await Promise.all(input.logs.map((log) =>
    run(
      `INSERT INTO workout_logs
       (sessionId, exerciseId, setNumber, reps, weightKg, durationSeconds, distanceM, isWarmup, rpe, memo, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      log.exerciseId,
      log.setNumber,
      log.reps ?? null,
      log.weightKg ?? null,
      log.durationSeconds ?? null,
      log.distanceM ?? null,
      Boolean(log.isWarmup),
      log.rpe ?? null,
      log.memo ?? null,
      log.notes ?? null,
      createdAt,
    )
  ));
  const totalVolume = input.logs.reduce(
    (sum, log) => sum + (Number(log.reps) || 0) * (Number(log.weightKg) || 0),
    0,
  );
  await run(
    `UPDATE workout_sessions
     SET name = COALESCE(?, name),
         workoutDate = COALESCE(?, workoutDate), startedAt = COALESCE(?, startedAt),
         completedAt = ?, durationMinutes = ?, notes = ?, totalVolume = ?
     WHERE id = ?`,
    input.name?.trim() || null,
    workoutDate,
    workoutDate,
    new Date().toISOString(),
    input.durationMinutes,
    input.notes ?? null,
    totalVolume,
    sessionId,
  );
}

export async function deleteWorkoutSession(sessionId: number): Promise<void> {
  await run("DELETE FROM workout_logs WHERE sessionId = ?", sessionId);
  await run("DELETE FROM workout_sessions WHERE id = ?", sessionId);
}

export async function addWorkoutLog(input: Row): Promise<any> {
  const volumeDelta = (Number(input.reps) || 0) * (Number(input.weightKg) || 0);
  const result = await run(
    `INSERT INTO workout_logs
     (sessionId, exerciseId, setNumber, reps, weightKg, durationSeconds, distanceM, isWarmup, rpe, memo, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.sessionId,
    input.exerciseId,
    input.setNumber,
    input.reps ?? null,
    input.weightKg ?? null,
    input.durationSeconds ?? null,
    input.distanceM ?? null,
    Boolean(input.isWarmup),
    input.rpe ?? null,
    input.memo ?? null,
    input.notes ?? null,
    new Date().toISOString(),
  );
  if (volumeDelta) {
    await run(
      "UPDATE workout_sessions SET totalVolume = COALESCE(totalVolume, 0) + ? WHERE id = ?",
      volumeDelta,
      input.sessionId,
    );
  }
  return getInsertId(result);
}

export async function deleteWorkoutLog(logId: number): Promise<any> {
  const log = await get("SELECT sessionId, reps, weightKg FROM workout_logs WHERE id = ? LIMIT 1", logId);
  await run("DELETE FROM workout_logs WHERE id = ?", logId);
  if (log?.sessionId) {
    const volumeDelta = (Number(log.reps) || 0) * (Number(log.weightKg) || 0);
    if (volumeDelta) {
      await run(
        `UPDATE workout_sessions
         SET totalVolume = CASE
           WHEN COALESCE(totalVolume, 0) - ? < 0 THEN 0
           ELSE COALESCE(totalVolume, 0) - ?
         END
         WHERE id = ?`,
        volumeDelta,
        volumeDelta,
        log.sessionId,
      );
    }
  }
}

export async function getWorkoutLogsBySession(sessionId: number): Promise<Row[]> {
  return (await all(
    `SELECT
       wl.id AS wl_id, wl.sessionId AS wl_sessionId, wl.exerciseId AS wl_exerciseId, wl.setNumber AS wl_setNumber,
       wl.reps AS wl_reps, wl.weightKg AS wl_weightKg, wl.durationSeconds AS wl_durationSeconds,
       wl.distanceM AS wl_distanceM, wl.isWarmup AS wl_isWarmup, wl.rpe AS wl_rpe, wl.memo AS wl_memo,
       wl.notes AS wl_notes, wl.createdAt AS wl_createdAt,
       e.*
     FROM workout_logs wl
     JOIN exercises e ON wl.exerciseId = e.id
     WHERE wl.sessionId = ?
     ORDER BY wl.exerciseId, wl.setNumber`,
    sessionId,
  )).map((row) => ({
    log: {
      id: aliasValue(row, "wl_id"),
      sessionId: aliasValue(row, "wl_sessionId"),
      exerciseId: aliasValue(row, "wl_exerciseId"),
      setNumber: aliasValue(row, "wl_setNumber"),
      reps: aliasValue(row, "wl_reps"),
      weightKg: aliasValue(row, "wl_weightKg"),
      durationSeconds: aliasValue(row, "wl_durationSeconds"),
      distanceM: aliasValue(row, "wl_distanceM"),
      isWarmup: Boolean(aliasValue(row, "wl_isWarmup")),
      rpe: aliasValue(row, "wl_rpe"),
      memo: aliasValue(row, "wl_memo"),
      notes: aliasValue(row, "wl_notes"),
      createdAt: aliasValue(row, "wl_createdAt"),
    },
    exercise: normalizeExercise(row),
  }));
}

function normalizeWorkoutLogRow(row: Row): Row {
  return {
    log: {
      id: aliasValue(row, "wl_id"),
      sessionId: aliasValue(row, "wl_sessionId"),
      exerciseId: aliasValue(row, "wl_exerciseId"),
      setNumber: aliasValue(row, "wl_setNumber"),
      reps: aliasValue(row, "wl_reps"),
      weightKg: aliasValue(row, "wl_weightKg"),
      durationSeconds: aliasValue(row, "wl_durationSeconds"),
      distanceM: aliasValue(row, "wl_distanceM"),
      isWarmup: Boolean(aliasValue(row, "wl_isWarmup")),
      rpe: aliasValue(row, "wl_rpe"),
      memo: aliasValue(row, "wl_memo"),
      notes: aliasValue(row, "wl_notes"),
      createdAt: aliasValue(row, "wl_createdAt"),
    },
    exercise: normalizeExercise(row),
  };
}

export async function getWorkoutLogsBySessionIds(sessionIds: number[]): Promise<Map<number, Row[]>> {
  const uniqueIds = Array.from(new Set(sessionIds.filter((id) => Number.isFinite(id))));
  const grouped = new Map<number, Row[]>();
  for (const id of uniqueIds) grouped.set(id, []);
  if (uniqueIds.length === 0) return grouped;

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = await all(
    `SELECT
       wl.id AS wl_id, wl.sessionId AS wl_sessionId, wl.exerciseId AS wl_exerciseId, wl.setNumber AS wl_setNumber,
       wl.reps AS wl_reps, wl.weightKg AS wl_weightKg, wl.durationSeconds AS wl_durationSeconds,
       wl.distanceM AS wl_distanceM, wl.isWarmup AS wl_isWarmup, wl.rpe AS wl_rpe, wl.memo AS wl_memo,
       wl.notes AS wl_notes, wl.createdAt AS wl_createdAt,
       e.*
     FROM workout_logs wl
     JOIN exercises e ON wl.exerciseId = e.id
     WHERE wl.sessionId IN (${placeholders})
     ORDER BY wl.sessionId, wl.exerciseId, wl.setNumber`,
    ...uniqueIds,
  );

  for (const row of rows) {
    const sessionId = Number(aliasValue(row, "wl_sessionId"));
    const logs = grouped.get(sessionId) ?? [];
    logs.push(normalizeWorkoutLogRow(row));
    grouped.set(sessionId, logs);
  }
  return grouped;
}

export async function getWorkoutSessionsByUser(userId: number, limit = 20): Promise<Row[]> {
  return await all(
    `SELECT * FROM workout_sessions
     WHERE userId = ?
     ORDER BY COALESCE(workoutDate, startedAt) DESC, startedAt DESC
     LIMIT ?`,
    userId,
    limit,
  );
}

export async function getSessionsInDateRange(userId: number, from: Date, to: Date): Promise<Row[]> {
  return await all(
    `SELECT * FROM workout_sessions
     WHERE userId = ? AND COALESCE(workoutDate, startedAt) >= ? AND COALESCE(workoutDate, startedAt) <= ?
     ORDER BY COALESCE(workoutDate, startedAt)`,
    userId,
    from.toISOString(),
    to.toISOString(),
  );
}

async function getWorkoutVolumeInDateRange(userId: number, from?: Date, to?: Date): Promise<number> {
  const where = ["ws.userId = ?"];
  const params: any[] = [userId];
  if (from) {
    where.push("COALESCE(ws.workoutDate, ws.startedAt) >= ?");
    params.push(from.toISOString());
  }
  if (to) {
    where.push("COALESCE(ws.workoutDate, ws.startedAt) <= ?");
    params.push(to.toISOString());
  }
  const row = await get(
    `SELECT COALESCE(SUM(COALESCE(wl.reps, 0) * COALESCE(wl.weightKg, 0)), 0) AS totalVolume
     FROM workout_sessions ws
     LEFT JOIN workout_logs wl ON wl.sessionId = ws.id
     WHERE ${where.join(" AND ")}`,
    ...params,
  );
  return Number(row?.totalVolume) || 0;
}

export async function getWorkoutSessionVolumeRows(userId: number): Promise<Row[]> {
  return await all(
    `SELECT
       ws.id,
       COALESCE(ws.workoutDate, ws.startedAt) AS session_date,
       ws.durationMinutes AS duration_minutes,
       CASE
         WHEN COALESCE(ws.totalVolume, 0) > 0 THEN ws.totalVolume
         ELSE COALESCE(SUM(COALESCE(wl.reps, 0) * COALESCE(wl.weightKg, 0)), 0)
       END AS total_volume
     FROM workout_sessions ws
     LEFT JOIN workout_logs wl ON wl.sessionId = ws.id
     WHERE ws.userId = ?
     GROUP BY ws.id, ws.workoutDate, ws.startedAt, ws.durationMinutes, ws.totalVolume
     ORDER BY COALESCE(ws.workoutDate, ws.startedAt) DESC, ws.startedAt DESC`,
    userId,
  );
}

export async function getUserStats(userId: number): Promise<Row> {
  const sessions = await getWorkoutSessionsByUser(userId, 1000);
  const weekStart = getWeekStart(new Date());
  const recentSessionCount = new Set(
    sessions
      .filter((session) => new Date(session.workoutDate ?? session.startedAt) >= weekStart)
      .map((session) => new Date(session.workoutDate ?? session.startedAt).toDateString()),
  ).size;

  return {
    totalSessions: sessions.length,
    recentSessionCount,
    totalVolume: await getWorkoutVolumeInDateRange(userId),
    totalDurationMinutes: sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
  };
}

export async function getWeeklyStats(userId: number): Promise<Row> {
  const goal = await getUserGoal(userId);
  const weeklyTarget = goal?.weeklyWorkouts ?? 3;
  const from = getWeekStart(new Date());
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setMilliseconds(to.getMilliseconds() - 1);

  const sessions = await getSessionsInDateRange(userId, from, to);
  const workoutsByDay = new Array<boolean>(7).fill(false);
  const completedDates = new Set<string>();

  for (const session of sessions) {
    const date = new Date(session.workoutDate ?? session.startedAt);
    workoutsByDay[date.getDay()] = true;
    completedDates.add(date.toDateString());
  }

  const completedDays = completedDates.size;
  return {
    weeklyTarget,
    completedDays,
    progress: Math.min(100, Math.round((completedDays / weeklyTarget) * 100)),
    totalVolume: await getWorkoutVolumeInDateRange(userId, from, to),
    totalDuration: sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
    workoutsByDay,
  };
}

export async function getExerciseHistory(userId: number, exerciseId: number, limit = 10): Promise<Row[]> {
  const rows = await all(
    `SELECT
       wl.*, COALESCE(ws.workoutDate, ws.startedAt, ws.completedAt, ws.createdAt) AS sessionDate, ws.id AS sessionId
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl.sessionId = ws.id
     WHERE ws.userId = ? AND wl.exerciseId = ?
     ORDER BY COALESCE(ws.workoutDate, ws.startedAt, ws.completedAt, ws.createdAt) DESC, wl.setNumber`,
    userId,
    exerciseId,
  );

  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const date = new Date(row.sessionDate);
    const dateKey = Number.isNaN(date.getTime()) ? String(row.sessionDate ?? row.sessionId) : date.toISOString().slice(0, 10);
    grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), row]);
  }

  return Array.from(grouped.values()).slice(0, limit).map((logs) => {
    const weightedLogs = logs.filter((log) => Number(log.weightKg) > 0);
    const averageWeight = weightedLogs.length
      ? weightedLogs.reduce((sum, log) => sum + Number(log.weightKg), 0) / weightedLogs.length
      : 0;
    return {
      date: logs[0].sessionDate,
      logs,
      maxWeight: Math.max(...logs.map((log) => log.weightKg ?? 0)),
      averageWeight: Math.round(averageWeight * 10) / 10,
      maxReps: Math.max(...logs.map((log) => log.reps ?? 0)),
      totalVolume: logs.reduce((sum, log) => sum + (log.weightKg ?? 0) * (log.reps ?? 0), 0),
      setCount: logs.length,
      sessionCount: new Set(logs.map((log) => log.sessionId)).size,
    };
  });
}

export async function getMonthlyStats(userId: number, months = 6): Promise<Row[]> {
  const sessions = await getWorkoutSessionsByUser(userId, 1000);
  const buckets = new Map<string, { month: string; count: number; totalVolume: number }>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    buckets.set(key, { month: `${date.getMonth() + 1}월`, count: 0, totalVolume: 0 });
  }

  for (const session of sessions) {
    const date = new Date(session.workoutDate ?? session.startedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
    }
  }

  const rows = await all(
    `SELECT
       COALESCE(ws.workoutDate, ws.startedAt) AS session_date,
       CASE
         WHEN COALESCE(ws.totalVolume, 0) > 0 THEN ws.totalVolume
         ELSE COALESCE(SUM(COALESCE(wl.reps, 0) * COALESCE(wl.weightKg, 0)), 0)
       END AS total_volume
     FROM workout_sessions ws
     LEFT JOIN workout_logs wl ON wl.sessionId = ws.id
     WHERE ws.userId = ?
     GROUP BY ws.id, ws.totalVolume, COALESCE(ws.workoutDate, ws.startedAt)`,
    userId,
  );
  for (const row of rows) {
    const date = new Date(aliasValue(row, "session_date"));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.totalVolume += Number(aliasValue(row, "total_volume")) || 0;
  }

  return Array.from(buckets.values());
}

export async function getWorkoutStreak(userId: number): Promise<Row> {
  const sessions = await getWorkoutSessionsByUser(userId, 1000);
  const days = Array.from(new Set(
    sessions.map((session) => new Date(session.workoutDate ?? session.startedAt).toDateString()),
  )).map((day) => new Date(day)).sort((a, b) => b.getTime() - a.getTime());

  let current = 0;
  let cursor = stripTime(new Date());
  const latestDay = days[0];
  if (latestDay?.getTime() !== undefined && latestDay.getTime() !== cursor.getTime()) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (const day of days) {
    if (day.getTime() === cursor.getTime()) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < cursor) {
      break;
    }
  }

  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of [...days].reverse()) {
    if (!previous || day.getTime() - previous.getTime() === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest, lastWorkoutDate: days[0] ?? null };
}

export async function checkPRs(userId: number, sessionId: number): Promise<any> {
  const session = await getWorkoutSessionById(sessionId);
  if (session?.userId !== userId) return [];
  return [];
}

export async function getFavorites(userId: number): Promise<Row[]> {
  return (await all(
    `SELECT
       ef.id AS fav_id, ef.userId AS fav_userId, ef.exerciseId AS fav_exerciseId, ef.createdAt AS fav_createdAt,
       e.*
     FROM exercise_favorites ef
     JOIN exercises e ON ef.exerciseId = e.id
     WHERE ef.userId = ?
     ORDER BY ef.createdAt DESC`,
    userId,
  )).map((row) => ({
    fav: {
      id: aliasValue(row, "fav_id"),
      userId: aliasValue(row, "fav_userId"),
      exerciseId: aliasValue(row, "fav_exerciseId"),
      createdAt: aliasValue(row, "fav_createdAt"),
    },
    ex: normalizeExercise(row),
  }));
}

export async function isFavorite(userId: number, exerciseId: number): Promise<boolean> {
  return Boolean(await get(
    "SELECT id FROM exercise_favorites WHERE userId = ? AND exerciseId = ? LIMIT 1",
    userId,
    exerciseId,
  ));
}

export async function toggleFavorite(userId: number, exerciseId: number): Promise<boolean> {
  if (await isFavorite(userId, exerciseId)) {
    await run("DELETE FROM exercise_favorites WHERE userId = ? AND exerciseId = ?", userId, exerciseId);
    return false;
  }
  await run(
    "INSERT INTO exercise_favorites (userId, exerciseId, createdAt) VALUES (?, ?, ?)",
    userId,
    exerciseId,
    new Date().toISOString(),
  );
  return true;
}

export async function upsertExerciseGoal(userId: number, exerciseId: number, input: {
  targetWeightKg?: number;
  targetReps?: number;
  notes?: string;
}): Promise<any> {
  const existing = await getExerciseProgress(userId, exerciseId);
  const now = new Date().toISOString();
  if (existing) {
    await run(
      `UPDATE exercise_goals
       SET targetWeightKg = ?, targetReps = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      input.targetWeightKg ?? null,
      input.targetReps ?? null,
      input.notes ?? null,
      now,
      existing.id,
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO exercise_goals (userId, exerciseId, targetWeightKg, targetReps, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userId,
    exerciseId,
    input.targetWeightKg ?? null,
    input.targetReps ?? null,
    input.notes ?? null,
    now,
    now,
  );
  return getInsertId(result);
}

export async function getExerciseProgress(userId: number, exerciseId: number): Promise<Row | null> {
  return await get(
    "SELECT * FROM exercise_goals WHERE userId = ? AND exerciseId = ? LIMIT 1",
    userId,
    exerciseId,
  );
}

export async function getBodyWeights(userId: number, limit = 30): Promise<Row[]> {
  return await all(
    "SELECT * FROM body_weights WHERE userId = ? ORDER BY recordedAt DESC LIMIT ?",
    userId,
    limit,
  );
}

export async function addBodyWeight(userId: number, input: {
  weightKg: number;
  bodyFatPct?: number;
  muscleMassPct?: number;
  notes?: string;
  recordedAt?: Date;
}): Promise<any> {
  const result = await run(
    `INSERT INTO body_weights (userId, weightKg, bodyFatPct, muscleMassPct, notes, recordedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userId,
    input.weightKg,
    input.bodyFatPct ?? null,
    input.muscleMassPct ?? null,
    input.notes ?? null,
    toDbDate(input.recordedAt) ?? new Date().toISOString(),
    new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function deleteBodyWeight(id: number, userId: number): Promise<any> {
  await run("DELETE FROM body_weights WHERE id = ? AND userId = ?", id, userId);
}

function getWeekStart(date: Date) {
  const start = stripTime(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
