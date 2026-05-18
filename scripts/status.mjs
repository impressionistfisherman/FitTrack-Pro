import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getExercises, getFirstUser } from "../server/db.ts";

const checks = [];
const add = (name, ok, detail = "") => checks.push({ name, ok, detail });

add("Node", Number(process.versions.node.split(".")[0]) >= 20, process.version);
add("package.json", fs.existsSync("package.json"));
add("client", fs.existsSync(path.join("client", "src", "main.tsx")));
add("server", fs.existsSync(path.join("server", "_core", "index.ts")));
add("DATABASE_URL/SQLite", Boolean(process.env.DATABASE_URL) || fs.existsSync(path.join("local-db", "fittrack_local.sqlite")), process.env.DATABASE_URL ? "DATABASE_URL set" : "local sqlite");
add("JWT_SECRET", Boolean(process.env.JWT_SECRET), process.env.JWT_SECRET ? "set" : "missing");
add("Google OAuth", Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), process.env.GOOGLE_CLIENT_ID ? "configured" : "missing");
add("GitHub OAuth", Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET), process.env.GITHUB_CLIENT_ID ? "configured" : "missing");

try {
  const [exercises, user] = await Promise.all([getExercises(), getFirstUser()]);
  add("DB connection", true);
  add("Seed exercises", exercises.length > 0, `${exercises.length} exercises`);
  add("Users", true, user ? "at least one user" : "no users yet");
} catch (error) {
  add("DB connection", false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "OK " : "ERR"} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (failed.length) {
  console.log(`\n${failed.length} check(s) need attention.`);
  process.exitCode = 1;
}
