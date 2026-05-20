import fs from "fs";
const text = fs.readFileSync("app/data/stockBenefits.ts", "utf8");
const codes = [...text.matchAll(/stockCode:\s*"(\d{4})"/g)].map((m) => m[1]);
const counts = new Map();
for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
const dups = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log("total entries:", codes.length);
console.log("unique codes:", counts.size);
console.log("duplicate codes:", dups.length);
for (const [code, n] of dups.slice(0, 40)) {
  console.log(`  ${code} x${n}`);
}
if (dups.length > 40) console.log(`  ... and ${dups.length - 40} more`);
