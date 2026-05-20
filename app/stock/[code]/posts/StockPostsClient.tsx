"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import StockReportSection from "../StockReportSection";
import StockUsageSection from "../StockUsageSection";

type Props = {
  code: string;
  fallbackStock: StockRecord;
};

export default function StockPostsClient({ code, fallbackStock }: Props) {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [reports, setReports] = useState<BenefitReport[]>([]);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);

  const reload = useCallback(() => {
    setReports(loadReportsForStock(code));
    setUsageReports(loadUsageReportsForStock(code));
  }, [code]);

  useEffect(() => {
    const customStocks = loadCustomStocks();
    setStocks(mergeStocks(getDefaultStocks(), customStocks));
    reload();
  }, [code, reload]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key.startsWith("benefit-reports:") ||
        e.key.startsWith("benefit-usage-reports:")
      ) {
        reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [code, reload]);

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
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href={`/stock/${code}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <span aria-hidden>←</span>
            <span>銘柄ページに戻る</span>
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
          <Link href={`/stock/${code}`} className="hover:underline">
            {stock.name}
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">投稿一覧</span>
        </nav>

        <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
          {stock.name}（{code}）の投稿一覧
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          この銘柄の「届いた」「使った」の投稿を条件に応じてすべて表示します。新規投稿は銘柄ページのフォームから行えます。
        </p>

        <StockReportSection
          stockCode={stock.code}
          stockName={stock.name}
          reports={reports}
          onAddReport={handleAddReport}
          onUpdateReport={handleUpdateReport}
          onDeleteReport={handleDeleteReport}
          hideComposer
        />

        <StockUsageSection
          stockCode={stock.code}
          stockName={stock.name}
          reports={usageReports}
          onAddReport={handleAddUsageReport}
          onUpdateReport={handleUpdateUsageReport}
          onDeleteReport={handleDeleteUsageReport}
          hideComposer
        />
      </div>
    </main>
  );
}
