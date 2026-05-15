import "dotenv/config";
import fs from "node:fs";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const canonicalExercises = JSON.parse(fs.readFileSync("local-db/json/exercises.json", "utf8"));
const canonicalByName = new Map(canonicalExercises.map((exercise) => [exercise.name, exercise]));

const referenceTables = [
  { table: "workout_logs", column: "exerciseId" },
  { table: "routine_exercises", column: "exerciseId" },
  { table: "exercise_favorites", column: "exerciseId" },
  { table: "exercise_goals", column: "exerciseId" },
];

function normalizeExerciseKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\(multiple response\)|\(single response\)|- medium grip/g, "")
    .replace(/rope jumping/g, "jump rope")
    .replace(/triceps/g, "tricep")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function jsonValue(value, fallback = []) {
  if (value == null || value === "") return JSON.stringify(fallback);
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(fallback);
    }
  }
  return JSON.stringify(value);
}

function exerciseValues(exercise) {
  return [
    exercise.name,
    exercise.nameKo,
    exercise.bodyPart,
    exercise.equipment,
    exercise.category,
    exercise.difficulty,
    exercise.description ?? null,
    exercise.descriptionKo ?? null,
    jsonValue(exercise.primaryMuscles),
    jsonValue(exercise.secondaryMuscles),
    exercise.gifUrl ?? null,
    jsonValue(exercise.secondaryImages),
    jsonValue(exercise.instructions),
    jsonValue(exercise.instructionsKo),
  ];
}

async function moveReferences(client, fromId, toId) {
  for (const ref of referenceTables) {
    await client.query(
      `UPDATE ${ref.table} SET "${ref.column}" = $1 WHERE "${ref.column}" = $2`,
      [toId, fromId],
    );
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const beforeCount = Number((await client.query("SELECT COUNT(*)::int AS count FROM exercises")).rows[0].count);
  const existing = (await client.query('SELECT id, name, "nameKo" FROM exercises ORDER BY id')).rows;
  const rowsByName = new Map();
  for (const row of existing) {
    const rows = rowsByName.get(row.name) ?? [];
    rows.push(row);
    rowsByName.set(row.name, rows);
  }

  let inserted = 0;
  let updated = 0;
  let merged = 0;

  for (const exercise of canonicalExercises) {
    const rows = rowsByName.get(exercise.name) ?? [];
    let keep = rows[0];

    if (!keep) {
      const insertedRow = await client.query(
        `INSERT INTO exercises
          (name, "nameKo", "bodyPart", equipment, category, difficulty, description, "descriptionKo",
           "primaryMuscles", "secondaryMuscles", "gifUrl", "secondaryImages", instructions, "instructionsKo")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12::jsonb, $13::jsonb, $14::jsonb)
         RETURNING id, name, "nameKo"`,
        exerciseValues(exercise),
      );
      keep = insertedRow.rows[0];
      inserted += 1;
    }

    for (const duplicate of rows.slice(1)) {
      await moveReferences(client, duplicate.id, keep.id);
      await client.query("DELETE FROM exercises WHERE id = $1", [duplicate.id]);
      merged += 1;
    }

    await client.query(
      `UPDATE exercises SET
        "nameKo" = $2,
        "bodyPart" = $3,
        equipment = $4,
        category = $5,
        difficulty = $6,
        description = $7,
        "descriptionKo" = $8,
        "primaryMuscles" = $9::jsonb,
        "secondaryMuscles" = $10::jsonb,
        "gifUrl" = $11,
        "secondaryImages" = $12::jsonb,
        instructions = $13::jsonb,
        "instructionsKo" = $14::jsonb
       WHERE name = $1`,
      exerciseValues(exercise),
    );
    updated += 1;
  }

  const afterNameMerge = (await client.query('SELECT id, name, "nameKo" FROM exercises ORDER BY id')).rows;
  const canonicalKeys = new Map();
  for (const exercise of canonicalExercises) {
    const keys = [
      normalizeExerciseKey(exercise.name),
      normalizeExerciseKey(exercise.nameKo),
    ].filter(Boolean);
    for (const key of keys) {
      if (!canonicalKeys.has(key)) canonicalKeys.set(key, exercise.name);
    }
  }

  const keepByKey = new Map();
  for (const row of afterNameMerge) {
    if (!canonicalByName.has(row.name)) continue;
    for (const key of [normalizeExerciseKey(row.name), normalizeExerciseKey(row.nameKo)].filter(Boolean)) {
      if (!keepByKey.has(key)) keepByKey.set(key, row);
    }
  }

  let removedStale = 0;
  for (const row of afterNameMerge) {
    if (canonicalByName.has(row.name)) continue;
    const keys = [normalizeExerciseKey(row.name), normalizeExerciseKey(row.nameKo)].filter(Boolean);
    const target = keys.map((key) => keepByKey.get(key)).find(Boolean);
    if (!target) continue;

    await moveReferences(client, row.id, target.id);
    await client.query("DELETE FROM exercises WHERE id = $1", [row.id]);
    removedStale += 1;
  }

  const finalRows = (await client.query('SELECT id, name, "nameKo" FROM exercises ORDER BY id')).rows;
  const seenKeys = new Set();
  const duplicateKeys = [];
  for (const row of finalRows) {
    for (const key of [normalizeExerciseKey(row.name), normalizeExerciseKey(row.nameKo)].filter(Boolean)) {
      if (seenKeys.has(key)) duplicateKeys.push(key);
      seenKeys.add(key);
    }
  }

  const afterCount = finalRows.length;
  await client.query("COMMIT");

  console.log(JSON.stringify({
    beforeCount,
    afterCount,
    inserted,
    updated,
    merged,
    removedStale,
    duplicateKeys: duplicateKeys.length,
  }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
