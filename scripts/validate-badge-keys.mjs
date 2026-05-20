import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const benefitsPath = path.join(root, "app/data/stockBenefits.ts");
const categoriesPath = path.join(root, "app/lib/benefitCategories.ts");

const benefits = fs.readFileSync(benefitsPath, "utf8");
const categories = fs.readFileSync(categoriesPath, "utf8");

const allowed = new Set(
  [...categories.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1])
);
allowed.add("other");

const hits = [...benefits.matchAll(/badgeKeys:\s*\[(.*?)\]/gs)];
const invalid = [];
for (const hit of hits) {
  const keys = [...hit[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
  for (const k of keys) {
    if (!allowed.has(k)) invalid.push(k);
  }
}

const uniqInvalid = [...new Set(invalid)];
console.log("Allowed keys:", [...allowed].sort().join(", "));
console.log("Invalid badgeKeys:", uniqInvalid.length ? uniqInvalid.join(", ") : "(none)");
