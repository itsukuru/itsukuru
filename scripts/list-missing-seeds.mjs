import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jp = fs.readFileSync(path.join(root, "app/data/jpStocks.ts"), "utf8");
const seed = fs.readFileSync(path.join(root, "app/data/stockBenefits.ts"), "utf8");
const codes = [...jp.matchAll(/code: "(\d{4})"/g)].map((m) => m[1]);
const seedCodes = new Set([...seed.matchAll(/stockCode: "(\d{4})"/g)].map((m) => m[1]));
const missing = codes.filter((c) => !seedCodes.has(c));
console.log("jpStocks", codes.length);
console.log("seed unique codes", seedCodes.size);
console.log("missing from seed", missing.length);
console.log(missing.join("\n"));
