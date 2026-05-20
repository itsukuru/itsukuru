"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  filterStocksBySearchKeyword,
  type StockRecord,
} from "@/app/lib/stocksClient";

type Props = {
  /** ラベル付け・アクセシビリティ用 */
  inputId?: string;
  className?: string;
  /** ヘッダー1行用の小さめ入力（余白・プレースホルダ短縮） */
  compact?: boolean;
};

/**
 * ヘッダー用の銘柄インライン検索（ドロップダウンで結果へジャンプ）。
 * 検索専用ページへ遷移せずに候補を絞り込める。
 */
export default function HeaderStockSearch({
  inputId = "header-stock-search",
  className = "",
  compact = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
  }, []);

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return filterStocksBySearchKeyword(stocks, trimmed);
  }, [stocks, trimmed]);

  useEffect(() => {
    if (!trimmed) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [trimmed]);

  const listboxId = `${inputId}-listbox`;

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      e.currentTarget.blur();
    }
  };

  return (
    <div ref={rootRef} className={`relative z-[100] overflow-visible ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        銘柄を検索（銘柄名・証券コード）
      </label>
      <div className="relative">
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
            compact ? "left-2" : "left-2.5"
          }`}
          aria-hidden
        >
          <svg
            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
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
          id={inputId}
          type="text"
          name="q"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-expanded={Boolean(trimmed)}
          aria-controls={trimmed ? listboxId : undefined}
          placeholder={compact ? "銘柄・コード" : "銘柄名・コードで検索"}
          className={
            compact
              ? "w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-1.5 text-xs text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-100"
              : "w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2.5 text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onCompositionEnd={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleInputKeyDown}
        />
      </div>
      {trimmed ? (
        <ul
          id={listboxId}
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-[min(70vh,20rem)] overflow-auto rounded-xl border border-slate-200 bg-white py-0.5 shadow-lg"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">該当する銘柄がありません</li>
          ) : (
            results.map((stock) => (
              <li key={stock.code} role="presentation">
                <Link
                  href={`/stock/${stock.code}`}
                  role="option"
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setQuery("")}
                >
                  <span className="min-w-0 truncate font-medium text-slate-900">
                    {stock.name}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      ({stock.code})
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-300" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
