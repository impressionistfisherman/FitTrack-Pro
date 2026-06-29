import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { importPublicFoods } from "../server/db.ts";

const DEFAULT_FOOD_DB_KEY = "HtK2y16FQ6u7tmufhjNj/nsG7bu7idHA6NNFabi1DjW19CVu5+r1qAMtcN+f7t/qUxCG2/SSavRsbionzcbnLw==";
const DEFAULT_DOWNLOAD_URL = `https://various.foodsafetykorea.go.kr/nutrient/multi/file/download.do?key=${encodeURIComponent(DEFAULT_FOOD_DB_KEY)}`;

function pickArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : "";
}

function toNumber(value) {
  if (value == null) return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function servingGrams(value) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : 100;
}

async function downloadFile(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MFDS food DB download failed: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
  return targetPath;
}

function normalizeFoodName(name) {
  return String(name ?? "").trim().replace(/_/g, " ");
}

function parseWorkbook(filePath, limit) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("XLSX sheet not found.");
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  const parsed = [];

  for (const row of rows) {
    const name = normalizeFoodName(row["식품명"]);
    if (!name) continue;
    const basis = servingGrams(row["영양성분함량기준량"]);
    const ratio = 100 / basis;
    const brand = String(row["출처명"] || row["제공처"] || row["데이터구분명"] || "식품의약품안전처").trim() || "식품의약품안전처";
    const aliases = [
      row["식품명"],
      row["대표식품명"],
      row["식품대분류명"],
      row["식품중분류명"],
      row["식품소분류명"],
      row["식품세분류명"],
      row["식품코드"],
      row["데이터구분명"],
      row["식품기원명"],
      "식품영양성분DB",
      "식약처",
      "MFDS",
    ].map((value) => String(value ?? "").trim()).filter(Boolean);

    parsed.push({
      name,
      brand,
      caloriesPer100: Math.round(toNumber(row["에너지(kcal)"]) * ratio * 10) / 10,
      proteinPer100: Math.round(toNumber(row["단백질(g)"]) * ratio * 10) / 10,
      carbsPer100: Math.round(toNumber(row["탄수화물(g)"]) * ratio * 10) / 10,
      fatPer100: Math.round(toNumber(row["지방(g)"]) * ratio * 10) / 10,
      sodiumPer100: Math.round(toNumber(row["나트륨(mg)"]) * ratio),
      aliases,
    });

    if (limit && parsed.length >= limit) break;
  }

  return parsed;
}

const sourceArg = pickArg("source");
const url = pickArg("url") || process.env.MFDS_FOOD_DB_XLSX_URL || DEFAULT_DOWNLOAD_URL;
const cachePath = path.resolve(pickArg("cache") || process.env.MFDS_FOOD_DB_XLSX_PATH || "data/mfds-food-db.xlsx");
const limit = Number(pickArg("limit") || process.env.MFDS_FOOD_DB_IMPORT_LIMIT || 0);
const sourcePath = sourceArg ? path.resolve(sourceArg) : cachePath;

if (!sourceArg || !fs.existsSync(sourcePath)) {
  console.log(`Downloading MFDS food DB: ${url}`);
  await downloadFile(url, sourcePath);
}

console.log(`Reading MFDS food DB: ${sourcePath}`);
const foods = parseWorkbook(sourcePath, limit);
console.log(`Parsed rows: ${foods.length}`);
const result = await importPublicFoods(foods);
console.log(`Imported rows: ${result.imported}`);
