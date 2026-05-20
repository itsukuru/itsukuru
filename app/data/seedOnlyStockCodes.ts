import { isDelistedStockCode } from "@/app/data/delistedStockCodes";
import { jpStocksCore } from "@/app/data/jpStocksCore";
import { seedStockBenefits } from "@/app/data/stockBenefits";

/** 手入れマスタのみに無く、シードのみの銘柄（自動社名登録の対象） */
const jpCodeSet = new Set(jpStocksCore.map((s) => s.code));

/**
 * 優待シードにはあるが jpStocks に無い銘柄コード。
 * UI では `stocksClient.buildFallbackStockRecord` により
 * 「{code}（銘柄名未登録）」と表示される。
 */
export const seedOnlyStockCodes: readonly string[] = Object.freeze(
  [...new Set(seedStockBenefits.map((b) => b.stockCode))]
    .filter((code) => !isDelistedStockCode(code))
    .filter((code) => !jpCodeSet.has(code))
    .sort()
);

export const seedOnlyStockCount = seedOnlyStockCodes.length;
