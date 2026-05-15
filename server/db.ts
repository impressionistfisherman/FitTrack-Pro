import path from "node:path";
import { createRequire } from "node:module";
import type { InsertUser } from "../drizzle/schema";
import mysql from "mysql2/promise";
import { Pool as PgPool } from "pg";

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
  const { DatabaseSync } = require("node:sqlite") as any;

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

function quotePostgresIdentifiers(sql: string) {
  return pgQuotedIdentifiers.reduce((current, identifier) => {
    const pattern = new RegExp(`(?<!["\\w])${identifier}(?!["\\w])`, "g");
    return current.replace(pattern, `"${identifier}"`);
  }, sql);
}

function preparePostgresSql(sql: string) {
  let text = quotePostgresIdentifiers(sql.trim());
  if (/^insert\s+/i.test(text) && !/\buser_preferences\b/i.test(text) && !/\breturning\b/i.test(text)) {
    text = `${text} RETURNING id`;
  }
  return text;
}

function buildQuery(sql: string, params: any[]): { text: string; values: any[] } {
  if (databaseType === "postgres") {
    let index = 0;
    return {
      text: preparePostgresSql(sql).replace(/\?/g, () => `$${++index}`),
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
  return params.map((param) => typeof param === "boolean" ? (param ? 1 : 0) : param);
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
    return (result as T | undefined) ?? null;
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

function bool(value: unknown) {
  return Boolean(value);
}

function normalizeExercise<T extends Row | null>(exercise: T): T {
  if (!exercise) return exercise;
  return {
    ...exercise,
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
  const displayName =
    typeof user.name === "string" && user.name.trim()
      ? user.name.trim()
      : typeof user.email === "string" && user.email.includes("@")
        ? user.email.split("@")[0]
        : "사용자";
  return {
    ...user,
    name: displayName,
    role: user.role ?? "user",
  };
}

export const db = pgPool ?? mysqlPool ?? sqlite;

export async function getUserByOpenId(openId: string): Promise<any> {
  return normalizeUser(await get("SELECT * FROM users WHERE openId = ? LIMIT 1", openId));
}

export async function getFirstUser(): Promise<any> {
  return normalizeUser(await get("SELECT * FROM users ORDER BY id LIMIT 1"));
}

export async function upsertUser(input: InsertUser): Promise<any> {
  const existing = await getUserByOpenId(input.openId);
  if (existing) {
    await run(
      `UPDATE users
       SET name = ?, email = ?, loginMethod = ?, lastSignedIn = ?, updatedAt = ?
       WHERE id = ?`,
      input.name ?? existing.name ?? null,
      input.email ?? existing.email ?? null,
      input.loginMethod ?? existing.loginMethod ?? null,
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
    input.role ?? "user",
    toDbDate(input.createdAt as any) ?? new Date().toISOString(),
    toDbDate(input.updatedAt as any) ?? new Date().toISOString(),
    toDbDate(input.lastSignedIn as any) ?? new Date().toISOString(),
  );
  return getInsertId(result);
}

export async function getExercises(filters?: {
  bodyPart?: string;
  equipment?: string;
  category?: string;
  search?: string;
}): Promise<Row[]> {
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
    where.push("(name LIKE ? OR nameKo LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const rows = await all(
    `SELECT * FROM exercises ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY nameKo`,
    ...params,
  );
  return rows.map((row) => normalizeExercise(row));
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
  return goal ? { ...goal, isActive: bool(goal.isActive) } : null;
}

export async function getUserGoals(userId: number): Promise<Row[]> {
  const goals = await all(
    `SELECT * FROM user_goals
     WHERE userId = ? AND isActive = ?
     ORDER BY createdAt DESC`,
    userId,
    true,
  );
  return goals.map((goal) => ({ ...goal, isActive: bool(goal.isActive) }));
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

export async function getRoutinesByUser(userId: number): Promise<Row[]> {
  return (await all("SELECT * FROM routines WHERE userId = ? ORDER BY createdAt DESC", userId))
    .map((routine) => ({ ...routine, isPublic: bool(routine.isPublic) }));
}

export async function getRoutineById(id: number): Promise<Row | null> {
  const routine = await get("SELECT * FROM routines WHERE id = ? LIMIT 1", id);
  return routine ? { ...routine, isPublic: bool(routine.isPublic) } : null;
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
  await run(
    `UPDATE routines SET ${keys.map((key) => `${key} = ?`).join(", ")}, updatedAt = ? WHERE id = ?`,
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
      id: row.re_id,
      routineId: row.re_routineId,
      exerciseId: row.re_exerciseId,
      order: row.re_order,
      sets: row.re_sets,
      reps: row.re_reps,
      weightKg: row.re_weightKg,
      restSeconds: row.re_restSeconds,
      setDetails: row.re_setDetails,
      notes: row.re_notes,
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

export async function completeWorkoutSession(sessionId: number, durationMinutes: number, notes?: string): Promise<any> {
  const logs = await all("SELECT reps, weightKg FROM workout_logs WHERE sessionId = ?", sessionId);
  const totalVolume = logs.reduce((sum, log) => sum + (log.reps ?? 0) * (log.weightKg ?? 0), 0);
  await run(
    `UPDATE workout_sessions
     SET completedAt = ?, durationMinutes = ?, notes = ?, totalVolume = ?
     WHERE id = ?`,
    new Date().toISOString(),
    durationMinutes,
    notes ?? null,
    totalVolume,
    sessionId,
  );
}

export async function addWorkoutLog(input: Row): Promise<any> {
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
  return getInsertId(result);
}

export async function deleteWorkoutLog(logId: number): Promise<any> {
  await run("DELETE FROM workout_logs WHERE id = ?", logId);
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
      id: row.wl_id,
      sessionId: row.wl_sessionId,
      exerciseId: row.wl_exerciseId,
      setNumber: row.wl_setNumber,
      reps: row.wl_reps,
      weightKg: row.wl_weightKg,
      durationSeconds: row.wl_durationSeconds,
      distanceM: row.wl_distanceM,
      isWarmup: bool(row.wl_isWarmup),
      rpe: row.wl_rpe,
      memo: row.wl_memo,
      notes: row.wl_notes,
      createdAt: row.wl_createdAt,
    },
    exercise: normalizeExercise(row),
  }));
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
    totalVolume: sessions.reduce((sum, session) => sum + (session.totalVolume ?? 0), 0),
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
  const workoutsByDay = Array(7).fill(false) as boolean[];
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
    totalVolume: sessions.reduce((sum, session) => sum + (session.totalVolume ?? 0), 0),
    totalDuration: sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
    workoutsByDay,
  };
}

export async function getExerciseHistory(userId: number, exerciseId: number, limit = 10): Promise<Row[]> {
  const rows = await all(
    `SELECT
       wl.*, ws.workoutDate AS sessionWorkoutDate, ws.startedAt AS sessionStartedAt, ws.id AS sessionId
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl.sessionId = ws.id
     WHERE ws.userId = ? AND wl.exerciseId = ?
     ORDER BY COALESCE(ws.workoutDate, ws.startedAt) DESC, wl.setNumber`,
    userId,
    exerciseId,
  );

  const grouped = new Map<number, Row[]>();
  for (const row of rows) {
    grouped.set(row.sessionId, [...(grouped.get(row.sessionId) ?? []), row]);
  }

  return Array.from(grouped.values()).slice(0, limit).map((logs) => ({
    date: logs[0].sessionWorkoutDate ?? logs[0].sessionStartedAt,
    logs,
    maxWeight: Math.max(...logs.map((log) => log.weightKg ?? 0)),
    maxReps: Math.max(...logs.map((log) => log.reps ?? 0)),
    totalVolume: logs.reduce((sum, log) => sum + (log.weightKg ?? 0) * (log.reps ?? 0), 0),
  }));
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
      bucket.totalVolume += session.totalVolume ?? 0;
    }
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
  if (days[0] && days[0].getTime() !== cursor.getTime()) {
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
  if (!session || session.userId !== userId) return [];
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
      id: row.fav_id,
      userId: row.fav_userId,
      exerciseId: row.fav_exerciseId,
      createdAt: row.fav_createdAt,
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
