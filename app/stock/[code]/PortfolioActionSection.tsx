"use client";

import { useEffect, useState } from "react";
import {
  addFavoriteCode,
  loadFavoriteCodes,
  removeFavoriteCode,
} from "@/app/lib/favoritesClient";
import {
  loadHoldings,
  setHoldingShares,
} from "@/app/lib/holdingsClient";

type Props = {
  stockCode: string;
  minShares?: number;
};

type Status = "none" | "watching" | "holding";

export default function PortfolioActionSection({ stockCode, minShares }: Props) {
  const [status, setStatus] = useState<Status>("none");
  const [shares, setShares] = useState<number>(0);
  const [mode, setMode] = useState<"idle" | "editHolding">("idle");
  const [draftShares, setDraftShares] = useState<string>("");

  const refresh = () => {
    const favs = loadFavoriteCodes();
    const holdings = loadHoldings();
    const currentShares = holdings[stockCode] ?? 0;
    if (currentShares > 0) {
      setStatus("holding");
      setShares(currentShares);
    } else if (favs.includes(stockCode)) {
      setStatus("watching");
      setShares(0);
    } else {
      setStatus("none");
      setShares(0);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCode]);

  const startEditHolding = () => {
    setDraftShares(shares > 0 ? String(shares) : "100");
    setMode("editHolding");
  };

  /**
   * 単元株（基本100株）を意識した株数増減ハンドラ。
   * + : 端株(1株)からは100へジャンプ、それ以外は+100
   * - : 200以上なら -100、100なら端株(1株)へ、1ならそのまま
   */
  const adjustShares = (delta: 1 | -1) => {
    const current = Number(draftShares) || 0;
    let next = current;
    if (delta === 1) {
      if (current < 100) {
        next = 100;
      } else {
        next = current + 100;
      }
    } else {
      if (current >= 200) {
        next = current - 100;
      } else if (current === 100) {
        next = 1;
      } else {
        next = 1;
      }
    }
    setDraftShares(String(next));
  };

  const setSharesQuick = (value: number) => {
    setDraftShares(String(value));
  };

  const cancelEdit = () => {
    setMode("idle");
  };

  const saveHolding = () => {
    const n = Number(draftShares);
    if (!Number.isFinite(n) || n <= 0) {
      return;
    }
    setHoldingShares(stockCode, n);
    // 保有に切り替えたら、キニナルからは外す
    removeFavoriteCode(stockCode);
    setMode("idle");
    refresh();
  };

  const removeHolding = () => {
    setHoldingShares(stockCode, 0);
    setMode("idle");
    refresh();
  };

  const addWatching = () => {
    addFavoriteCode(stockCode);
    // キニナルにする時は保有を外す（排他）
    setHoldingShares(stockCode, 0);
    refresh();
  };

  const removeWatching = () => {
    removeFavoriteCode(stockCode);
    refresh();
  };

  const eligible =
    status === "holding" && typeof minShares === "number" && minShares > 0
      ? shares >= minShares
      : false;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-blue-600">マイ銘柄</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">
            {status === "holding"
              ? "✅ 保有銘柄に登録済み"
              : status === "watching"
                ? "☆ キニナルに登録中"
                : "この銘柄を登録しますか？"}
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
            <p className="rounded-lg bg-blue-50 px-2 py-1.5">
              <span className="font-semibold text-blue-700">保有銘柄</span>
              <span className="ml-1 text-slate-600">= いま実際に持っている株（株数登録）</span>
            </p>
            <p className="rounded-lg bg-sky-50 px-2 py-1.5">
              <span className="font-semibold text-sky-700">☆ キニナル</span>
              <span className="ml-1 text-slate-600">= まだ持ってないけど気になる株（ウォッチリスト）</span>
            </p>
          </div>
        </div>
        {status === "holding" && mode === "idle" && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              typeof minShares === "number" && minShares > 0
                ? eligible
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            保有 {shares.toLocaleString("ja-JP")}株
            {typeof minShares === "number" && minShares > 0
              ? eligible
                ? "・優待対象"
                : "・株数不足"
              : ""}
          </span>
        )}
        {status === "watching" && mode === "idle" && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            ☆ キニナル
          </span>
        )}
      </div>

      {mode === "idle" && status === "none" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startEditHolding}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ＋ 保有銘柄に追加
          </button>
          <button
            type="button"
            onClick={addWatching}
            className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
          >
            ☆ キニナルに追加
          </button>
        </div>
      )}

      {mode === "idle" && status === "watching" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startEditHolding}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ＋ 保有銘柄に切替（株数を登録）
          </button>
          <button
            type="button"
            onClick={removeWatching}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:text-rose-600"
          >
            キニナルから外す
          </button>
        </div>
      )}

      {mode === "idle" && status === "holding" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startEditHolding}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            株数を編集
          </button>
          <button
            type="button"
            onClick={removeHolding}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:text-rose-600"
          >
            保有銘柄から外す
          </button>
        </div>
      )}

      {mode === "editHolding" && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <label className="block text-xs font-medium text-slate-700">
            保有株数（単元: 通常100株）
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white">
              <button
                type="button"
                onClick={() => adjustShares(-1)}
                disabled={Number(draftShares) <= 1}
                className="px-3 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="株数を減らす"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="100"
                value={draftShares}
                onChange={(e) => setDraftShares(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-24 border-x border-slate-200 px-3 py-2 text-center text-sm focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => adjustShares(1)}
                className="px-3 text-lg font-bold text-slate-600 hover:bg-slate-100"
                aria-label="株数を増やす"
              >
                ＋
              </button>
            </div>
            <span className="text-xs text-slate-500">株</span>
            {typeof minShares === "number" && minShares > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                優待は {minShares.toLocaleString("ja-JP")}株から
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[11px] text-slate-500">よく使う:</span>
            {[100, 200, 300, 500, 1000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSharesQuick(v)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  Number(draftShares) === v
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {v.toLocaleString("ja-JP")}株
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSharesQuick(1)}
              className={`rounded-md border px-2 py-1 text-xs ${
                Number(draftShares) === 1
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="株式分割や端株保有の場合"
            >
              端株(1株)
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            ※ 日本株は通常100株単位（単元株）です。＋／−ボタンは100株ずつ増減します。<br />
            　 株式分割等で1株保有の場合は「端株(1株)」を選んでください。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveHolding}
              disabled={!draftShares || Number(draftShares) <= 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              保存
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
