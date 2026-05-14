"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  normalizeSearchText,
  stockSearchHaystack,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { loadAllBenefits } from "@/app/lib/benefitsClient";
import {
  CONFIDENCE_META,
  getEffectiveConfidence,
  type StockBenefit,
} from "@/app/data/stockBenefits";
import { parseRightsMonths } from "@/app/lib/holdingsClient";
import {
  BENEFIT_CATEGORIES,
  FALLBACK_CATEGORY,
  detectCategories,
  type BenefitCategoryKey,
} from "@/app/lib/benefitCategories";
import type { ReactNode } from "react";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 投稿導線では詳細フィルタを折りたたみ、検索→タップを優先する */
function CollapsibleSearchFilters({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  if (!collapsed) {
    return <>{children}</>;
  }
  return (
    <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
      <summary className="cursor-pointer select-none text-xs font-medium text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
        権利月・ジャンルで絞り込む（任意）
      </summary>
      <div className="mt-2 space-y-3 border-t border-slate-200 pt-3">{children}</div>
    </details>
  );
}

type Result = {
  stock: StockRecord;
  benefit: StockBenefit | null;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const intent = searchParams?.get("intent");
  const isPostArrivalIntent = intent === "post" || intent === "post-arrival";
  const isPostUsageIntent = intent === "post-usage";
  const isPostIntent = isPostArrivalIntent || isPostUsageIntent;
  const postHash = isPostUsageIntent
    ? "#post-usage"
    : isPostArrivalIntent
      ? "#post-arrival"
      : "";

  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [benefits, setBenefits] = useState<Map<string, StockBenefit>>(new Map());
  const [query, setQuery] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BenefitCategoryKey | null>(null);
  const [onlyWithBenefit, setOnlyWithBenefit] = useState(false);
  const [includeAbolished, setIncludeAbolished] = useState(false);

  useEffect(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    setBenefits(loadAllBenefits());
  }, []);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedMonths([]);
    setSelectedCategory(null);
    setOnlyWithBenefit(false);
    setIncludeAbolished(false);
  };

  const trimmedQuery = query.trim();

  const results = useMemo<Result[]>(() => {
    const tokens = trimmedQuery
      ? trimmedQuery
          .split(/[\s\u3000]+/)
          .map((t) => normalizeSearchText(t))
          .filter(Boolean)
      : [];

    const categoryInfo = selectedCategory
      ? BENEFIT_CATEGORIES.find((c) => c.key === selectedCategory) ?? null
      : null;
    const categoryKeywords = categoryInfo
      ? categoryInfo.keywords.map((kw) => normalizeSearchText(kw))
      : [];

    const matched: Result[] = [];

    for (const stock of stocks) {
      const benefit = benefits.get(stock.code) ?? null;

      const stockHaystack = normalizeSearchText(stockSearchHaystack(stock));
      const benefitHaystack = benefit
        ? normalizeSearchText(
            [
              benefit.content,
              benefit.notes ?? "",
              benefit.longTermNote ?? "",
              benefit.rightsMonths ?? "",
            ].join(" ")
          )
        : "";
      const combinedHaystack = `${stockHaystack} ${benefitHaystack}`;

      if (tokens.length > 0) {
        const allHit = tokens.every((tok) => combinedHaystack.includes(tok));
        if (!allHit) continue;
      }

      const requiresBenefit =
        onlyWithBenefit ||
        selectedMonths.length > 0 ||
        categoryKeywords.length > 0;
      if (requiresBenefit && !benefit) continue;

      if (selectedMonths.length > 0) {
        const months = parseRightsMonths(benefit?.rightsMonths ?? "");
        const hit = months.some((m) => selectedMonths.includes(m));
        if (!hit) continue;
      }

      if (categoryKeywords.length > 0) {
        const hit = categoryKeywords.some((kw) => benefitHaystack.includes(kw));
        if (!hit) continue;
      }

      // 「実施なし」（abolished）は デフォルトで除外
      if (benefit && !includeAbolished) {
        if (getEffectiveConfidence(benefit) === "abolished") continue;
      }

      matched.push({ stock, benefit });
      if (matched.length >= 300) break;
    }

    return matched;
  }, [
    benefits,
    includeAbolished,
    onlyWithBenefit,
    selectedCategory,
    selectedMonths,
    stocks,
    trimmedQuery,
  ]);

  const hasAnyFilter =
    trimmedQuery !== "" ||
    selectedMonths.length > 0 ||
    selectedCategory !== null ||
    onlyWithBenefit;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {isPostUsageIntent
              ? "「使った！」を投稿する銘柄を選ぶ"
              : isPostArrivalIntent
                ? "「届いた！」を投稿する銘柄を選ぶ"
                : "銘柄・優待を検索"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isPostUsageIntent
              ? "使った優待の銘柄を検索してタップすると、その銘柄の使った報告フォームに直接ジャンプします。"
              : isPostArrivalIntent
                ? "届いた優待の銘柄を検索してタップすると、その銘柄の届いた報告フォームに直接ジャンプします。"
                : "銘柄名・コード・優待内容（食事券・QUOカードなど）・権利月でまとめて検索できます。"}
          </p>
          <p className="mt-2 hidden text-xs text-slate-500 lg:block">
            {isPostIntent
              ? "スマホでは上から順に進めます。PCでは左に条件・右に一覧が並び、スクロールしても条件が見やすい位置に留まります。"
              : "スマホでは縦スクロールで検索→一覧。PCでは左に絞り込み、右に結果の2カラムです。"}
          </p>
          {isPostIntent && (
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                isPostUsageIntent
                  ? "bg-sky-50 text-sky-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              <span aria-hidden>{isPostUsageIntent ? "🎫" : "🎁"}</span>
              銘柄を選ぶと投稿フォームに直接ジャンプします
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <aside className="min-w-0 lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
              <svg
                className="h-5 w-5"
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
              placeholder="銘柄名・コード・優待内容（例: イオン カタログ）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-9 pr-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            ※ スペース区切りで複数キーワードのAND検索ができます。
          </p>

          <CollapsibleSearchFilters collapsed={isPostIntent}>
            <div className="mt-3">
            <p className="text-xs font-semibold text-slate-700">優待ジャンル</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BENEFIT_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(active ? null : cat.key)
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-blue-500 bg-blue-600 font-semibold text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span aria-hidden>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-700">権利確定月</p>
            <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {MONTHS.map((month) => {
                const active = selectedMonths.includes(month);
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => toggleMonth(month)}
                    className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                      active
                        ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {month}月
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithBenefit}
                  onChange={(e) => setOnlyWithBenefit(e.target.checked)}
                />
                <span>優待情報が登録されている銘柄のみ</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAbolished}
                  onChange={(e) => setIncludeAbolished(e.target.checked)}
                />
                <span>「実施なし」も含める</span>
              </label>
            </div>
            {hasAnyFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                条件をクリア
              </button>
            )}
          </div>
          </CollapsibleSearchFilters>
        </div>
            <p className="mt-3 hidden text-xs leading-relaxed text-slate-500 lg:block">
              左でキーワード・ジャンル・権利月を指定し、右の一覧から銘柄を選びます。タップで銘柄ページへ進み、投稿フォームはページ内にあります。
            </p>
          </aside>

          <div className="flex min-w-0 flex-col lg:col-span-7">
            <div className="mt-4 flex items-center justify-between gap-2 lg:mt-0">
              <p className="text-sm font-medium text-slate-700">
                {hasAnyFilter ? `絞り込み結果: ${results.length}件` : `全${stocks.length}件`}
              </p>
              {results.length >= 300 && (
                <span className="shrink-0 text-[11px] text-slate-400">
                  ※ 最大300件まで表示
                </span>
              )}
            </div>

            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
              条件に一致する銘柄が見つかりませんでした。
            </li>
          ) : (
            results.map(({ stock, benefit }) => {
              const allCats = benefit ? detectCategories(benefit) : [];
              const confidence = benefit ? getEffectiveConfidence(benefit) : null;
              const confMeta = confidence ? CONFIDENCE_META[confidence] : null;
              const isAbolished = confidence === "abolished";
              return (
                <li key={stock.code}>
                  <Link
                    href={`/stock/${stock.code}${postHash}`}
                    className={`block h-full rounded-2xl border bg-white p-4 shadow-sm transition hover:border-blue-300 ${
                      isAbolished ? "border-slate-200 opacity-60" : "border-slate-200"
                    }`}
                  >
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {stock.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {stock.code}・{stock.market}
                        </p>
                        {benefit ? (
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                            {!isAbolished &&
                              allCats.slice(0, 2).map((cat) => (
                                <span
                                  key={cat.key}
                                  className={`rounded-full px-2 py-0.5 font-semibold ${cat.colorClass}`}
                                >
                                  {cat.emoji} {cat.label}
                                </span>
                              ))}
                            {!isAbolished && allCats.length > 2 && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                +{allCats.length - 2}
                              </span>
                            )}
                            {!isAbolished && allCats.length === 0 && (
                              <span
                                className={`rounded-full px-2 py-0.5 ${FALLBACK_CATEGORY.colorClass}`}
                              >
                                {FALLBACK_CATEGORY.emoji} {FALLBACK_CATEGORY.label}
                              </span>
                            )}
                            {!isAbolished && (
                              <>
                                {benefit.rightsMonths && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                                    {benefit.rightsMonths}
                                  </span>
                                )}
                                {benefit.minShares > 0 && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                    {benefit.minShares.toLocaleString("ja-JP")}株〜
                                  </span>
                                )}
                              </>
                            )}
                            {confMeta && (
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[10px] ${confMeta.bgColor} ${confMeta.color}`}
                                title={`情報の確度: ${confMeta.label}（${confMeta.description}）`}
                              >
                                {confMeta.shortLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-400">
                            優待情報は未登録
                          </p>
                        )}
                    </div>

                    {benefit?.content && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                        {benefit.content}
                      </p>
                    )}
                    {benefit?.longTermNote && !isAbolished && (
                      <p className="mt-2 text-[11px] text-indigo-700">
                        長期保有特典: {benefit.longTermNote}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
