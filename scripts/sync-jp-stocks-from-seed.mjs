/**
 * 優待シードから jpStocks / 検索よみを一括生成する。
 * 実行: node scripts/sync-jp-stocks-from-seed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { COMPANY_OVERRIDES } from "./company-overrides.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const jpText = fs.readFileSync(path.join(root, "app/data/jpStocks.ts"), "utf8");
const seedText = fs.readFileSync(path.join(root, "app/data/stockBenefits.ts"), "utf8");
const yomiText = fs.readFileSync(path.join(root, "app/data/jpStockSearchYomi.ts"), "utf8");

const jpCodes = new Set([...jpText.matchAll(/code:\s*"(\d{4})"/g)].map((m) => m[1]));
const existingYomi = new Map(
  [...yomiText.matchAll(/"(\d{4})":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]])
);

/** @type {Map<string, { content: string; confidence?: string; notes?: string }[]>} */
const byCode = new Map();
const blockRe =
  /stockCode:\s*"(\d{4})"[\s\S]*?content:\s*"((?:\\.|[^"\\])*)"[\s\S]*?(?:confidence:\s*"([^"]*)")?[\s\S]*?(?:notes:\s*"((?:\\.|[^"\\])*)")?/g;

for (const m of seedText.matchAll(blockRe)) {
  const code = m[1];
  const content = m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n");
  const confidence = m[3];
  const notes = m[4]?.replace(/\\"/g, '"');
  const xs = byCode.get(code) ?? [];
  xs.push({ content, confidence, notes });
  byCode.set(code, xs);
}

const isAbolished = (e) =>
  e.confidence === "abolished" ||
  /実施なし|廃止/.test(e.content) ||
  (e.notes && /実施なし/.test(e.notes));

const score = (e) => {
  if (isAbolished(e)) return isAbolished(e) && e.confidence === "abolished" ? 40 : 10;
  let s = 100;
  if (e.confidence === "verified") s += 30;
  else if (e.confidence === "stable") s += 25;
  else if (e.confidence === "uncertain") s += 8;
  if (/本ファイル内の重複/.test(e.notes ?? "")) s -= 25;
  return s;
};

const pickEntry = (entries) =>
  entries.reduce((best, e) => (score(e) > score(best) ? e : best), entries[0]);

const STOP =
  /[\s　]+(?=自社|各店|店舗|グループ各|ホテル|クオカード|株主|で使える|の詰|関連|等で|優待|買物|宿泊|割引|記念|ATM|商品|食事|製品|年間|保有|長期|オリジナル|取扱|提供|進呈|進呈|カタログ|進呈|進呈|進呈|進呈)/;

function extractName(code, content) {
  if (COMPANY_OVERRIDES[code]?.name) return COMPANY_OVERRIDES[code].name;
  let s = content.trim();
  const m = s.match(STOP);
  if (m?.index) s = s.slice(0, m.index);
  s = s.split(/[\s　]/)[0] ?? s;
  s = s.replace(/[（(].*?[）)]/g, "").trim();
  if (s.length > 48) s = s.slice(0, 48);
  return s || code;
}

function kataToHira(str) {
  return [...str].map((ch) => {
    const cp = ch.codePointAt(0);
    if (cp >= 0x30a1 && cp <= 0x30f6) return String.fromCodePoint(cp - 0x60);
    return ch;
  }).join("");
}

function extractYomiTokens(text) {
  const parts = [];
  for (const k of text.match(/[\u30A0-\u30FFー]+/g) ?? []) parts.push(kataToHira(k));
  for (const h of text.match(/[\u3040-\u309Fー]+/g) ?? []) parts.push(h);
  for (const a of text.match(/[A-Za-z][A-Za-z0-9.&-]*/g) ?? [])
    parts.push(a.toLowerCase());
  return parts;
}

function buildYomi(code, name, content) {
  if (COMPANY_OVERRIDES[code]?.yomi) return COMPANY_OVERRIDES[code].yomi;
  if (existingYomi.has(code)) return existingYomi.get(code);
  const parts = [...extractYomiTokens(name), ...extractYomiTokens(content.slice(0, 40))];
  const uniq = [...new Set(parts.filter(Boolean))];
  if (uniq.length) return uniq.join(" ");
  return "";
}

function guessIndustry(content) {
  if (/ホテル|宿泊|リゾート|旅館/.test(content)) return "サービス業";
  if (/鉄道|バス|航空|海運|運輸/.test(content)) return "陸運業";
  if (/銀行|証券|保険|金融/.test(content)) return "その他金融業";
  if (/スーパー|小売|百貨|店舗|ドラッグ/.test(content)) return "小売業";
  if (/食品|飲料|レストラン|外食|食堂|カフェ|居酒屋/.test(content)) return "食料品";
  if (/不動産|REIT|賃貸/.test(content)) return "不動産業";
  if (/IT|ソフト|通信|データ/.test(content)) return "情報・通信業";
  if (/建設|住宅|工務/.test(content)) return "建設業";
  if (/化学|製薬|医薬/.test(content)) return "化学";
  return "サービス業";
}

const seedOnly = [...byCode.keys()].filter((c) => !jpCodes.has(c)).sort();
const stocks = [];
const yomi = {};

for (const code of seedOnly) {
  const entry = pickEntry(byCode.get(code));
  const name = extractName(code, entry.content);
  const industry =
    COMPANY_OVERRIDES[code]?.industry ?? guessIndustry(entry.content);
  stocks.push({
    code,
    name,
    market: "東証プライム",
    industry,
  });
  const y = buildYomi(code, name, entry.content);
  if (y) yomi[code] = y;
}

const stocksTs = `/**
 * 自動生成: scripts/sync-jp-stocks-from-seed.mjs
 * 優待シードにのみ存在する銘柄の社名マスタ（${stocks.length} 件）
 * 手修正は company-overrides.mjs 経由で行い、再生成してください。
 */
import type { JpStock } from "@/app/data/jpStocks";

export const jpStocksFromSeed: JpStock[] = [
${stocks
  .map(
    (s) =>
      `  { code: "${s.code}", name: "${s.name.replace(/"/g, '\\"')}", market: "${s.market}", industry: "${s.industry}" },`
  )
  .join("\n")}
];
`;

const yomiEntries = Object.keys(yomi)
  .sort()
  .map((code) => `  "${code}": "${yomi[code].replace(/"/g, '\\"')}",`)
  .join("\n");

const yomiTs = `/**
 * 自動生成: scripts/sync-jp-stocks-from-seed.mjs
 * シード由来銘柄の検索用よみ（${Object.keys(yomi).length} 件）
 */
export const STOCK_SEARCH_YOMI_FROM_SEED: Partial<Record<string, string>> = {
${yomiEntries}
};
`;

fs.writeFileSync(path.join(root, "app/data/jpStocksFromSeed.generated.ts"), stocksTs, "utf8");
fs.writeFileSync(
  path.join(root, "app/data/jpStockSearchYomiFromSeed.generated.ts"),
  yomiTs,
  "utf8"
);

console.log(`Generated ${stocks.length} jpStocksFromSeed entries`);
console.log(`Generated ${Object.keys(yomi).length} yomi entries`);
console.log(`Still missing yomi (kanji-only names): ${stocks.filter((s) => !yomi[s.code]).length}`);
