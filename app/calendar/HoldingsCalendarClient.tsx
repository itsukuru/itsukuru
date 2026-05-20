"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getEffectiveConfidence } from "@/app/data/stockBenefits";
import { loadBenefitForStock } from "@/app/lib/benefitsClient";
import {
  computeArrivalForecast,
  formatMonthDay,
  inferExpectedArrival,
} from "@/app/lib/forecastClient";
import { loadHoldings, parseRightsMonths } from "@/app/lib/holdingsClient";
import { loadReportsForStock } from "@/app/lib/reportsClient";
import { approxNextArrivalFromRightsMonth } from "@/app/lib/rightsArrivalApprox";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { SITE_URL, SITE_NAME } from "@/app/lib/siteConfig";

type TimelineRow = {
  id: string;
  code: string;
  name: string;
  shares: number;
  when: Date;
  badgeKind: "report" | "estimate";
  body: string;
};

type UnknownRightsRow = {
  code: string;
  name: string;
  shares: number;
};

type AbolishedRow = {
  code: string;
  name: string;
  shares: number;
};

type ArrivalMonthBucket = {
  /** アンカー用 `arrival-YYYY-MM` */
  id: string;
  year: number;
  month: number;
  heading: string;
  rows: TimelineRow[];
};

function buildArrivalMonthBuckets(timeline: TimelineRow[]): ArrivalMonthBucket[] {
  const byKey = new Map<string, TimelineRow[]>();
  for (const row of timeline) {
    const y = row.when.getFullYear();
    const m = row.when.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const xs = byKey.get(key) ?? [];
    xs.push(row);
    byKey.set(key, xs);
  }

  const sortedKeys = [...byKey.keys()].sort();
  return sortedKeys.map((key) => {
    const rows = [...(byKey.get(key) ?? [])].sort(
      (a, b) => a.when.getTime() - b.when.getTime()
    );
    const sample = rows[0]!.when;
    const y = sample.getFullYear();
    const m = sample.getMonth() + 1;
    return {
      id: `arrival-${key}`,
      year: y,
      month: m,
      heading: `${y}年${m}月ごろ届く予測`,
      rows,
    };
  });
}

const EMPTY_CALENDAR_MODEL = {
  holdingCount: 0,
  arrivalBuckets: [] as ArrivalMonthBucket[],
  timeline: [] as TimelineRow[],
  unknownRights: [] as UnknownRightsRow[],
  abolishedRows: [] as AbolishedRow[],
};

function deriveCalendarModel(stocks: StockRecord[]) {
  const stockMap = new Map(stocks.map((s) => [s.code, s]));
  const holdings = loadHoldings();

  const timeline: TimelineRow[] = [];
  const unknownRights: UnknownRightsRow[] = [];
  const abolishedRows: AbolishedRow[] = [];

  const now = new Date();

  for (const [codeRaw, shares] of Object.entries(holdings)) {
    const sharesNorm = Number(shares);
    if (!Number.isFinite(sharesNorm) || sharesNorm <= 0) continue;

    const code = codeRaw.trim();
    const stock = stockMap.get(code);
    if (!stock) continue;

    const benefit = loadBenefitForStock(code);
    if (!benefit) {
      unknownRights.push({ code: stock.code, name: stock.name, shares: sharesNorm });
      continue;
    }

    const confidence = getEffectiveConfidence(benefit);
    if (confidence === "abolished") {
      abolishedRows.push({ code: stock.code, name: stock.name, shares: sharesNorm });
      continue;
    }

    const rightsMonths = parseRightsMonths(benefit.rightsMonths ?? "");
    const inferText = inferExpectedArrival(benefit.rightsMonths);
    const seedTiming = [benefit.expectedArrival, benefit.noticeArrival].filter(Boolean).join("／");

    const forecast = computeArrivalForecast(loadReportsForStock(code), {
      benefit,
    });

    if (rightsMonths.length === 0) {
      unknownRights.push({ code: stock.code, name: stock.name, shares: sharesNorm });
    }

    if (forecast) {
      forecast.cycles.forEach((cycle, idx) => {
        timeline.push({
          id: `${code}-forecast-${cycle.monthIndex}-${idx}`,
          code: stock.code,
          name: stock.name,
          shares: sharesNorm,
          when: cycle.nextEstimate,
          badgeKind: "report",
          body: `到着報告から推定 ・ ${formatMonthDay(cycle.nextEstimate)}想定（過去データ ${cycle.count}件、あと約${cycle.daysUntil}日）`,
        });
      });
    } else if (rightsMonths.length > 0) {
      for (const m of rightsMonths) {
        const when = approxNextArrivalFromRightsMonth(m, now);
        timeline.push({
          id: `${code}-est-${m}`,
          code: stock.code,
          name: stock.name,
          shares: sharesNorm,
          when,
          badgeKind: "estimate",
          body: `${m}月末権利想定で ${formatMonthDay(when)}前後にお届けの例が多い（一般的には権利約3か月後）${inferText ? ` ・ ${inferText}` : ""}${seedTiming ? ` ・ IR目安:${seedTiming}` : ""}`,
        });
      }
    }
  }

  timeline.sort((a, b) => a.when.getTime() - b.when.getTime());

  const arrivalBuckets = buildArrivalMonthBuckets(timeline);

  return {
    holdingCount: Object.entries(holdings).filter(([, s]) => Number(s) > 0).length,
    arrivalBuckets,
    timeline,
    unknownRights,
    abolishedRows,
  };
}

export default function HoldingsCalendarClient() {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const model = useMemo(
    () => (mounted ? deriveCalendarModel(stocks) : EMPTY_CALENDAR_MODEL),
    [stocks, tick, mounted]
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "保有銘柄の優待カレンダー",
        item: `${SITE_URL}/calendar`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="min-h-screen bg-slate-50 pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <nav aria-label="パンくず" className="text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1">›</span>
            <span className="text-slate-700">優待カレンダー</span>
          </nav>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            📅 保有銘柄の優待カレンダー
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            <strong>マイページや銘柄ページで保有株を登録した銘柄だけ</strong>を表示します。
            「いつごろ優待が届くか」を<strong>届く時期の年月</strong>でまとめています（権利確定月では並べていません）。到着報告の投稿がある銘柄は、そのパターンを優先して予測します。
          </p>

          {model.holdingCount === 0 ? (
            <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <p className="text-sm font-medium text-amber-900">まだ保有銘柄がありません。</p>
              <p className="mt-2 text-sm text-amber-800">
                各銘柄の詳細ページの「＋ 保有銘柄に追加」から株数を登録すると、ここにだけあなた向けのスケジュールが表示されます。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/mypage"
                  className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  マイページへ
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  prefetch={false}
                >
                  銘柄を探す
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">クイックジャンプ（届く年月）</h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {model.arrivalBuckets.map((b) => (
                    <li key={b.id}>
                      <a
                        href={`#${b.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {b.year}年{b.month}月（{b.rows.length}）
                      </a>
                    </li>
                  ))}
                </ul>
                {model.arrivalBuckets.length === 0 && (
                  <p className="mt-4 text-xs text-slate-500">ジャンプできる届く月のグループがありません。</p>
                )}
              </section>

              <section className="mt-8 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">📮 優待が届く月ごと（予測）</h2>
                  <p className="mt-2 text-xs text-slate-600">
                    各銘柄の<strong>「予測された到着日」</strong>の属する<strong>年月</strong>でグループ分けしています（例: 「2027年7月」の欄には、その月にお届けの見込みの予測が並びます）。年に2回到着する銘柄は、その都度別のグループになります。
                  </p>
                </div>
                {model.arrivalBuckets.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-600">
                      表示できる予測がありません。優待情報の権利月が不明な銘柄は下部「権利月が未登録の保有銘柄」を確認してください。
                    </p>
                  </div>
                ) : (
                  model.arrivalBuckets.map((bucket) => (
                    <article
                      key={bucket.id}
                      id={bucket.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <header className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                        <h3 className="text-base font-bold text-slate-900">{bucket.heading}</h3>
                        <span className="text-xs text-slate-500">{bucket.rows.length}件</span>
                      </header>
                      <ul className="mt-3 space-y-3">
                        {bucket.rows.map((row) => (
                          <li key={row.id}>
                            <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/stock/${row.code}`}
                                  prefetch={false}
                                  className="font-semibold text-blue-700 hover:underline"
                                >
                                  <span className="font-mono text-xs text-slate-500">{row.code}</span> {row.name}
                                </Link>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  {row.shares.toLocaleString("ja-JP")}株 保有・予測到着{" "}
                                  <strong className="text-slate-700">{formatMonthDay(row.when)}</strong>
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-700">{row.body}</p>
                              </div>
                              <span
                                className={
                                  row.badgeKind === "report"
                                    ? "self-start rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900"
                                    : "self-start rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800"
                                }
                              >
                                {row.badgeKind === "report" ? "投稿ベース" : "一般的な目安"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))
                )}
              </section>

              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-bold text-slate-900">🕒 すべて日付順（一覧）</h2>
                  <p className="text-xs text-slate-600">
                    同じ予測を、近い順の一覧でも確認できます。「投稿ベース」はユーザー到着報告、「一般的な目安」は権利確定約3か月後の暦換算です。
                  </p>
                </div>
                {model.timeline.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">対象となる予測がありません。</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {model.timeline.map((row) => (
                      <li key={`list-${row.id}`}>
                        <div className="relative flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/stock/${row.code}`}
                              prefetch={false}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              <span className="font-mono text-xs text-slate-500">{row.code}</span> {row.name}
                            </Link>
                            <p className="mt-1 text-[11px] font-medium text-slate-700">
                              {formatMonthDay(row.when)} ごろ{" "}
                              <span className="font-normal text-slate-500">
                                （この予測を「{row.when.getFullYear()}年
                                {(row.when.getMonth() + 1).toString()}
                                月届け」として集計しています）
                              </span>
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {row.shares.toLocaleString("ja-JP")}株 保有
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-slate-700">{row.body}</p>
                          </div>
                          <span
                            className={
                              row.badgeKind === "report"
                                ? "self-start rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900"
                                : "self-start rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800"
                            }
                          >
                            {row.badgeKind === "report" ? "投稿ベース" : "一般的な目安"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {model.unknownRights.length > 0 && (
                <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h2 className="text-base font-bold text-amber-950">権利月が未登録の保有銘柄</h2>
                  <p className="mt-2 text-xs text-amber-900">
                    権利確定月が読み取れないためカレンダーに載せられません。各銘柄ページで優待情報を編集してください。
                  </p>
                  <ul className="mt-3 text-sm">
                    {model.unknownRights.map((r) => (
                      <li key={r.code}>
                        <Link
                          href={`/stock/${r.code}`}
                          className="text-blue-800 hover:underline"
                          prefetch={false}
                        >
                          {r.code} {r.name}（{r.shares.toLocaleString("ja-JP")}株）
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {model.abolishedRows.length > 0 && (
                <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5">
                  <h2 className="text-base font-bold text-slate-800">「実施なし」扱いの保有銘柄（一覧から除外）</h2>
                  <p className="mt-2 text-xs text-slate-600">
                    サイト上では優待なしまたは廃止として分類されています。公式IRで最新を確認してください。
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {model.abolishedRows.map((r) => (
                      <li key={r.code}>
                        <Link
                          href={`/stock/${r.code}`}
                          prefetch={false}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          {r.code} {r.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="mt-6 text-xs text-slate-500">
                ※ <strong>{SITE_NAME}</strong>{" "}
                の推定値・目安であり、銘柄・年度によって前後します。投資・申込みの最終判断は公式IRおよび証券会社の案内でご確認ください。
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
