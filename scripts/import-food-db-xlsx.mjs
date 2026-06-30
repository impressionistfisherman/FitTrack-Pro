import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sax from "sax";
import yauzl from "yauzl";
import { getFoodDataStatus, importPublicFoodsBulk } from "../server/db.ts";

const DEFAULT_SOURCES = [
  "20251229_음식DB 19495건.xlsx",
  "20260623_건강기능식품DB_5556건 (3).xlsx",
  "20260626_가공식품DB_298288건.xlsx",
].map((fileName) => path.join(os.homedir(), "Downloads", fileName));

function argValues(name) {
  const prefix = `--${name}=`;
  return process.argv.filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length));
}

function argValue(name, fallback = "") {
  return argValues(name)[0] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function toNumber(value) {
  if (value == null) return 0;
  const normalized = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function servingGrams(...values) {
  for (const value of values) {
    if (value == null || String(value).trim() === "") continue;
    const text = String(value).trim().toLowerCase();
    const parsed = toNumber(text);
    if (!parsed || parsed <= 0) continue;
    if (text.includes("mg")) return parsed / 1000;
    if (text.includes("kg")) return parsed * 1000;
    if (text.includes("ml")) return parsed;
    if (text.includes("g") || text.includes("그램")) return parsed;
    if (parsed >= 10) return parsed;
  }
  return 100;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeFoodName(value) {
  return cleanText(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function rowToFood(row) {
  const name = normalizeFoodName(row["식품명"]);
  if (!name) return null;

  const basis = servingGrams(
    row["영양성분함량기준량"],
    row["영양성분제공단위량"],
    row["1회분량중량/부피"],
    row["1인(회)분량 참고량"],
    row["식품중량"],
    row["식품중량/부피"],
  );
  const ratio = basis > 0 ? 100 / basis : 1;
  const brand = cleanText(
    row["업체명"]
      || row["제조사명"]
      || row["수입업체명"]
      || row["유통업체명"]
      || row["출처명"]
      || row["제공처"]
      || row["데이터구분명"]
      || "식품의약품안전처",
  ) || "식품의약품안전처";
  const aliases = unique([
    row["식품명"],
    name,
    row["대표식품명"],
    row["식품대분류명"],
    row["식품중분류명"],
    row["식품소분류명"],
    row["식품세분류명"],
    row["식품코드"],
    row["데이터구분명"],
    row["식품기원명"],
    row["유형명"],
    row["업체명"],
    row["제조사명"],
    row["수입업체명"],
    row["유통업체명"],
    row["원산지국명"],
    row["품목제조보고번호"],
    "식품영양성분DB",
    "식약처",
    "MFDS",
  ]);

  return {
    name,
    brand,
    servingSizeGrams: round1(basis),
    caloriesPer100: round1(toNumber(row["에너지(kcal)"]) * ratio),
    proteinPer100: round1(toNumber(row["단백질(g)"]) * ratio),
    carbsPer100: round1(toNumber(row["탄수화물(g)"]) * ratio),
    fatPer100: round1(toNumber(row["지방(g)"]) * ratio),
    sodiumPer100: Math.round(toNumber(row["나트륨(mg)"]) * ratio),
    aliases,
  };
}

function openZip(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zipFile) => {
      if (error) reject(error);
      else resolve(zipFile);
    });
  });
}

async function withZipEntry(filePath, predicate, handler) {
  const zipFile = await openZip(filePath);
  return await new Promise((resolve, reject) => {
    let settled = false;
    function finish(error, value) {
      if (settled) return;
      settled = true;
      zipFile.close();
      if (error) reject(error);
      else resolve(value);
    }

    zipFile.readEntry();
    zipFile.on("entry", (entry) => {
      if (!predicate(entry.fileName)) {
        zipFile.readEntry();
        return;
      }
      zipFile.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          finish(error ?? new Error(`Zip entry stream not available: ${entry.fileName}`));
          return;
        }
        Promise.resolve(handler(stream, entry.fileName)).then(
          (value) => finish(null, value),
          (handlerError) => finish(handlerError),
        );
      });
    });
    zipFile.on("end", () => finish(new Error(`Required XLSX entry not found: ${filePath}`)));
    zipFile.on("error", (error) => finish(error));
  });
}

async function readSharedStrings(filePath) {
  return await withZipEntry(
    filePath,
    (fileName) => fileName === "xl/sharedStrings.xml",
    (stream) => new Promise((resolve, reject) => {
      const strings = [];
      const parser = sax.createStream(true);
      let inString = false;
      let inText = false;
      let current = "";

      parser.on("opentag", (node) => {
        const name = node.name.toLowerCase();
        if (name === "si") {
          inString = true;
          current = "";
        } else if (inString && name === "t") {
          inText = true;
        }
      });
      parser.on("text", (text) => {
        if (inText) current += text;
      });
      parser.on("closetag", (name) => {
        const normalized = String(name).toLowerCase();
        if (normalized === "t") inText = false;
        if (normalized === "si") {
          strings.push(current);
          inString = false;
          current = "";
        }
      });
      parser.on("error", reject);
      parser.on("end", () => resolve(strings));
      stream.on("error", reject);
      stream.pipe(parser);
    }),
  );
}

function columnIndex(cellRef) {
  const letters = String(cellRef ?? "").match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "";
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, index - 1);
}

function cellValue(cell, sharedStrings) {
  if (!cell) return "";
  if (cell.type === "s") return sharedStrings[Number(cell.raw)] ?? "";
  return cell.raw ?? "";
}

async function parseFoodsFromXlsx(filePath, { limit = 0 } = {}) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  console.log(`Shared strings: ${filePath}`);
  const sharedStrings = await readSharedStrings(filePath);
  console.log(`Shared strings loaded: ${sharedStrings.length.toLocaleString("ko-KR")}`);

  return await withZipEntry(
    filePath,
    (fileName) => /^xl\/worksheets\/sheet\d+\.xml$/.test(fileName),
    (stream, sheetEntryName) => new Promise((resolve, reject) => {
      const parser = sax.createStream(true);
      const foods = [];
      let headers = null;
      let currentRow = [];
      let currentCell = null;
      let collecting = false;
      let rowsRead = 0;
      let resolved = false;

      function done() {
        if (resolved) return;
        resolved = true;
        resolve({ foods, rowsRead, sheetEntryName });
      }

      parser.on("opentag", (node) => {
        const name = node.name.toLowerCase();
        if (name === "row") {
          currentRow = [];
        } else if (name === "c") {
          currentCell = {
            index: columnIndex(node.attributes.r),
            type: node.attributes.t ? String(node.attributes.t) : "",
            raw: "",
          };
        } else if (currentCell && (name === "v" || name === "t")) {
          collecting = true;
        }
      });
      parser.on("text", (text) => {
        if (collecting && currentCell) currentCell.raw += text;
      });
      parser.on("closetag", (name) => {
        const normalized = String(name).toLowerCase();
        if (normalized === "v" || normalized === "t") {
          collecting = false;
        } else if (normalized === "c" && currentCell) {
          currentRow[currentCell.index] = cellValue(currentCell, sharedStrings);
          currentCell = null;
        } else if (normalized === "row") {
          const rowValues = currentRow.map((value) => cleanText(value));
          if (!headers && rowValues.some(Boolean)) {
            headers = rowValues;
          } else if (headers) {
            const row = {};
            for (let index = 0; index < headers.length; index += 1) {
              if (headers[index]) row[headers[index]] = rowValues[index] ?? "";
            }
            const food = rowToFood(row);
            if (food && (!limit || foods.length < limit)) foods.push(food);
            rowsRead += 1;
            if (rowsRead % 50000 === 0) {
              console.log(`Parsed rows: ${rowsRead.toLocaleString("ko-KR")} / foods: ${foods.length.toLocaleString("ko-KR")}`);
            }
            if (limit && foods.length >= limit) {
              stream.destroy();
              done();
            }
          }
        }
      });
      parser.on("error", (error) => {
        if (resolved) return;
        reject(error);
      });
      parser.on("end", done);
      stream.on("error", (error) => {
        if (resolved && /premature close/i.test(String(error?.message ?? ""))) return;
        if (!resolved) reject(error);
      });
      stream.pipe(parser);
    }),
  );
}

const sources = argValues("source").length > 0
  ? argValues("source").map((source) => path.resolve(source))
  : DEFAULT_SOURCES.map((source) => path.resolve(source));
const limit = Number(argValue("limit", "0")) || 0;
const batchSize = Number(argValue("batch-size", "500")) || 500;
const dryRun = hasFlag("dry-run");
const allFoods = [];

if (!dryRun) {
  console.log("Checking DB connection before reading XLSX...");
  console.log(JSON.stringify(await getFoodDataStatus(), null, 2));
}

for (const source of sources) {
  console.log(`Reading XLSX: ${source}`);
  const parsed = await parseFoodsFromXlsx(source, { limit });
  console.log(`Parsed ${parsed.foods.length.toLocaleString("ko-KR")} foods from ${path.basename(source)} (${parsed.sheetEntryName})`);
  for (const food of parsed.foods) allFoods.push(food);
}

console.log(`Total parsed foods: ${allFoods.length.toLocaleString("ko-KR")}`);
if (dryRun) {
  console.log(JSON.stringify(allFoods.slice(0, 5), null, 2));
  process.exit(0);
}

const result = await importPublicFoodsBulk(allFoods, {
  batchSize,
  onProgress: ({ imported, skipped }) => {
    if (imported > 0 && imported % 25000 === 0) {
      console.log(`Inserted: ${imported.toLocaleString("ko-KR")} / skipped: ${skipped.toLocaleString("ko-KR")}`);
    }
  },
});
console.log(`Imported rows: ${result.imported.toLocaleString("ko-KR")}`);
console.log(`Skipped rows: ${result.skipped.toLocaleString("ko-KR")}`);
console.log(JSON.stringify(await getFoodDataStatus(), null, 2));
