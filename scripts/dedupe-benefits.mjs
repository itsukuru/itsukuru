/**
 * stockBenefits.ts の seed 配列を銘柄コード単位で1件に統合する。
 * 実行: node scripts/dedupe-benefits.mjs
 */
import fs from "fs";
import path from "path";

const filePath = path.join("app", "data", "stockBenefits.ts");
const text = fs.readFileSync(filePath, "utf8");

const arrayStart = text.indexOf("const seedStockBenefitsRaw: StockBenefit[] = [");
if (arrayStart < 0) throw new Error("seedStockBenefitsRaw array not found");
const bodyStart = text.indexOf("[", arrayStart) + 1;
const bodyEnd = text.indexOf("\n];", bodyStart);
if (bodyEnd < 0) throw new Error("array end not found");

const header = text.slice(0, bodyStart);
const footer = text.slice(bodyEnd);
const body = text.slice(bodyStart, bodyEnd);

/** @type {{ start: number, end: number, code: string, block: string }[]} */
const entries = [];
let i = 0;
while (i < body.length) {
  const stockIdx = body.indexOf('stockCode:', i);
  if (stockIdx < 0) break;
  const objStart = body.lastIndexOf("{", stockIdx);
  if (objStart < 0 || objStart < i) {
    i = stockIdx + 1;
    continue;
  }
  const codeMatch = body.slice(stockIdx).match(/stockCode:\s*"(\d{4})"/);
  if (!codeMatch) {
    i = stockIdx + 1;
    continue;
  }
  const code = codeMatch[1];

  let depth = 0;
  let j = objStart;
  let inString = false;
  let stringChar = "";
  let escape = false;
  for (; j < body.length; j++) {
    const ch = body[j];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
  }
  let end = j;
  while (end < body.length && /[\s,]/.test(body[end])) end++;
  const block = body.slice(objStart, end);
  entries.push({ start: objStart, end, code, block });
  i = end;
}

console.log("parsed entries:", entries.length);

const isAbolished = (block) =>
  /confidence:\s*"abolished"/.test(block) ||
  (/実施なし|廃止/.test(block) && /minShares:\s*0/.test(block));

const score = (block) => {
  let s = 0;
  if (isAbolished(block)) {
    s += 40;
    if (/confidence:\s*"abolished"/.test(block)) s += 30;
  } else {
    s += 80;
    if (/confidence:\s*"stable"/.test(block)) s += 25;
    else if (/confidence:\s*"verified"/.test(block)) s += 30;
    else if (/confidence:\s*"uncertain"/.test(block)) s += 10;
    if (/minShares:\s*100/.test(block)) s += 5;
  }
  if (/irUrl:/.test(block)) s += 8;
  if (/expectedArrival:/.test(block)) s += 6;
  if (/badgeKeys:/.test(block)) s += 4;
  if (/tieredBenefits:/.test(block)) s += 5;
  if (/noticeArrival:|actualArrival:/.test(block)) s += 4;
  const noteLen = (block.match(/notes:/g) || []).length;
  s += Math.min(noteLen * 2, 6);
  if (/本ファイル内の重複/.test(block)) s -= 15;
  return s;
};

const pickWinner = (blocks) => {
  const abolished = blocks.filter(isAbolished);
  const active = blocks.filter((b) => !isAbolished(b));
  const pool =
    active.length > 0
      ? active
      : abolished.length > 0
        ? abolished
        : blocks;
  return pool.reduce((best, b) => (score(b) > score(best) ? b : best), pool[0]);
};

const byCode = new Map();
for (const e of entries) {
  const xs = byCode.get(e.code) ?? [];
  xs.push(e);
  byCode.set(e.code, xs);
}

const dups = [...byCode.entries()].filter(([, xs]) => xs.length > 1);
console.log("unique codes:", byCode.size);
console.log("duplicate codes:", dups.length);

const winners = new Map();
for (const [code, xs] of byCode) {
  winners.set(code, pickWinner(xs.map((x) => x.block)));
}

// Rebuild body preserving comments between entries (strip duplicate object blocks)
const removeRanges = [];
for (const [, xs] of dups) {
  const winnerBlock = pickWinner(xs.map((x) => x.block));
  for (const e of xs) {
    if (e.block !== winnerBlock) removeRanges.push([e.start, e.end]);
  }
}

removeRanges.sort((a, b) => b[0] - a[0]);
let newBody = body;
for (const [s, e] of removeRanges) {
  newBody = newBody.slice(0, s) + newBody.slice(e);
}

// Collapse excessive blank lines
newBody = newBody.replace(/\n{4,}/g, "\n\n\n");

const outPath = path.join("app", "data", "stockBenefits.deduped-body.txt");
fs.writeFileSync(outPath, newBody, "utf8");
console.log("removed blocks:", removeRanges.length);
console.log("wrote", outPath);

// Stats for review
const reviewPath = path.join("scripts", "dedupe-review.txt");
const lines = dups.map(([code, xs]) => {
  const winner = pickWinner(xs.map((x) => x.block));
  const kept = isAbolished(winner) ? "abolished" : "active";
  return `${code} x${xs.length} -> ${kept} score=${score(winner)}`;
});
fs.writeFileSync(reviewPath, lines.join("\n"), "utf8");
console.log("review:", reviewPath);
