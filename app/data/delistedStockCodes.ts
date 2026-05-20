/**
 * 上場廃止済みのため、検索・一覧・銘柄ページの母集団から除外する銘柄コード。
 * 優待シードに過去情報が残っていても、現行の上場銘柄としては表示しない。
 */
export const DELISTED_STOCK_CODES = new Set<string>([
  "2412", // ベネフィット・ワン
  "2706", // ブロッコリー
  "2925", // ピックルスコーポレーション（持株会社移行前コード）
  "4517", // ビオフェルミン製薬
  "4541", // 日医工
  "4921", // ファンケル
  "7816", // スノーピーク
  "9783", // ベネッセホールディングス
]);

export const isDelistedStockCode = (code: string): boolean =>
  DELISTED_STOCK_CODES.has(code.trim());
