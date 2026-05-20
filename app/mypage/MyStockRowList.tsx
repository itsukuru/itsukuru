"use client";

import Link from "next/link";
import { formatCalendarDateJa } from "@/app/lib/reportsClient";
import type { StockRow } from "@/app/mypage/holdingRowsModel";

/** 銘柄コードをアイコン用に4桁表示（数字以外を除き、不足分は0埋め） */
export function stockCodeForIcon(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 0) return "----";
  if (digits.length <= 4) return digits.padStart(4, "0");
  return digits.slice(-4);
}

function formatRightsMonthsBrief(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t || t === "-") return null;
  return t;
}

export function StockRowList({
  rows,
  variant,
  onRemove,
}: {
  rows: StockRow[];
  variant: "holding" | "watching";
  onRemove: (code: string) => void;
}) {
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((row) => (
        <li
          key={row.stock.code}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <Link
            href={`/stock/${row.stock.code}`}
            className="block px-4 py-3 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 min-w-[3.25rem] shrink-0 items-center justify-center rounded-xl px-1 text-[11px] font-bold tabular-nums text-white ${
                  variant === "holding" ? "bg-blue-600" : "bg-sky-500"
                }`}
              >
                {stockCodeForIcon(row.stock.code)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {row.stock.code} {row.stock.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {row.benefit?.content || "優待情報未登録"}
                </p>
                {variant === "watching" && (
                  <p className="mt-1 truncate text-[11px] text-slate-600">
                    <span className="text-slate-500">権利確定月</span>{" "}
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatRightsMonthsBrief(row.benefit?.rightsMonths) ?? "未登録"}
                    </span>
                  </p>
                )}
              </div>
              {variant === "holding" ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {row.shares.toLocaleString("ja-JP")}株
                </span>
              ) : (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  ☆ キニナル
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <p className="opacity-80">次に届く目安</p>
                <p className="mt-0.5 text-base font-bold">
                  {row.nextEstimateLabel}
                  {row.daysUntil !== null && (
                    <span className="ml-1 text-xs font-medium">(あと{row.daysUntil}日)</span>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-slate-700">
                <p className="opacity-80">直近の到着</p>
                <p className="mt-0.5 text-base font-semibold">
                  {row.latestArrival ? formatCalendarDateJa(row.latestArrival) : "まだ報告なし"}
                </p>
              </div>
            </div>
          </Link>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
            <Link
              href={`/stock/${row.stock.code}`}
              className="text-xs text-blue-600 hover:underline"
            >
              銘柄ページを見る ›
            </Link>
            <button
              type="button"
              onClick={() => onRemove(row.stock.code)}
              className="text-xs text-slate-500 hover:text-rose-600"
            >
              {variant === "holding" ? "保有銘柄から外す" : "キニナルから外す"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
