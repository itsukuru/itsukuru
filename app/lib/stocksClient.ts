import type { JpStock } from "@/app/data/jpStocks";
import { jpStocks } from "@/app/data/jpStocks";
import { STOCK_SEARCH_YOMI } from "@/app/data/jpStockSearchYomi";
import { seedStockBenefits } from "@/app/data/stockBenefits";
import { normalizeSearchText } from "./searchNormalize";

export { normalizeSearchText };

export const CUSTOM_STOCKS_STORAGE_KEY = "custom-stocks:v1";

export type StockRecord = JpStock;

/** 銘柄コード・社名に加え、漢字部分の読み（jpStockSearchYomi）を含めた検索用文字列 */
export const stockSearchHaystack = (stock: StockRecord): string => {
  const extra = STOCK_SEARCH_YOMI[stock.code]?.trim();
  return [stock.code, stock.name, extra].filter(Boolean).join(" ");
};

/**
 * 銘柄一覧を検索語で絞り込み、ヒット位置が早い順（同位置なら文字列が短い順）で上位を返す。
 * 1文字目だけのときにコード順の先頭8件へ埋もれないよう並べ替える。
 */
export const filterStocksBySearchKeyword = (
  stocks: StockRecord[],
  trimmedQuery: string,
  limit = 16
): StockRecord[] => {
  const keyword = normalizeSearchText(trimmedQuery);
  if (!keyword) return [];

  const scored: { stock: StockRecord; idx: number; len: number }[] = [];
  for (const stock of stocks) {
    const hay = normalizeSearchText(stockSearchHaystack(stock));
    const idx = hay.indexOf(keyword);
    if (idx < 0) continue;
    scored.push({ stock, idx, len: hay.length });
  }

  scored.sort((a, b) => {
    if (a.idx !== b.idx) return a.idx - b.idx;
    return a.len - b.len;
  });

  return scored.slice(0, limit).map((s) => s.stock);
};

const NON_BENEFIT_MARKET_PATTERN =
  /(ETF|ETN|REIT|インフラファンド|ベンチャーファンド|カントリーファンド|外国株式|PRO\s*Market)/i;

const stripMarketSuffix = (market: string): string =>
  market
    .replace(/[（(]\s*内国株式\s*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const isBenefitEligibleMarket = (market: string): boolean => {
  if (!market) return true;
  return !NON_BENEFIT_MARKET_PATTERN.test(market);
};

export const normalizeStock = (stock: StockRecord): StockRecord => ({
  code: stock.code.trim(),
  name: stock.name.trim(),
  market: stripMarketSuffix(stock.market.trim()) || "未設定",
  industry: stock.industry.trim() || "未設定",
});

export const mergeStocks = (base: StockRecord[], custom: StockRecord[]): StockRecord[] => {
  const map = new Map<string, StockRecord>();

  for (const stock of base) {
    map.set(stock.code, normalizeStock(stock));
  }
  for (const stock of custom) {
    map.set(stock.code, normalizeStock(stock));
  }

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
};

/**
 * jpStocks に無いが優待シードに存在する銘柄を、検索・銘柄ページ用に最低限の形で補う。
 * 社名は優待本文から推測しない（誤表記防止）。マスタ追記で上書きされる。
 */
const buildFallbackStockRecord = (code: string): StockRecord => ({
  code,
  name: `${code}（銘柄名未登録）`,
  market: "国内株式",
  industry: "（jpStocks 未登録・優待シードあり）",
});

let resolvedMasterCache: StockRecord[] | null = null;

const buildResolvedMasterStocks = (): StockRecord[] => {
  const map = new Map<string, StockRecord>();
  for (const s of jpStocks) {
    map.set(s.code, normalizeStock(s));
  }
  for (const b of seedStockBenefits) {
    if (map.has(b.stockCode)) continue;
    map.set(b.stockCode, normalizeStock(buildFallbackStockRecord(b.stockCode)));
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
};

/** jpStocks と優待シードの和集合（国内株式として検索可能にする） */
export const getResolvedMasterStocks = (): StockRecord[] => {
  if (!resolvedMasterCache) {
    resolvedMasterCache = buildResolvedMasterStocks();
  }
  return resolvedMasterCache;
};

export const resolveStockByCode = (code: string): StockRecord | null => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return getResolvedMasterStocks().find((s) => s.code === trimmed) ?? null;
};

export const getDefaultStocks = (): StockRecord[] => getResolvedMasterStocks();

export const loadCustomStocks = (): StockRecord[] => {
  const raw = localStorage.getItem(CUSTOM_STOCKS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StockRecord[];
    return parsed
      .filter((item) => item && typeof item.code === "string" && typeof item.name === "string")
      .map(normalizeStock)
      .filter((item) => isBenefitEligibleMarket(item.market));
  } catch {
    return [];
  }
};

export const saveCustomStocks = (stocks: StockRecord[]) => {
  localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(stocks.map(normalizeStock)));
};

export const parseStocksCsv = (csvText: string): StockRecord[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const body = lines.slice(1);
  const parsed: StockRecord[] = [];

  for (const line of body) {
    const [code = "", name = "", market = "", industry = ""] = line.split(",").map((v) => v.trim());
    if (!code || !name) {
      continue;
    }
    parsed.push(normalizeStock({ code, name, market, industry }));
  }

  return parsed;
};
