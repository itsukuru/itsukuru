import {
  findSeedBenefit,
  seedStockBenefits,
  type StockBenefit,
} from "@/app/data/stockBenefits";

const STORAGE_PREFIX = "stock-benefit:";

const isStockBenefit = (value: unknown): value is StockBenefit => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const c = value as Record<string, unknown>;
  return typeof c.stockCode === "string" && typeof c.content === "string";
};

export const loadBenefitForStock = (stockCode: string): StockBenefit | null => {
  if (typeof window === "undefined") {
    return findSeedBenefit(stockCode) ?? null;
  }

  const raw = localStorage.getItem(`${STORAGE_PREFIX}${stockCode}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isStockBenefit(parsed)) {
        return parsed;
      }
    } catch {
      // ignore parse errors and fall back to seed
    }
  }

  return findSeedBenefit(stockCode) ?? null;
};

export const saveBenefitForStock = (benefit: StockBenefit) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(
    `${STORAGE_PREFIX}${benefit.stockCode}`,
    JSON.stringify(benefit)
  );
};

export const createEmptyBenefit = (stockCode: string): StockBenefit => ({
  stockCode,
  content: "",
  rightsMonths: "",
  minShares: 100,
  confidence: "uncertain",
});

export const loadAllBenefits = (): Map<string, StockBenefit> => {
  const map = new Map<string, StockBenefit>();

  for (const seed of seedStockBenefits) {
    map.set(seed.stockCode, seed);
  }

  if (typeof window === "undefined") {
    return map;
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isStockBenefit(parsed)) {
        map.set(parsed.stockCode, parsed);
      }
    } catch {
      continue;
    }
  }

  return map;
};

