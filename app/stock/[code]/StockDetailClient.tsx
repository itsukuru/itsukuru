"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BenefitReport } from "@/app/data/benefitReports";
import type { UsageReport } from "@/app/data/usageReports";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import {
  addLocalReport,
  deleteLocalReport,
  loadReportsForStock,
  updateLocalReport,
} from "@/app/lib/reportsClient";
import {
  addLocalUsageReport,
  deleteLocalUsageReport,
  loadUsageReportsForStock,
  updateLocalUsageReport,
} from "@/app/lib/usageReportsClient";
import { unmarkOwnPost } from "@/app/lib/ownPostsClient";
import { STOCK_POST_LIST_PREVIEW_LIMIT } from "@/app/lib/postLimitsClient";
import type { StockBenefit } from "@/app/data/stockBenefits";
import StockReportSection from "./StockReportSection";
import StockUsageSection from "./StockUsageSection";
import BenefitInfoSection from "./BenefitInfoSection";
import ArrivalForecastSection from "./ArrivalForecastSection";
import PortfolioActionSection from "./PortfolioActionSection";
import ShareButtons from "./ShareButtons";

type Props = {
  code: string;
  fallbackStock: StockRecord | null;
  benefit?: StockBenefit | null;
};

export default function StockDetailClient({ code, fallbackStock, benefit }: Props) {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [reports, setReports] = useState<BenefitReport[]>([]);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);

  useEffect(() => {
    const customStocks = loadCustomStocks();
    setStocks(mergeStocks(getDefaultStocks(), customStocks));
    if (code) {
      setReports(loadReportsForStock(code));
      setUsageReports(loadUsageReportsForStock(code));
    }
  }, [code]);

  // ハッシュ付き遷移（例: /stock/7203#post-arrival）でフォーム位置までスムーススクロール
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const id = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [code]);

  const stock = useMemo(
    () => stocks.find((item) => item.code === code) ?? fallbackStock,
    [code, fallbackStock, stocks]
  );

  const handleAddReport = (report: BenefitReport) => {
    addLocalReport(code, report);
    setReports((prev) => [report, ...prev]);
  };

  const handleUpdateReport = (reportId: string, patch: Partial<BenefitReport>) => {
    updateLocalReport(code, reportId, patch);
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, ...patch, id: r.id, stockCode: r.stockCode } : r
      )
    );
  };

  const handleDeleteReport = (reportId: string) => {
    deleteLocalReport(code, reportId);
    unmarkOwnPost("report", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleAddUsageReport = (report: UsageReport) => {
    addLocalUsageReport(code, report);
    setUsageReports((prev) => [report, ...prev]);
  };

  const handleUpdateUsageReport = (
    reportId: string,
    patch: Partial<UsageReport>
  ) => {
    updateLocalUsageReport(code, reportId, patch);
    setUsageReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, ...patch, id: r.id, stockCode: r.stockCode } : r
      )
    );
  };

  const handleDeleteUsageReport = (reportId: string) => {
    deleteLocalUsageReport(code, reportId);
    unmarkOwnPost("usage", reportId);
    setUsageReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (!stock) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 一覧に戻る
          </Link>
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-700">
            銘柄が見つかりませんでした。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
          >
            <span aria-hidden>←</span>
            <span>検索に戻る</span>
          </Link>
          <span className="truncate text-xs font-medium text-slate-500">
            {stock.code} {stock.name}
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span>銘柄詳細</span>
          <span className="mx-1">›</span>
          <span className="text-slate-700">{stock.code}</span>
        </nav>

        <section className="mt-2 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">証券コード {stock.code}</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {stock.name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {stock.market}・{stock.industry}
            </p>
          </div>
        </section>

        <PortfolioActionSection
          stockCode={stock.code}
          minShares={benefit?.minShares}
        />

        <ShareButtons stockCode={stock.code} stockName={stock.name} />

        <ArrivalForecastSection reports={reports} benefit={benefit} />

        <BenefitInfoSection stockCode={stock.code} />

        <StockReportSection
          stockCode={stock.code}
          stockName={stock.name}
          reports={reports}
          onAddReport={handleAddReport}
          onUpdateReport={handleUpdateReport}
          onDeleteReport={handleDeleteReport}
          listPreviewLimit={STOCK_POST_LIST_PREVIEW_LIMIT}
          seeAllListHref={`/stock/${stock.code}/posts#post-arrival`}
          postsArchiveHref={`/stock/${stock.code}/posts`}
        />

        <StockUsageSection
          stockCode={stock.code}
          stockName={stock.name}
          reports={usageReports}
          onAddReport={handleAddUsageReport}
          onUpdateReport={handleUpdateUsageReport}
          onDeleteReport={handleDeleteUsageReport}
          listPreviewLimit={STOCK_POST_LIST_PREVIEW_LIMIT}
          seeAllListHref={`/stock/${stock.code}/posts#post-usage`}
          postsArchiveHref={`/stock/${stock.code}/posts`}
        />
      </div>
    </main>
  );
}
