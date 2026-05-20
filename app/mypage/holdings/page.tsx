"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { loadHoldings, setHoldingShares, type Holdings } from "@/app/lib/holdingsClient";
import { computeHoldingRows } from "@/app/mypage/holdingRowsModel";
import { StockRowList } from "@/app/mypage/MyStockRowList";

const HOLDINGS_TITLE = "保有銘柄の到着状況（全件）";

export default function HoldingsListPage() {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [holdings, setHoldings] = useState<Holdings>({});

  useEffect(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    setHoldings(loadHoldings());
  }, []);

  const holdingRows = useMemo(
    () => computeHoldingRows(holdings, stocks),
    [holdings, stocks]
  );

  const removeHolding = (code: string) => {
    const name = holdingRows.find((r) => r.stock.code === code)?.stock.name ?? code;
    if (
      !confirm(
        `「${name}（${code}）」を保有銘柄から外しますか？\n株数の登録が消え、年間カレンダーなどの表示からも外れます。`
      )
    ) {
      return;
    }
    setHoldings(setHoldingShares(code, 0));
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-slate-900">{HOLDINGS_TITLE}</h1>
          <Link href="/mypage" className="text-xs text-blue-600 hover:underline">
            マイページに戻る
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-xs text-slate-500">
          次に届く目安が近い順に並べています。到着の投稿がある銘柄はその予測日、無い銘柄は企業案内（IR）や権利月からの一般的な目安を表示します。
        </p>

        {holdingRows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            まだ保有銘柄がありません。
            <br />
            <Link href="/search" className="mt-2 inline-block text-blue-600 hover:underline">
              銘柄を探す ›
            </Link>
          </p>
        ) : (
          <StockRowList rows={holdingRows} variant="holding" onRemove={removeHolding} />
        )}

        <p className="mt-6 text-center">
          <Link href="/search" className="text-sm text-blue-600 hover:underline">
            銘柄を探して追加 ›
          </Link>
        </p>
      </div>
    </main>
  );
}
