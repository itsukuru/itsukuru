import type { JpStock } from "@/app/data/jpStockTypes";
import { isDelistedStockCode } from "@/app/data/delistedStockCodes";
import { jpStocksCore } from "@/app/data/jpStocksCore";
import { getJpStocksFromSeed } from "@/app/lib/buildJpStocksFromSeed";

export type { JpStock } from "@/app/data/jpStockTypes";

/**
 * 銘柄マスタ（手入れ主要銘柄 + 優待シード由来の自動登録社名）。
 * 検索・銘柄ページの母集団は `getResolvedMasterStocks()`（本マスタ ∪ シード漏れ補完）です。
 */
const mergeJpStocks = (): JpStock[] => {
  const map = new Map<string, JpStock>();
  for (const s of jpStocksCore) {
    if (!isDelistedStockCode(s.code)) map.set(s.code, s);
  }
  for (const s of getJpStocksFromSeed()) {
    if (isDelistedStockCode(s.code)) continue;
    if (!map.has(s.code)) map.set(s.code, s);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
};

export const jpStocks: JpStock[] = mergeJpStocks();
