"use client";

/**
 * 銘柄マスタの取り込み（運営者専用ページ）
 * ─────────────────────────────────────────────────────────
 * - サイト導線からは到達できない（フッター・ナビ非掲載）
 * - robots.txt で `/admin` 配下を除外（インデックスされない）
 * - 認証ゲートで未ログインユーザーには案内のみ表示
 *
 * 銘柄マスタ更新は運営者のみが行う前提のため、
 * 通常のサイトUIにこの機能を露出させない目的で別ページ化した。
 * ─────────────────────────────────────────────────────────
 */

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  loadCustomStocks,
  mergeStocks,
  parseStocksCsv,
  saveCustomStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import { useAuthUser } from "@/app/lib/useAuthUser";
import { isSupabaseConfigured } from "@/app/lib/supabaseClient";

export default function AdminImportPage() {
  const { user, loading } = useAuthUser();
  const supabaseConfigured = isSupabaseConfigured();
  const [importMessage, setImportMessage] = useState("");
  const [isAutoImporting, setIsAutoImporting] = useState(false);
  const [csvText, setCsvText] = useState(
    "code,name,market,industry\n7203,トヨタ自動車,東証プライム,輸送用機器\n6758,ソニーグループ,東証プライム,電気機器"
  );

  const applyImportedStocks = (imported: StockRecord[]) => {
    if (imported.length === 0) {
      setImportMessage(
        "取り込み対象が 0 件でした。ヘッダー行とデータ行を確認してください。"
      );
      return;
    }
    const customOnly = mergeStocks(loadCustomStocks(), imported);
    saveCustomStocks(customOnly);
    setImportMessage(`✅ ${imported.length} 件の銘柄を取り込みました。`);
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    applyImportedStocks(parseStocksCsv(text));
    event.target.value = "";
  };

  const handleCsvTextImport = () => {
    applyImportedStocks(parseStocksCsv(csvText));
  };

  const handleAutoImportFromJpx = async () => {
    setIsAutoImporting(true);
    setImportMessage("JPX から最新データを取得中です...");
    try {
      const response = await fetch("/api/import-jpx", { method: "GET" });
      const payload = (await response.json()) as
        | {
            count: number;
            stocks: StockRecord[];
            sourceUrl: string;
            sheetCount?: number;
          }
        | { error: string; details?: string[] };

      if (!response.ok || "error" in payload) {
        const details =
          "details" in payload && Array.isArray(payload.details)
            ? ` / ${payload.details.join(" | ")}`
            : "";
        setImportMessage(
          `❌ 自動取得に失敗しました: ${
            "error" in payload ? payload.error : "不明なエラー"
          }${details}`
        );
        return;
      }

      applyImportedStocks(payload.stocks);
      setImportMessage(
        `✅ JPX から ${payload.count} 件取り込みました（シート数: ${payload.sheetCount ?? "?"}）。`
      );
    } catch (error) {
      setImportMessage(
        `❌ 自動取得に失敗しました: ${
          error instanceof Error ? error.message : "通信エラー"
        }`
      );
    } finally {
      setIsAutoImporting(false);
    }
  };

  // ─────────────────────────────────────────────
  // 認証ゲート
  //   Supabase 設定済みかつ未ログインの場合は導線のみ表示。
  //   ローカル開発時（Supabase 未設定）は誰でも触れる。
  // ─────────────────────────────────────────────
  const requiresAuth = supabaseConfigured;
  const isAuthed = !!user;

  if (requiresAuth && loading) {
    return (
      <main className="min-h-[60vh] bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </main>
    );
  }

  if (requiresAuth && !isAuthed) {
    return (
      <main className="min-h-[60vh] bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-3xl">
            🔒
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            運営者専用ページです
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            この機能はサイト運営者のみが利用できます。
            <br />
            一般ユーザー向けの機能は
            <Link href="/" className="ml-1 text-blue-700 underline">
              トップページ
            </Link>
            からご利用ください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <Link href="/mypage" className="hover:underline">
            マイページ
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">運営: 銘柄マスタ取り込み</span>
        </nav>

        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-bold">⚙️ 運営者向け機能</p>
          <p className="mt-1 leading-relaxed">
            このページは一般ユーザー導線からはアクセスできません。
            銘柄マスタを更新したい場合のみ使用してください。
          </p>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          銘柄マスタの取り込み
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          JPX 公開データから一括取得 / CSV からアップロード / テキスト貼り付け
          の 3 通りで取り込めます。
        </p>

        <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              1. JPX から自動取得
            </p>
            <p className="mt-1 text-xs text-slate-500">
              日本取引所グループの公開データから上場全銘柄を取り込みます。
            </p>
            <button
              type="button"
              onClick={handleAutoImportFromJpx}
              disabled={isAutoImporting}
              className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isAutoImporting ? "⏳ JPX から取得中..." : "📥 JPX から全銘柄を自動取得"}
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">
              2. CSV ファイルから取り込み
            </p>
            <p className="mt-1 text-xs text-slate-500">
              code,name,market,industry の 4 列形式に対応。
            </p>
            <label className="mt-2 inline-block cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              📁 CSV ファイルを選択
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">
              3. テキスト貼り付けで取り込み
            </p>
            <p className="mt-1 text-xs text-slate-500">
              CSV テキストを直接貼り付けて取り込みます。
            </p>
            <textarea
              className="mt-2 h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleCsvTextImport}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              📋 貼り付け内容を取り込み
            </button>
          </div>
        </section>

        {importMessage && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
          >
            {importMessage}
          </div>
        )}
      </div>
    </main>
  );
}
