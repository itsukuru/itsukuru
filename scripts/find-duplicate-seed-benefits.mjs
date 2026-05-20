/**
 * stockBenefits.ts の seedStockBenefitsRaw 内で、同一 stockCode が複数ある行番号を列挙する。
 * （dedupe が誤って現役側を選ぶケースの棚卸し用）
 *
 * Usage: node scripts/find-duplicate-seed-benefits.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benefitsPath = path.join(__dirname, "../app/data/stockBenefits.ts");
const txt = fs.readFileSync(benefitsPath, "utf8");
const lines = txt.split(/\n/);

const re = /\bstockCode:\s*"(\d{4})"\s*,?\s*$/;
const hits = [];
lines.forEach((line, idx) => {
  const m = line.match(re);
  if (!m) return;
  hits.push({ line: idx + 1, code: m[1] });
});

const byCode = new Map();
for (const h of hits) {
  const xs = byCode.get(h.code) ?? [];
  xs.push(h.line);
  byCode.set(h.code, xs);
}

const dupes = [...byCode.entries()].filter(([, ls]) => ls.length > 1).sort((a, b) => a[0].localeCompare(b[0]));

console.log(`Total stockCode lines (single-line declarations): ${hits.length}`);
console.log(`Unique codes on those lines: ${byCode.size}`);
console.log(`Codes with DUPLICATE entries: ${dupes.length}`);
for (const [code, ls] of dupes) {
  console.log(`${code}: lines ${ls.join(", ")}`);
}
