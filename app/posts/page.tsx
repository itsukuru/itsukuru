"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { loadAllReports, formatRelativeTime, formatCalendarDateJa, isToday } from "@/app/lib/reportsClient";
import { loadAllUsageReports } from "@/app/lib/usageReportsClient";
import { getEffectivePhase, PHASE_META, type BenefitReport } from "@/app/data/benefitReports";
import type { UsageReport } from "@/app/data/usageReports";
import HelpfulButton from "@/app/components/HelpfulButton";
import PostImage from "@/app/components/PostImage";

function buildPostsHref(kind: "arrival" | "usage", todayOnly: boolean): string {
  const base = `/posts?kind=${kind}`;
  return todayOnly ? `${base}&today=1` : base;
}

export default function PostsPage() {
  const searchParams = useSearchParams();
  const rawKind = searchParams?.get("kind");
  const kind: "arrival" | "usage" = rawKind === "usage" ? "usage" : "arrival";
  const todayOnly = searchParams?.get("today") === "1";

  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [arrivalReports, setArrivalReports] = useState<BenefitReport[]>([]);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);

  useEffect(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    setArrivalReports(loadAllReports());
    setUsageReports(loadAllUsageReports());
  }, []);

  const stockByCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);

  const filteredArrivals = useMemo(() => {
    let list = arrivalReports;
    if (todayOnly) list = list.filter((r) => isToday(r.createdAt));
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [arrivalReports, todayOnly]);

  const filteredUsages = useMemo(() => {
    let list = usageReports;
    if (todayOnly) list = list.filter((r) => isToday(r.createdAt));
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [usageReports, todayOnly]);

  const titleLine =
    kind === "usage"
      ? todayOnly
        ? "「使った！」本日の新着"
        : "「使った！」すべての投稿"
      : todayOnly
        ? "「届いた！」本日の新着"
        : "「届いた！」すべての投稿";

  const count = kind === "usage" ? filteredUsages.length : filteredArrivals.length;

  return (
    <main className="min-h-[60vh] bg-white pb-16">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6">
        <p className="text-sm text-slate-500">
          <Link href="/" prefetch={false} className="text-blue-600 hover:underline">
            ホーム
          </Link>
          {" / "}
          <span className="text-slate-700">みんなの投稿</span>
        </p>
        <h1 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{titleLine}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {count}件
          {todayOnly ? "（本日作成された投稿のみ）" : ""}
        </p>

        {/* 種類タブ */}
        <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
          <Link
            href={buildPostsHref("arrival", todayOnly)}
            prefetch={false}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              kind === "arrival"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/80"
            }`}
          >
            届いた！
          </Link>
          <Link
            href={buildPostsHref("usage", todayOnly)}
            prefetch={false}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              kind === "usage"
                ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/80"
            }`}
          >
            使った！
          </Link>
        </div>

        {/* 期間切り替え */}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={buildPostsHref(kind, false)}
            prefetch={false}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              !todayOnly
                ? kind === "usage"
                  ? "border-sky-400 bg-sky-50 text-sky-800"
                  : "border-blue-400 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            累計
          </Link>
          <Link
            href={buildPostsHref(kind, true)}
            prefetch={false}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              todayOnly
                ? kind === "usage"
                  ? "border-sky-400 bg-sky-50 text-sky-800"
                  : "border-blue-400 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            本日の新着だけ
          </Link>
        </div>

        <div className="mt-8 space-y-2">
          {kind === "arrival" &&
            filteredArrivals.map((report) => {
              const stock = stockByCode.get(report.stockCode);
              const reportPhase = getEffectivePhase(report);
              const phaseMeta = PHASE_META[reportPhase];
              return (
                <article
                  key={`a-${report.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${phaseMeta.colorClass}`}
                      >
                        {phaseMeta.emoji} 届いた
                      </span>
                      <Link
                        href={`/stock/${report.stockCode}`}
                        prefetch={false}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {stock ? `${stock.code} ${stock.name}` : report.stockCode}
                      </Link>
                      {report.reporterName === "匿名" ? (
                        <span className="font-medium text-slate-900">匿名</span>
                      ) : (
                        <Link
                          href={`/u/${encodeURIComponent(report.reporterName)}`}
                          prefetch={false}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                        >
                          {report.reporterName}
                        </Link>
                      )}
                      {report.region && <span className="text-slate-500">{report.region}</span>}
                      <span className="text-slate-500">
                        {reportPhase === "pending" ? (
                          <>・{formatCalendarDateJa(report.arrivalDate)} 時点（まだ届いていない）</>
                        ) : (
                          <>・{formatCalendarDateJa(report.arrivalDate)} 到着</>
                        )}
                      </span>
                    </div>
                    <span className="shrink-0 text-slate-400">{formatRelativeTime(report.createdAt)}</span>
                  </div>
                  {report.comment.trim() !== "" && (
                    <p className="mt-1.5 text-sm text-slate-700">{report.comment}</p>
                  )}
                  {report.imageUrl && <PostImage src={report.imageUrl} alt="優待写真" />}
                  <div className="mt-2 flex justify-end">
                    <HelpfulButton
                      targetType="arrival"
                      targetId={report.id}
                      initialCount={report.helpfulCount ?? 0}
                    />
                  </div>
                </article>
              );
            })}

          {kind === "usage" &&
            filteredUsages.map((report) => {
              const stock = stockByCode.get(report.stockCode);
              return (
                <article
                  key={`u-${report.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                        🎫 使った
                      </span>
                      <Link
                        href={`/stock/${report.stockCode}`}
                        prefetch={false}
                        className="font-semibold text-sky-800 hover:underline"
                      >
                        {stock ? `${stock.code} ${stock.name}` : report.stockCode}
                      </Link>
                      {report.reporterName === "匿名" ? (
                        <span className="font-medium text-slate-900">匿名</span>
                      ) : (
                        <Link
                          href={`/u/${encodeURIComponent(report.reporterName)}`}
                          prefetch={false}
                          className="font-medium text-slate-900 hover:text-sky-700 hover:underline"
                        >
                          {report.reporterName}
                        </Link>
                      )}
                      {report.region && <span className="text-slate-500">{report.region}</span>}
                      <span className="text-slate-500">・{formatCalendarDateJa(report.usedDate)} 使用</span>
                    </div>
                    <span className="shrink-0 text-slate-400">{formatRelativeTime(report.createdAt)}</span>
                  </div>
                  {report.comment.trim() !== "" && (
                    <p className="mt-1.5 text-sm text-slate-700">{report.comment}</p>
                  )}
                  {report.imageUrl && <PostImage src={report.imageUrl} alt="使ったシーンの写真" />}
                  <div className="mt-2 flex justify-end">
                    <HelpfulButton
                      targetType="usage"
                      targetId={report.id}
                      initialCount={report.helpfulCount ?? 0}
                    />
                  </div>
                </article>
              );
            })}

          {count === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {todayOnly ? "この条件の投稿はまだありません。" : "まだこの種類の投稿はありません。"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
