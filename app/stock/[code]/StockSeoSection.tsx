import Link from "next/link";
import type { StockRecord } from "@/app/lib/stocksClient";
import { getResolvedMasterStocks } from "@/app/lib/stocksClient";
import type { StockBenefit } from "@/app/data/stockBenefits";
import { seedStockBenefits } from "@/app/data/stockBenefits";

const RESOLVED_MASTER: StockRecord[] = getResolvedMasterStocks();

/**
 * 個別銘柄ページ下部: 見出しと関連銘柄リンクのみ（本文の長文は出さない）。
 * 構造化データ・meta は page.tsx 側で担保する。
 */
type Props = {
  stock: StockRecord;
  benefit: StockBenefit | null;
};

const monthSuffixToParts = (rightsMonths?: string): number[] => {
  if (!rightsMonths) return [];
  const out: number[] = [];
  const re = /(\d{1,2})\s*月/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rightsMonths)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 12 && !out.includes(n)) out.push(n);
  }
  return out;
};

const monthsToText = (months: number[]): string =>
  months.map((m) => `${m}月`).join("・");

type BenefitWithMonths = { stockCode: string; months: number[]; benefit: StockBenefit };

const benefitsWithMonthsCache: BenefitWithMonths[] = (() => {
  const out: BenefitWithMonths[] = [];
  for (const b of seedStockBenefits) {
    if (b.confidence === "abolished") continue;
    const months = monthSuffixToParts(b.rightsMonths);
    if (months.length === 0) continue;
    out.push({ stockCode: b.stockCode, months, benefit: b });
  }
  return out;
})();

const masterStockByCode: Map<string, StockRecord> = new Map(
  RESOLVED_MASTER.map((s) => [s.code, s])
);

const stocksByIndustry: Map<string, StockRecord[]> = (() => {
  const out = new Map<string, StockRecord[]>();
  for (const s of RESOLVED_MASTER) {
    const list = out.get(s.industry) ?? [];
    list.push(s);
    out.set(s.industry, list);
  }
  return out;
})();

export default function StockSeoSection({ stock, benefit }: Props) {
  const isAbolished = benefit?.confidence === "abolished";
  const rightsMonthsList = monthSuffixToParts(benefit?.rightsMonths);

  const relatedSameMonth: { code: string; name: string }[] = [];
  if (rightsMonthsList.length > 0) {
    const monthSet = new Set(rightsMonthsList);
    for (const bw of benefitsWithMonthsCache) {
      if (bw.stockCode === stock.code) continue;
      if (!bw.months.some((m) => monthSet.has(m))) continue;
      const s = masterStockByCode.get(bw.stockCode);
      if (!s) continue;
      relatedSameMonth.push({ code: s.code, name: s.name });
      if (relatedSameMonth.length >= 8) break;
    }
  }

  const relatedSameIndustry = (stocksByIndustry.get(stock.industry) ?? [])
    .filter((s) => s.code !== stock.code)
    .slice(0, 6)
    .map((s) => ({ code: s.code, name: s.name }));

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
        {stock.name}（{stock.code}）の株主優待はいつ届く？
      </h2>

      {isAbolished ? (
        <p className="mt-3 text-sm text-slate-600">
          この銘柄は現在、株主優待を実施していません。
        </p>
      ) : null}

      {relatedSameMonth.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">
            {monthsToText(rightsMonthsList)}が権利確定月の他の株主優待銘柄
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {relatedSameMonth.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/stock/${r.code}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-mono text-[10px] text-slate-500">{r.code}</span>
                  <span>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedSameIndustry.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900">{stock.industry}の他の銘柄</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {relatedSameIndustry.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/stock/${r.code}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-mono text-[10px] text-slate-500">{r.code}</span>
                  <span>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
