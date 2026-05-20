import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const jpText = fs.readFileSync(path.join(root, "app/data/jpStocks.ts"), "utf8");
const seedText = fs.readFileSync(path.join(root, "app/data/stockBenefits.ts"), "utf8");

const jpCodes = new Set([...jpText.matchAll(/code:\s*"(\d{4})"/g)].map((m) => m[1]));

const seedCodes = [
  ...new Set([...seedText.matchAll(/stockCode:\s*"(\d{4})"/g)].map((m) => m[1])),
];

const missing = seedCodes.filter((c) => !jpCodes.has(c)).sort();

const out = [
  `jpStocks: ${jpCodes.size} codes`,
  `seed (unique raw): ${seedCodes.length} codes`,
  `seed-only (銘柄名未登録): ${missing.length}`,
  "",
  ...missing,
].join("\n");

const outPath = path.join(root, "scripts/unregistered-codes.txt");
fs.writeFileSync(outPath, out, "utf8");
console.log(out);
