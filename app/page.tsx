"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  filterStocksBySearchKeyword,
  type StockRecord,
} from "./lib/stocksClient";
import { loadFavoriteCodes } from "./lib/favoritesClient";
import { loadHoldings } from "./lib/holdingsClient";
import {
  formatRelativeTime,
  formatCalendarDateJa,
  isToday,
  loadAllReports,
  loadReportsForStock,
} from "./lib/reportsClient";
import { getEffectivePhase, type BenefitReport } from "./data/benefitReports";
import { computeArrivalForecast, formatMonthDay } from "./lib/forecastClient";
import { triggerUpcomingArrivalNotifications } from "./lib/notificationsClient";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./lib/siteConfig";

export default function Home() {
  const pathname = usePathname() ?? "/";
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [holdingCodes, setHoldingCodes] = useState<string[]>([]);
  const [reports, setReports] = useState<BenefitReport[]>([]);
  const homeSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const customStocks = loadCustomStocks();
    setStocks(mergeStocks(getDefaultStocks(), customStocks));
    const holdings = loadHoldings();
    setHoldingCodes(
      Object.entries(holdings)
        .filter(([, s]) => s > 0)
        .map(([code]) => code)
    );
    const favs = loadFavoriteCodes().filter((code) => (holdings[code] ?? 0) === 0);
    setFavoriteCodes(favs);
    setReports(loadAllReports());

    void triggerUpcomingArrivalNotifications();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const focusSearch = () => {
      if (window.location.hash !== "#stock-search") return;
      requestAnimationFrame(() => {
        const root = document.getElementById("stock-search");
        const input = root?.querySelector("input");
        if (input instanceof HTMLElement) input.focus();
      });
    };
    focusSearch();
    window.addEventListener("hashchange", focusSearch);
    return () => window.removeEventListener("hashchange", focusSearch);
  }, [pathname]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = homeSearchRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [trimmedQuery]);

  const searchResults = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }
    return filterStocksBySearchKeyword(stocks, trimmedQuery, 16);
  }, [stocks, trimmedQuery]);

  const todaysReportCount = useMemo(
    () => reports.filter((r) => isToday(r.createdAt)).length,
    [reports]
  );

  const upcomingHoldings = useMemo(() => {
    if (holdingCodes.length === 0) return [];
    const stockByCode = new Map(stocks.map((s) => [s.code, s]));
    const now = new Date();
    const horizon = new Date(now.getTime() + 45 * 86_400_000);
    return holdingCodes
      .map((code) => {
        const stock = stockByCode.get(code);
        if (!stock) return null;
        const forecast = computeArrivalForecast(loadReportsForStock(code));
        if (!forecast) return null;
        if (forecast.nextEstimate > horizon) return null;
        return { stock, forecast };
      })
      .filter((item): item is { stock: StockRecord; forecast: NonNullable<ReturnType<typeof computeArrivalForecast>> } => item !== null)
      .sort((a, b) => a.forecast.daysUntil - b.forecast.daysUntil)
      .slice(0, 4);
  }, [holdingCodes, stocks]);

  const latestReports = useMemo(() => {
    return [...reports]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [reports]);

  const stockByCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            alternateName: "株主優待 いつクル",
            url: SITE_URL,
            inLanguage: "ja",
            description: SITE_DESCRIPTION,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/icon.svg`,
              },
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "株主優待がいつ届くか調べる方法はありますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "いつクル？では、各銘柄の「届いた！」投稿を集めて到着日を予測しています。銘柄を検索すると、過去の到着実績とユーザー投稿から予想日が表示されます。",
                },
              },
              {
                "@type": "Question",
                name: "投稿は誰でもできますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "はい、登録不要で投稿できます。匿名でも投稿可能ですが、メール連携すると別端末でも自分の投稿を管理できます。",
                },
              },
              {
                "@type": "Question",
                name: "通知でいつ届くか教えてもらえますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "保有銘柄を登録して通知をオンにすると、ブラウザ通知で「もうすぐ届きそう」をお知らせします。ホーム画面に追加すればアプリのように使えます。",
                },
              },
            ],
          }),
        }}
      />
      <section className="relative bg-gradient-to-b from-sky-50 via-blue-50/70 to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 sm:pb-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            {/* 検索（PC では右、スマホでは上） */}
            <div
              id="stock-search"
              ref={homeSearchRef}
              className="mx-auto w-full max-w-2xl scroll-mt-28 px-0 sm:px-2 lg:order-2 lg:mx-0 lg:max-w-md lg:shrink-0 xl:max-w-lg"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6 lg:shadow-md">
                <p className="text-left text-sm font-semibold text-slate-800 lg:text-base">銘柄を検索する</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  証券コード・社名の一部で候補が出ます。投稿ボタンや
                  <Link href="/search" className="text-blue-600 underline-offset-2 hover:underline" prefetch={false}>
                    銘柄検索ページ
                  </Link>
                  からも進めます。
                </p>
                <div className="relative mt-2 lg:mt-3">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5 lg:h-6 lg:w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    aria-autocomplete="list"
                    aria-expanded={Boolean(trimmedQuery)}
                    aria-controls={trimmedQuery ? "home-stock-search-results" : undefined}
                    placeholder="銘柄名・コード（例: トヨタ / 7203）"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 lg:py-3.5 lg:pl-11 lg:text-lg"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onInput={(event) => setQuery(event.currentTarget.value)}
                    onCompositionEnd={(event) => setQuery(event.currentTarget.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Escape") {
                        setQuery("");
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </div>

                {trimmedQuery && (
                  <ul
                    id="home-stock-search-results"
                    className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 lg:mt-4"
                    role="listbox"
                  >
                    {searchResults.length === 0 ? (
                      <li className="bg-white px-4 py-3 text-sm text-slate-500">
                        該当する銘柄がありません。
                      </li>
                    ) : (
                      searchResults.map((stock) => (
                        <li key={stock.code} className="bg-white">
                          <Link
                            href={`/stock/${stock.code}`}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 lg:px-5 lg:py-3.5"
                          >
                            <div>
                              <p className="font-medium text-slate-900 lg:text-base">
                                {stock.name}{" "}
                                <span className="ml-1 text-xs text-slate-500">
                                  ({stock.code})
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 lg:text-sm">
                                {stock.market} / {stock.industry}
                              </p>
                            </div>
                            <span className="text-slate-400">›</span>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-sm lg:shadow-md">
                <p className="text-xs font-semibold text-slate-800">ここからすぐ</p>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
                  <li>
                    <Link
                      href="/search"
                      className="flex items-center justify-between gap-2 rounded-lg py-1 text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
                      prefetch={false}
                    >
                      <span>条件を絞って銘柄・優待を検索</span>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/calendar"
                      className="flex items-center justify-between gap-2 rounded-lg py-1 text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
                      prefetch={false}
                    >
                      <span>権利月カレンダーで全体を眺める</span>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="flex items-center justify-between gap-2 rounded-lg py-1 text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
                      prefetch={false}
                    >
                      <span>届かない・申込のFAQ</span>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* 導線・特徴（PC では検索の左） */}
            <div className="flex min-w-0 flex-1 flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
              <h1 className="w-full text-3xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                <span className="inline">あなたの優待、</span>{" "}
                <span className="whitespace-nowrap">
                  <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent">
                    いつクル
                  </span>
                  <span className="text-slate-900">？</span>
                </span>
                <span className="sr-only">
                  {" "}
                  {SITE_NAME}。株主優待の「届いた！」「使った！」を共有し、到着の目安をみんなで予測するサイト。
                </span>
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:max-w-2xl sm:text-base lg:mx-0 lg:text-lg">
                <span className="block sm:inline">
                  「届いた！」「使った！」を投稿して、次の到着時期をみんなで予測する
                </span>{" "}
                <span className="block sm:inline">
                  <span className="whitespace-nowrap">株主優待</span>コミュニティ。
                </span>
              </p>

              <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-2 sm:max-w-xl sm:gap-3 lg:max-w-lg">
                <Link
                  href="/search?intent=post-arrival"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 sm:gap-2 sm:text-base"
                  prefetch={false}
                >
                  <span aria-hidden>🎁</span>
                  届いたを投稿
                </Link>
                <Link
                  href="/search?intent=post-usage"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-600 sm:gap-2 sm:text-base"
                  prefetch={false}
                >
                  <span aria-hidden>🎫</span>
                  使ったを投稿
                </Link>
              </div>

              <p className="mt-3 text-[11px] text-slate-500 sm:text-xs lg:text-sm">
                <span className="text-blue-600">●</span> 登録不要・匿名OK
                <span className="mx-2 text-slate-300">／</span>
                検索で銘柄ページを開き、そこから投稿できます
              </p>

              <nav
                className="mt-5 flex w-full flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600 lg:justify-start"
                aria-label="主要ページ"
              >
                <Link href="/search" className="rounded-lg px-2 py-1 hover:bg-white/80 hover:text-blue-700" prefetch={false}>
                  銘柄・優待を検索
                </Link>
                <Link href="/calendar" className="rounded-lg px-2 py-1 hover:bg-white/80 hover:text-blue-700" prefetch={false}>
                  優待カレンダー
                </Link>
                <Link href="/faq" className="rounded-lg px-2 py-1 hover:bg-white/80 hover:text-blue-700" prefetch={false}>
                  よくある質問
                </Link>
                <Link href="/mypage" className="rounded-lg px-2 py-1 hover:bg-white/80 hover:text-blue-700" prefetch={false}>
                  マイページ
                </Link>
              </nav>

              <p className="mt-4 max-w-xl rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 text-left text-sm leading-relaxed text-slate-600 lg:max-w-none">
                銘柄ページでは、みんなの「届いた！」「使った！」から<strong className="text-slate-800">到着の目安</strong>がわかります。まずは気になる銘柄を検索してみてください。
              </p>

              <div className="mx-auto mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3 md:gap-3 lg:mx-0 lg:max-w-none">
                <FeatureCard icon="🎁" title="届いた！で到着日を予測" />
                <FeatureCard icon="🎫" title="使った！で感想をシェア" />
                <FeatureCard icon="⭐" title="銘柄登録で到着を通知" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {upcomingHoldings.length > 0 && (
        <section className="mx-auto mt-10 w-full max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">もうすぐ届きそうな保有銘柄</h2>
            <Link href="/mypage" className="text-xs text-blue-600 hover:underline">
              マイページで見る ›
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {upcomingHoldings.map(({ stock, forecast }) => (
              <Link
                key={stock.code}
                href={`/stock/${stock.code}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white">
                    {stock.code.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {stock.code} {stock.name}
                    </p>
                    <p className="text-xs text-slate-500">{stock.industry}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-blue-50 p-3 text-blue-700">
                  <p className="text-xs opacity-80">次に届く目安</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {formatMonthDay(forecast.nextEstimate)}
                    <span className="ml-2 text-xs font-medium">あと{forecast.daysUntil}日</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-10 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">みんなの投稿でわかる！「届いた」「使った」の今</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="本日の新着投稿" value={`${todaysReportCount}件`} accent="text-blue-600" />
          <StatCard
            label="現在の投稿数（累計）"
            value={`${reports.length.toLocaleString("ja-JP")}件`}
            accent="text-slate-900"
          />
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4 pb-16 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">新着の投稿</h2>
        <div className="mt-3 space-y-3">
          {latestReports.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              まだ投稿がありません。
            </p>
          ) : (
            latestReports.map((report) => {
              const stock = stockByCode.get(report.stockCode);
              const ph = getEffectivePhase(report);
              const dateLine =
                ph === "pending"
                  ? `${formatCalendarDateJa(report.arrivalDate)} 時点・まだ届いていない`
                  : `${formatCalendarDateJa(report.arrivalDate)} 到着`;
              return (
                <Link
                  key={report.id}
                  href={`/stock/${report.stockCode}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {stock ? `${stock.code} ${stock.name}` : report.stockCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.reporterName} ・ {dateLine}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatRelativeTime(report.createdAt)}</span>
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

      {/* SEO 用ロングフォームコンテンツ - 検索エンジンに対する強いシグナル */}
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

          <h3 className="mt-5 text-base font-bold text-slate-900">
            こんな疑問・お悩みに対応しています
          </h3>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-slate-700">
            <li>「<strong>株主優待がいつ来るか</strong>知りたい」</li>
            <li>「<strong>優待がまだ届かないけど</strong>大丈夫？」</li>
            <li>「カタログギフトの<strong>申込書はいつ届く</strong>？」</li>
            <li>「<strong>3月権利・9月権利</strong>の優待はいつ発送される？」</li>
          </ul>

          <h3 className="mt-5 text-base font-bold text-slate-900">主な使い方</h3>
          <ol className="mt-2 ml-5 list-decimal space-y-1 text-sm text-slate-700">
            <li>
              画面上部またはこのページの検索欄で、証券コード・社名から銘柄を探す
            </li>
            <li>銘柄詳細ページで「届いた！」「使った！」投稿を確認する</li>
            <li>
              保有銘柄を登録すると
              <Link href="/mypage" className="text-blue-600 hover:underline" prefetch={false}>
                マイページ
              </Link>
              で年間の優待スケジュールを管理
            </li>
            <li>気になる銘柄は「キニナル」登録で通知を受け取れる（ブラウザ通知対応）</li>
          </ol>

          <h3 className="mt-5 text-base font-bold text-slate-900">
            関連ページ
          </h3>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-sm">
            <li>
              <Link href="/faq" className="text-blue-600 hover:underline" prefetch={false}>
                よくある質問・FAQ（届かない時の対処法など）
              </Link>
            </li>
            <li>
              <Link href="/#stock-search" className="text-blue-600 hover:underline" prefetch={false}>
                銘柄を検索する（トップの検索欄）
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

function FeatureCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex min-w-0 flex-row items-center gap-2.5 rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-left backdrop-blur-sm transition hover:bg-white sm:gap-3 sm:px-3.5 sm:py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100/70 text-base sm:h-9 sm:w-9 sm:text-lg">
        {icon}
      </span>
      <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-slate-700 sm:text-sm">
        {title}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}
