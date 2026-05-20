import type { JpStock } from "@/app/data/jpStockTypes";
import { COMPANY_OVERRIDES } from "@/app/data/companyOverrides";
import { isDelistedStockCode } from "@/app/data/delistedStockCodes";
import { seedStockBenefits } from "@/app/data/stockBenefits";
import { jpStocksCore } from "@/app/data/jpStocksCore";

const CONTENT_STOP =
  /[\s　]+(?=自社|各店|店舗|グループ各|ホテル|クオカード|株主|で使える|の詰|関連|等で|優待|買物|宿泊|割引|記念|ATM|商品|食事|製品|年間|保有|長期|オリジナル|取扱|提供|進呈|カタログ)/;

const kataToHira = (str: string): string =>
  [...str].map((ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x30a1 && cp <= 0x30f6) return String.fromCodePoint(cp - 0x60);
    return ch;
  }).join("");

const extractYomiTokens = (text: string): string[] => {
  const parts: string[] = [];
  for (const k of text.match(/[\u30A0-\u30FFー]+/g) ?? []) parts.push(kataToHira(k));
  for (const h of text.match(/[\u3040-\u309Fー]+/g) ?? []) parts.push(h);
  for (const a of text.match(/[A-Za-z][A-Za-z0-9.&-]*/g) ?? [])
    parts.push(a.toLowerCase());
  return parts;
};

const extractName = (code: string, content: string): string => {
  const override = COMPANY_OVERRIDES[code]?.name;
  if (override) return override;

  let s = content.trim();
  const m = s.match(CONTENT_STOP);
  if (m?.index) s = s.slice(0, m.index);
  s = (s.split(/[\s　]/)[0] ?? s).replace(/[（(].*?[）)]/g, "").trim();
  if (s.length > 48) s = s.slice(0, 48);
  return s || code;
};

const guessIndustry = (content: string): string => {
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
};

let cachedStocks: JpStock[] | null = null;
let cachedYomi: Partial<Record<string, string>> | null = null;

const coreCodeSet = () => new Set(jpStocksCore.map((s) => s.code));

/** 優待シードのみの銘柄を jpStocks 形式で生成（キャッシュ） */
export const getJpStocksFromSeed = (): JpStock[] => {
  if (cachedStocks) return cachedStocks;

  const core = coreCodeSet();
  const stocks: JpStock[] = [];

  for (const b of seedStockBenefits) {
    if (isDelistedStockCode(b.stockCode)) continue;
    if (core.has(b.stockCode)) continue;
    stocks.push({
      code: b.stockCode,
      name: extractName(b.stockCode, b.content),
      market: "東証プライム",
      industry: COMPANY_OVERRIDES[b.stockCode]?.industry ?? guessIndustry(b.content),
    });
  }

  cachedStocks = stocks.sort((a, b) => a.code.localeCompare(b.code));
  return cachedStocks;
};

/** シード由来銘柄の検索用よみ（キャッシュ） */
export const getStockSearchYomiFromSeed = (): Partial<Record<string, string>> => {
  if (cachedYomi) return cachedYomi;

  const core = coreCodeSet();
  const yomi: Partial<Record<string, string>> = {};

  for (const b of seedStockBenefits) {
    if (isDelistedStockCode(b.stockCode)) continue;
    if (core.has(b.stockCode)) continue;
    const code = b.stockCode;
    const override = COMPANY_OVERRIDES[code]?.yomi;
    if (override) {
      yomi[code] = override;
      continue;
    }
    const name = extractName(code, b.content);
    const parts = [
      ...extractYomiTokens(name),
      ...extractYomiTokens(b.content.slice(0, 48)),
    ];
    const uniq = [...new Set(parts.filter(Boolean))];
    if (uniq.length) yomi[code] = uniq.join(" ");
  }

  cachedYomi = yomi;
  return cachedYomi;
};
