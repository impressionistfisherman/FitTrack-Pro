import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const bulkPath = path.resolve(projectRoot, "server", "data", "bulk-exercises.json");
const dbPath = path.resolve(projectRoot, "server", "db.ts");
const failOnFindings = process.argv.includes("--fail-on-findings");

const semanticTerms = [
  "가슴",
  "한손",
  "양손",
  "손목",
  "발목",
  "어깨",
  "엉덩이",
  "종아리",
  "무릎",
  "뒤꿈치",
  "회전",
  "대각선",
  "기본",
  "변형",
  "보조",
  "올린",
  "벌리기",
  "이두",
  "삼두",
  "둔근",
  "대퇴사두",
];

function readBulkRows() {
  return JSON.parse(fs.readFileSync(bulkPath, "utf8")).map((row, index) => ({
    source: "server/data/bulk-exercises.json",
    index,
    name: row.name,
    nameKo: row.nameKo,
  }));
}

function readSupplementalRows() {
  const source = fs.readFileSync(dbPath, "utf8");
  const rows = [];
  const objectRe = /\{\s*name:\s*"([^"]+)"[\s\S]*?nameKo:\s*"([^"]+)"/g;
  let match;
  while ((match = objectRe.exec(source))) {
    rows.push({
      source: "server/db.ts",
      index: rows.length,
      name: match[1],
      nameKo: match[2],
    });
  }
  return rows;
}

const rows = [...readBulkRows(), ...readSupplementalRows()]
  .filter((row) => typeof row.nameKo === "string" && row.nameKo.trim());

const semanticFindings = [];
const englishTokenCounts = new Map();
const englishTokenSamples = new Map();

for (const row of rows) {
  const nameKo = row.nameKo.trim();
  for (const term of semanticTerms) {
    if (nameKo.includes(term)) {
      semanticFindings.push({ term, source: row.source, index: row.index, name: row.name, nameKo });
    }
  }

  for (const token of nameKo.match(/[A-Za-z][A-Za-z-]*/g) ?? []) {
    const normalized = token.toLowerCase();
    if (["ab", "ez", "it", "t", "v"].includes(normalized)) continue;
    englishTokenCounts.set(normalized, (englishTokenCounts.get(normalized) ?? 0) + 1);
    if (!englishTokenSamples.has(normalized)) {
      englishTokenSamples.set(normalized, { source: row.source, index: row.index, name: row.name, nameKo });
    }
  }
}

const englishTokens = Array.from(englishTokenCounts.entries())
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 40)
  .map(([token, count]) => ({ token, count, sample: englishTokenSamples.get(token) }));

const result = {
  totalRows: rows.length,
  semanticFindingCount: semanticFindings.length,
  semanticFindings: semanticFindings.slice(0, 80),
  englishTokenFindingCount: Array.from(englishTokenCounts.values()).reduce((sum, count) => sum + count, 0),
  englishTokens,
};

console.log(JSON.stringify(result, null, 2));

if (failOnFindings && semanticFindings.length > 0) {
  process.exitCode = 1;
}
