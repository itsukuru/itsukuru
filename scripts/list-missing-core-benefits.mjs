/**
 * jpStocksCore にあるコードのうち、stockBenefits.ts（raw）に stockCode が無いものを列挙する。
 * Usage: node scripts/list-missing-core-benefits.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const corePath = path.join(root, "app/data/jpStocksCore.ts");
const benefitsPath = path.join(root, "app/data/stockBenefits.ts");

const core = fs.readFileSync(corePath, "utf8");
const benefits = fs.readFileSync(benefitsPath, "utf8");

const coreCodes = [...core.matchAll(/\{ code: "(\d+)"/g)].map((m) => m[1]);
const seedCodes = new Set([...benefits.matchAll(/stockCode: "(\d+)"/g)].map((m) => m[1]));

const missing = coreCodes.filter((c) => !seedCodes.has(c));

const lines = [
  `jpStocksCore: ${coreCodes.length} codes`,
  `Unique stockCode refs in stockBenefits.ts raw: ${seedCodes.size}`,
  `MISSING benefit seed for core stock: ${missing.length}`,
  missing.length ? missing.join(", ") : "(none)",
];
console.log(lines.join("\n"));
