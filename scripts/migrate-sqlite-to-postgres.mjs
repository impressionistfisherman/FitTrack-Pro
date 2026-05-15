import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sqlitePath = path.resolve(process.env.SQLITE_DB_PATH || "local-db/fittrack_local.sqlite");
if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite DB not found: ${sqlitePath}`);
  process.exit(1);
}

const schemaPath = path.resolve("scripts", "supabase-schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

const tables = [
  {
    name: "users",
    columns: ["id", "openId", "name", "email", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn"],
  },
  {
    name: "exercises",
    columns: [
      "id", "name", "nameKo", "bodyPart", "equipment", "category", "difficulty", "description", "descriptionKo",
      "primaryMuscles", "secondaryMuscles", "gifUrl", "secondaryImages", "instructions", "instructionsKo", "createdAt",
    ],
    jsonColumns: new Set(["primaryMuscles", "secondaryMuscles", "secondaryImages", "instructions", "instructionsKo"]),
  },
  {
    name: "user_goals",
    columns: ["id", "userId", "goal", "targetWeight", "weeklyWorkouts", "heightCm", "gender", "birthYear", "isActive", "createdAt", "updatedAt"],
    booleanColumns: new Set(["isActive"]),
  },
  {
    name: "routines",
    columns: ["id", "userId", "name", "description", "goal", "daysPerWeek", "isPublic", "createdAt", "updatedAt"],
    booleanColumns: new Set(["isPublic"]),
  },
  {
    name: "routine_exercises",
    columns: ["id", "routineId", "exerciseId", "order", "sets", "reps", "weightKg", "restSeconds", "setDetails", "notes"],
    jsonColumns: new Set(["setDetails"]),
  },
  {
    name: "workout_sessions",
    columns: ["id", "userId", "routineId", "name", "startedAt", "completedAt", "durationMinutes", "notes", "totalVolume", "workoutDate", "createdAt"],
  },
  {
    name: "workout_logs",
    columns: ["id", "sessionId", "exerciseId", "setNumber", "reps", "weightKg", "durationSeconds", "distanceM", "isWarmup", "rpe", "memo", "notes", "createdAt"],
    booleanColumns: new Set(["isWarmup"]),
  },
  {
    name: "exercise_favorites",
    columns: ["id", "userId", "exerciseId", "createdAt"],
  },
  {
    name: "body_weights",
    columns: ["id", "userId", "weightKg", "bodyFatPct", "muscleMassPct", "notes", "recordedAt", "createdAt"],
  },
  {
    name: "exercise_goals",
    columns: ["id", "userId", "exerciseId", "targetWeightKg", "targetReps", "notes", "createdAt", "updatedAt"],
  },
];

function quoteIdent(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function parseJson(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeValue(table, column, value) {
  if (value == null) return null;
  if (table.booleanColumns?.has(column)) return Boolean(value);
  if (table.jsonColumns?.has(column)) return JSON.stringify(parseJson(value));
  return value;
}

async function insertRows(pool, sqlite, table) {
  const rows = sqlite.prepare(`SELECT ${table.columns.map((column) => quoteIdent(column)).join(", ")} FROM ${table.name}`).all();
  if (!rows.length) {
    console.log(`${table.name}: 0 rows`);
    return;
  }

  const columnSql = table.columns.map(quoteIdent).join(", ");
  const placeholders = table.columns.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `INSERT INTO ${table.name} (${columnSql}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = table.columns.map((column) => normalizeValue(table, column, row[column]));
    await pool.query(sql, values);
  }

  await pool.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table.name}), 1), true)`,
    [table.name],
  );
  console.log(`${table.name}: ${rows.length} rows`);
}

const sqlite = new DatabaseSync(sqlitePath);
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  console.log(`Using SQLite DB: ${sqlitePath}`);
  await pool.query(schemaSql);

  for (const table of tables) {
    await insertRows(pool, sqlite, table);
  }

  console.log("SQLite data migrated to Postgres.");
} finally {
  sqlite.close();
  await pool.end();
}
