import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve(process.env.SQLITE_DB_PATH || "local-db/fittrack_local.sqlite");
const sourcePath = path.resolve("local-db/fittrack_local.sqlite");

fs.mkdirSync(path.dirname(targetPath), { recursive: true });

if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Copied initial SQLite DB to ${targetPath}`);
} else if (fs.existsSync(targetPath)) {
  console.log(`Using existing SQLite DB at ${targetPath}`);
} else {
  console.log(`SQLite DB will be created at ${targetPath}`);
}
