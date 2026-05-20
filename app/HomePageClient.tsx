"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { loadFavoriteCodes } from "@/app/lib/favoritesClient";
import { loadHoldings } from "@/app/lib/holdingsClient";
import {
  formatRelativeTime,
  formatCalendarDateJa,
  isToday,
  loadAllReports,
  loadReportsForStock,
} from "@/app/lib/reportsClient";
import { loadAllUsageReports } from "@/app/lib/usageReportsClient";
import { getEffectivePhase, type BenefitReport } from "@/app/data/benefitReports";
import type { UsageReport } from "@/app/data/usageReports";
import { loadBenefitForStock } from "@/app/lib/benefitsClient";
import { computeArrivalForecast, formatMonthDay } from "@/app/lib/forecastClient";
import { triggerUpcomingArrivalNotifications } from "@/app/lib/notificationsClient";
import { SITE_NAME, SITE_TAGLINE_PRIMARY, SITE_TAGLINE_SECONDARY } from "@/app/lib/siteConfig";
import HeaderStockSearch from "@/app/components/HeaderStockSearch";

const LATEST_LIMIT = 8;

export default function HomePageClient() {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [arrivalReports, setArrivalReports] = useState<BenefitReport[]>([]);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);
  const [holdingCodes, setHoldingCodes] = useState<string[]>([]);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);

  useEffect(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    setArrivalReports(loadAllReports());
    setUsageReports(loadAllUsageReports());
    const h = loadHoldings();
    setHoldingCodes(Object.keys(h).filter((code) => (h[code] ?? 0) > 0));
    setFavoriteCodes(loadFavoriteCodes().filter((code) => (h[code] ?? 0) === 0));

    void (async () => {
      try {
        await triggerUpcomingArrivalNotifications();
      } catch {
        /* 通知はベストエフォート */
      }
    })();
  }, []);

  const stockByCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);

  const todayNewCount = useMemo(() => {
    const a = arrivalReports.filter((r) => isToday(r.createdAt)).length;
    const u = usageReports.filter((r) => isToday(r.createdAt)).length;
    return a + u;
  }, [arrivalReports, usageReports]);

  const cumulativeCount = arrivalReports.length + usageReports.length;

  const latestArrivals = useMemo(() => {
    return [...arrivalReports]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, LATEST_LIMIT);
  }, [arrivalReports]);

  const upcomingPreview = useMemo(() => {
    const rows: { code: string; name: string; line: string }[] = [];
    for (const code of holdingCodes.slice(0, 4)) {
      const stock = stockByCode.get(code);
      const benefit = loadBenefitForStock(code);
      const reports = loadReportsForStock(code);
      const forecast = computeArrivalForecast(reports, { benefit });
      if (!forecast) continue;
      const line = `次の到着の目安: ${formatMonthDay(forecast.nextEstimate)}（届いた投稿 ${forecast.rawReportCount} 件から算出）`;
      rows.push({
        code,
        name: stock?.name ?? code,
        line,
      });
    }
    return rows;
  }, [holdingCodes, stockByCode]);

  return (
    <main className="min-h-screen bg-white">
      {/* ── ヒーロー：左キャッチ + 投稿CTA／右検索カード ── */}
      <section className="bg-gradient-to-b from-sky-50 via-blue-50/40 to-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-3 sm:px-6 sm:pt-12 sm:pb-4 lg:pt-14 lg:pb-4 xl:pb-5">
          <div className="grid gap-x-8 gap-y-8 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-12 lg:items-start">
            <div className="flex flex-col gap-7 lg:col-span-7 lg:gap-8">
              <div className="max-w-xl space-y-3 sm:space-y-3.5 lg:max-w-none xl:max-w-3xl">
                <h1 className="text-[clamp(1.5rem,6.2vw,3.875rem)] font-bold leading-[1.15] tracking-tight text-blue-950">
                  <span className="whitespace-nowrap">
                    あなたの優待、いつ
                    <span className="text-blue-600">クル</span>？
                  </span>
                </h1>
                <p className="text-[0.8125rem] leading-snug text-slate-800 sm:text-sm sm:leading-snug xl:text-base xl:whitespace-nowrap">
                  {SITE_TAGLINE_PRIMARY}　{SITE_TAGLINE_SECONDARY}
                </p>
              </div>

              <div className="flex max-w-xl flex-col gap-4 lg:max-w-none xl:max-w-3xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                  <Link
                    href="/search?intent=post-arrival"
                    prefetch={false}
                    className="inline-flex flex-1 items-center justify-center gap-3.5 rounded-2xl bg-blue-600 px-10 py-[1.375rem] text-xl font-bold text-white shadow-md transition hover:bg-blue-700 sm:flex-none sm:min-w-[19rem]"
                  >
                    <span aria-hidden className="text-2xl leading-none">
                      🎁
                    </span>
                    届いたを投稿
                  </Link>
                  <Link
                    href="/search?intent=post-usage"
                    prefetch={false}
                    className="inline-flex flex-1 items-center justify-center gap-3.5 rounded-2xl border border-sky-200 bg-sky-100 px-10 py-[1.375rem] text-xl font-bold text-blue-950 shadow-md transition hover:bg-sky-200/90 sm:flex-none sm:min-w-[19rem]"
                  >
                    <span aria-hidden className="text-2xl leading-none">
                      🎫
                    </span>
                    使ったを投稿
                  </Link>
                </div>

                <p className="text-sm leading-relaxed text-slate-600">
                  ※閲覧は登録不要です。匿名でも投稿できます。
                </p>

                <nav
                  aria-label="主要ページへのリンク"
                  className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] font-medium text-blue-700 sm:gap-x-7 sm:text-base"
                >
                  <Link href="/search" prefetch={false} className="hover:underline">
                    銘柄・優待を検索
                  </Link>
                  <Link href="/calendar" prefetch={false} className="hover:underline">
                    優待カレンダー
                  </Link>
                  <Link href="/faq" prefetch={false} className="hover:underline">
                    よくある質問・FAQ
                  </Link>
                  <Link href="/mypage" prefetch={false} className="hover:underline">
                    マイページ
                  </Link>
                </nav>
              </div>
            </div>

            <div id="stock-search" className="flex flex-col gap-3 sm:gap-4 lg:col-span-5 lg:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">銘柄を検索する</h2>
                <p className="mt-2 text-sm text-slate-500">
                  社名または証券コードの一部で候補にジャンプできます。
                </p>
                <div className="mt-4">
                  <HeaderStockSearch
                    inputId="home-hero-stock-search"
                    className="w-full"
                  />
                  <p className="mt-2 text-[11px] text-slate-400">
                    例: <span className="font-medium text-slate-600">トヨタ</span> ／{" "}
                    <span className="font-medium text-slate-600">7203</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-sm font-semibold tracking-tight text-slate-800 sm:text-[0.9375rem]">
                  ここからすぐ
                </h2>
                <ul className="mt-3 space-y-2.5 text-xs leading-snug text-blue-700 sm:text-[13px] sm:leading-snug">
                  <li>
                    <Link
                      href="/search"
                      prefetch={false}
                      className="inline-block whitespace-nowrap hover:underline"
                    >
                      ▸ 権利月・ジャンルなどから銘柄を絞り込む
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/calendar"
                      prefetch={false}
                      className="inline-block whitespace-nowrap hover:underline"
                    >
                      ▸ 保有銘柄の権利から、カレンダーで届く月を見る
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      prefetch={false}
                      className="inline-block whitespace-nowrap hover:underline"
                    >
                      ▸ よくある質問・FAQ
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 特徴3点 + 統計 ── */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-2 pb-10 sm:px-6 sm:pt-4 sm:pb-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-4 text-center">
            <span className="text-2xl" aria-hidden>
              🎁
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-800">投稿から到着時期を予測</p>
            <p className="mt-1 text-xs text-slate-600 leading-snug">
              「届いた」報告が集まるほど、その銘柄の次の目安がはっきりします。
            </p>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-4 text-center">
            <span className="text-2xl" aria-hidden>
              🎫
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-800">使い方や感想もシェア</p>
            <p className="mt-1 text-xs text-slate-600 leading-snug">
              「使った」で活用のヒントを残せます。
            </p>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-4 text-center">
            <span className="text-2xl" aria-hidden>
              ⭐
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-800">気になる銘柄をチェック</p>
            <p className="mt-1 text-xs text-slate-600 leading-snug">
              マイページのキニナルや通知で、見逃しを防ぎます。
            </p>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-bold text-slate-900 sm:text-xl">
          みんなの投稿でわかる！「届いた」「使った」の今
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">本日の新着投稿</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-blue-600 sm:text-4xl">
              {todayNewCount}
              <span className="ml-1 text-lg font-semibold text-slate-600">件</span>
            </p>
            <p className="mt-3 text-right">
              <Link
                href="/posts?kind=arrival&today=1"
                prefetch={false}
                className="text-xs font-medium text-blue-600 hover:underline sm:text-sm"
              >
                本日の届いた一覧 →
              </Link>
              {" · "}
              <Link
                href="/posts?kind=usage&today=1"
                prefetch={false}
                className="text-xs font-medium text-sky-700 hover:underline sm:text-sm"
              >
                本日の使った一覧 →
              </Link>
            </p>
          </div>
          <Link
            href="/posts"
            prefetch={false}
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-slate-50/80"
          >
            <p className="text-sm font-semibold text-slate-700">現在の投稿数（累計）</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
              {cumulativeCount}
              <span className="ml-1 text-lg font-semibold text-slate-600">件</span>
            </p>
            <p className="mt-3 text-sm font-medium text-blue-600">みんなの投稿一覧ページを見る →</p>
          </Link>
        </div>
      </section>

      {holdingCodes.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">もうすぐ届きそうな保有銘柄</h2>
          <p className="mt-1 text-xs text-slate-500">
            この端末に登録した保有株です（投稿があれば優先して表示）。
          </p>
          {upcomingPreview.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              まだ予測を出せるデータがありません。銘柄ページで「届いた！」が集まると表示されます。
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {upcomingPreview.map((row) => (
                <li key={row.code}>
                  <Link
                    href={`/stock/${row.code}`}
                    prefetch={false}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-semibold text-slate-900">
                      {row.code} {row.name}
                    </span>
                    <span className="mt-1 text-sm text-slate-600 sm:mt-0">{row.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">新着の投稿</h2>
          <Link href="/posts" prefetch={false} className="text-sm font-medium text-blue-600 hover:underline">
            すべて見る
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {latestArrivals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              まだ投稿がありません。
            </p>
          ) : (
            latestArrivals.map((report) => {
              const stock = stockByCode.get(report.stockCode);
              const ph = getEffectivePhase(report);
              const dateLine =
                ph === "pending"
                  ? `${formatCalendarDateJa(report.arrivalDate)} 時点・まだ届いていない`
                  : `${formatCalendarDateJa(report.arrivalDate)} 到着`;
              const meta = [report.reporterName !== "匿名" ? report.reporterName : null, report.region]
                .filter(Boolean)
                .join(" · ");
              return (
                <Link
                  key={report.id}
                  href={`/stock/${report.stockCode}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {stock ? `${stock.code} ${stock.name}` : report.stockCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[meta || "匿名", dateLine].filter(Boolean).join(" ・ ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatRelativeTime(report.createdAt)}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {(holdingCodes.length > 0 || favoriteCodes.length > 0) && (
          <p className="mt-6 text-xs text-slate-500">
            保有銘柄 {holdingCodes.length}件 ・ キニナル {favoriteCodes.length}件（マイページで管理）
          </p>
        )}
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            株主優待がいつ届くかを「みんなの実体験」で予測
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            <strong>{SITE_NAME}</strong>
            は、上場企業の株主優待品がいつ自宅に届くかを、実際に受け取った株主の投稿から共有・予測する情報サイトです。
            権利確定月の約2〜3ヶ月後に発送されることが多い株主優待ですが、銘柄や年によって時期は様々です。
            みんなの「届いた！」投稿が集まることで、より正確な到着予測ができるようになります。
          </p>

          <h3 className="mt-6 text-base font-bold text-slate-900">主な使い方</h3>
          <ol className="mt-2 ml-5 list-decimal space-y-1 text-sm text-slate-700">
            <li>右上またはこのページの検索欄で、証券コード・社名から銘柄を探す</li>
            <li>銘柄詳細ページで「届いた！」「使った！」投稿を確認する</li>
            <li>
              保有銘柄を登録すると
              <Link href="/mypage" className="text-blue-600 hover:underline" prefetch={false}>
                マイページ
              </Link>
              でスケジュールを管理できます
            </li>
          </ol>
          <h3 className="mt-5 text-base font-bold text-slate-900">関連ページ</h3>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-sm">
            <li>
              <Link href="/faq" className="text-blue-600 hover:underline" prefetch={false}>
                よくある質問・FAQ
              </Link>
            </li>
            <li>
              <Link href="/search" className="text-blue-600 hover:underline" prefetch={false}>
                銘柄を検索する
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-blue-600 hover:underline" prefetch={false}>
                サイトについて
              </Link>
            </li>
          </ul>
          <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            ※ 本サイトは情報共有を目的としており、投資勧誘や金融商品取引業として登録されたサービスではありません。各銘柄の最新の優待内容・権利確定日は必ず公式IRページでご確認ください。
          </p>
        </div>
      </section>
    </main>
  );
}
