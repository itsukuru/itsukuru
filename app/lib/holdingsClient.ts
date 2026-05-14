const HOLDINGS_KEY = "stock-holdings:v1";

export type Holdings = Record<string, number>;

export const loadHoldings = (): Holdings => {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = localStorage.getItem(HOLDINGS_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const result: Holdings = {};
    for (const [code, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        result[code] = n;
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const saveHoldings = (h: Holdings) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(h));
};

/**
 * 1銘柄分の保有株数を更新する（ローカル保存のみ）。
 * 将来クラウド連携を入れる場合は、ここに送信処理を追加する。
 *
 * @param code 銘柄コード
 * @param shares 保有株数（0以下なら削除）
 */
export const setHoldingShares = (code: string, shares: number): Holdings => {
  const h = loadHoldings();
  const normalized = Number.isFinite(shares) && shares > 0 ? Number(shares) : 0;
  if (normalized <= 0) {
    delete h[code];
  } else {
    h[code] = normalized;
  }
  saveHoldings(h);
  return h;
};

export const parseRightsMonths = (text: string): number[] => {
  if (!text) return [];
  const matches = [...text.matchAll(/(\d{1,2})\s*月/g)];
  const months = matches
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => n >= 1 && n <= 12);
  return Array.from(new Set(months)).sort((a, b) => a - b);
};
