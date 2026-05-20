import type { StockBenefit } from "@/app/data/stockBenefits";
import { loadBenefitForStock } from "@/app/lib/benefitsClient";
import {
  computeArrivalForecast,
  formatMonthDay,
  inferExpectedArrival,
} from "@/app/lib/forecastClient";
import { parseRightsMonths, type Holdings } from "@/app/lib/holdingsClient";
import { loadReportsForStock } from "@/app/lib/reportsClient";
import { approxNextArrivalFromRightsMonth } from "@/app/lib/rightsArrivalApprox";
import type { StockRecord } from "@/app/lib/stocksClient";

const MS_PER_DAY = 86_400_000;

function daysBetweenFromToday(target: Date): number {
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0, 0);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY));
}

/** 権利月から「次の届け目安日」までの日数（並び替え用）。取れなければ null */
function nearestApproxArrivalDays(benefit: StockBenefit | null): number | null {
  if (!benefit) return null;
  const months = parseRightsMonths(benefit.rightsMonths ?? "");
  if (months.length === 0) return null;
  const now = new Date();
  let best: number | null = null;
  for (const m of months) {
    const when = approxNextArrivalFromRightsMonth(m, now);
    const d = daysBetweenFromToday(when);
    if (best === null || d < best) best = d;
  }
  return best;
}

/**
 * 投稿ベースの予測が無いときの表示:
 * 1) IR・企業案内（actualArrival / expectedArrival / noticeArrival）
 * 2) 権利月からの一般的な目安（inferExpectedArrival）
 * 3) 上記も無ければ「未予測」
 */
function estimateLabelWithoutForecast(
  benefit: StockBenefit | null
): { label: string; daysUntil: number | null } {
  if (!benefit) return { label: "未予測", daysUntil: null };

  const actualOrExpected =
    benefit.actualArrival?.trim() || benefit.expectedArrival?.trim();
  if (actualOrExpected) {
    return { label: actualOrExpected, daysUntil: nearestApproxArrivalDays(benefit) };
  }

  const notice = benefit.noticeArrival?.trim();
  if (notice) {
    return { label: notice, daysUntil: nearestApproxArrivalDays(benefit) };
  }

  const inferred = inferExpectedArrival(benefit.rightsMonths);
  if (inferred) {
    return { label: inferred, daysUntil: nearestApproxArrivalDays(benefit) };
  }

  return { label: "未予測", daysUntil: null };
}

export type StockRow = {
  stock: StockRecord;
  benefit: StockBenefit | null;
  shares: number;
  nextEstimateLabel: string;
  daysUntil: number | null;
  latestArrival: string | null;
};

/** 「次に届く目安」が近い順（未予測は後ろ） */
export const sortStockRowsByUpcoming = (rows: StockRow[]): StockRow[] =>
  [...rows].sort((a, b) => {
    if (a.daysUntil === null && b.daysUntil === null) return 0;
    if (a.daysUntil === null) return 1;
    if (b.daysUntil === null) return -1;
    return a.daysUntil - b.daysUntil;
  });

export const buildStockRow = (
  stock: StockRecord,
  holdings: Holdings,
  benefitLoader: (code: string) => StockBenefit | null = loadBenefitForStock
): StockRow => {
  const benefit = benefitLoader(stock.code);
  const reports = loadReportsForStock(stock.code);
  const forecast = computeArrivalForecast(reports, { benefit });
  const latestArrival =
    reports
      .slice()
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate))[0]?.arrivalDate ?? null;
  const shares = holdings[stock.code] ?? 0;

  let nextEstimateLabel: string;
  let daysUntil: number | null;
  if (forecast) {
    nextEstimateLabel = formatMonthDay(forecast.nextEstimate);
    daysUntil = forecast.daysUntil;
  } else {
    const fb = estimateLabelWithoutForecast(benefit);
    nextEstimateLabel = fb.label;
    daysUntil = fb.daysUntil;
  }

  return {
    stock,
    benefit,
    shares,
    nextEstimateLabel,
    daysUntil,
    latestArrival,
  };
};

export const computeHoldingRows = (
  holdings: Holdings,
  stocks: StockRecord[]
): StockRow[] => {
  const byCode = new Map(stocks.map((s) => [s.code, s]));
  const rows: StockRow[] = [];

  for (const [code, shares] of Object.entries(holdings)) {
    if (!(shares > 0)) continue;
    const stock = byCode.get(code);
    if (!stock) continue;
    rows.push(buildStockRow(stock, holdings, loadBenefitForStock));
  }

  return sortStockRowsByUpcoming(rows);
};

export const computeWatchingRows = (
  favoriteCodes: string[],
  holdings: Holdings,
  stocks: StockRecord[]
): StockRow[] => {
  const byCode = new Map(stocks.map((s) => [s.code, s]));
  const rows: StockRow[] = [];

  for (const code of favoriteCodes) {
    if ((holdings[code] ?? 0) > 0) continue;
    const stock = byCode.get(code);
    if (!stock) continue;
    rows.push(buildStockRow(stock, holdings, loadBenefitForStock));
  }

  return sortStockRowsByUpcoming(rows);
};
