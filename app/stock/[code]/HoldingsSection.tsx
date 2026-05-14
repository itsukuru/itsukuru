"use client";

import { useEffect, useState } from "react";
import { loadHoldings, setHoldingShares } from "@/app/lib/holdingsClient";
import { loadBenefitForStock } from "@/app/lib/benefitsClient";

type Props = {
  stockCode: string;
};

export default function HoldingsSection({ stockCode }: Props) {
  const [shares, setShares] = useState<number>(0);
  const [minShares, setMinShares] = useState<number>(0);
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    const holdings = loadHoldings();
    setShares(holdings[stockCode] ?? 0);
    const benefit = loadBenefitForStock(stockCode);
    setMinShares(benefit?.minShares ?? 0);
  }, [stockCode]);

  const handleSave = () => {
    setHoldingShares(stockCode, shares);
    setSavedAt(new Date().toLocaleTimeString("ja-JP"));
  };

  const eligible = minShares > 0 ? shares >= minShares : shares > 0;
  const shortfall = minShares > 0 && shares < minShares ? minShares - shares : 0;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">保有株数</h2>
        {shares > 0 && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              eligible
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {eligible ? "優待対象" : "あと少し"}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end gap-3">
        <label className="flex-1">
          <span className="text-xs text-slate-500">あなたの保有株数</span>
          <input
            type="number"
            min={0}
            step={100}
            value={shares || ""}
            onChange={(e) => setShares(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            placeholder="例: 100"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          保存
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        {minShares > 0 ? (
          <p>
            必要株数: <span className="font-semibold text-slate-900">{minShares.toLocaleString("ja-JP")}株</span>
            {shortfall > 0 && (
              <span className="ml-2 text-slate-500">
                （あと {shortfall.toLocaleString("ja-JP")}株 で優待対象）
              </span>
            )}
          </p>
        ) : (
          <p className="text-slate-500">必要株数は優待情報セクションで設定できます。</p>
        )}
      </div>

      {savedAt && (
        <p className="mt-2 text-xs text-emerald-600">保存しました（{savedAt}）</p>
      )}
    </section>
  );
}
