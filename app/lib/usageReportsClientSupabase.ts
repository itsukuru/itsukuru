/**
 * Supabase 版「使った！」クライアント（dry-run / 雛形）
 * ─────────────────────────────────────────────────────────
 * ⚠️ このファイルはまだどこからも import されていません。
 *
 * 既存の usageReportsClient.ts（localStorage 専用）に対し、Supabase で
 * 読み書きする版を独立ファイルとして用意したものです。明朝、以下の
 * 手順でアプリ全体を切り替えられます。
 *
 *   1. 全コンポーネントの
 *        from "@/app/lib/usageReportsClient"
 *      を
 *        from "@/app/lib/usageReportsClientSupabase"
 *      へ書き換え
 *   2. 関数呼び出し側を `await` 対応に修正
 *
 * フォールバック仕様:
 *   - Supabase 未設定の場合は localStorage に保存する。
 * ─────────────────────────────────────────────────────────
 */

import type { UsageReport } from "@/app/data/usageReports";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import {
  loadUsageReportsForStock as loadUsageReportsForStockLegacy,
  addLocalUsageReport as addLocalUsageReportLegacy,
  deleteLocalUsageReport as deleteLocalUsageReportLegacy,
  updateLocalUsageReport as updateLocalUsageReportLegacy,
  loadAllUsageReports as loadAllUsageReportsLegacy,
  usageReportsStorageKey,
} from "@/app/lib/usageReportsClient";

// ─────────────────────────────────────────────────────────
// 内部ユーティリティ: DB行 → UsageReport の変換
// ─────────────────────────────────────────────────────────

type UsageReportRow = {
  id: string;
  stock_code: string;
  reporter_name: string | null;
  region: string | null;
  used_date: string;
  comment: string | null;
  image_url: string | null;
  helpful_count: number | null;
  created_at: string;
};

const rowToReport = (row: UsageReportRow): UsageReport => ({
  id: row.id,
  stockCode: row.stock_code,
  reporterName: row.reporter_name ?? "匿名",
  region: row.region ?? undefined,
  usedDate: row.used_date,
  comment: row.comment ?? "",
  imageUrl: row.image_url ?? undefined,
  helpfulCount: row.helpful_count ?? 0,
  createdAt: row.created_at,
});

// ─────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────

/**
 * 指定銘柄の「使った！」を Supabase から取得する。
 * Supabase 未設定時はローカルにフォールバック。
 */
export const loadUsageReportsForStockAsync = async (
  stockCode: string,
): Promise<UsageReport[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return loadUsageReportsForStockLegacy(stockCode);
  }

  const { data, error } = await supabase
    .from("usage_reports")
    .select("*")
    .eq("stock_code", stockCode)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("[usage/supabase] fallback to local:", error?.message);
    return loadUsageReportsForStockLegacy(stockCode);
  }
  return (data as UsageReportRow[]).map(rowToReport);
};

/**
 * 新規「使った！」投稿を Supabase に追加する。
 * 失敗時 / 未認証時は localStorage にフォールバック保存する。
 */
export const addUsageReport = async (
  stockCode: string,
  report: UsageReport,
  userId: string | null,
): Promise<UsageReport> => {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) {
    addLocalUsageReportLegacy(stockCode, report);
    return report;
  }

  const { data, error } = await supabase
    .from("usage_reports")
    .insert({
      stock_code: stockCode,
      user_id: userId,
      reporter_name: report.reporterName,
      region: report.region ?? null,
      used_date: report.usedDate,
      comment: report.comment,
      image_url: report.imageUrl ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.warn("[usage/supabase] insert failed, fallback:", error?.message);
    addLocalUsageReportLegacy(stockCode, report);
    return report;
  }
  return rowToReport(data as UsageReportRow);
};

/**
 * 「使った！」を編集する。本人のみ（Supabase RLS）。
 */
export const updateUsageReport = async (
  stockCode: string,
  reportId: string,
  patch: Partial<UsageReport>,
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    updateLocalUsageReportLegacy(stockCode, reportId, patch);
    return;
  }

  const { error } = await supabase
    .from("usage_reports")
    .update({
      reporter_name: patch.reporterName,
      region: patch.region,
      used_date: patch.usedDate,
      comment: patch.comment,
      image_url: patch.imageUrl,
    })
    .eq("id", reportId);

  if (error) {
    console.warn("[usage/supabase] update failed, fallback:", error.message);
    updateLocalUsageReportLegacy(stockCode, reportId, patch);
  }
};

/**
 * 「使った！」を1件削除する。本人のみ（RLS）。
 */
export const deleteUsageReport = async (
  stockCode: string,
  reportId: string,
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    deleteLocalUsageReportLegacy(stockCode, reportId);
    return;
  }

  const { error } = await supabase
    .from("usage_reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.warn("[usage/supabase] delete failed, fallback:", error.message);
    deleteLocalUsageReportLegacy(stockCode, reportId);
  }
};

/**
 * 全銘柄の「使った！」を一気に読む。
 */
export const loadAllUsageReportsAsync = async (
  limit = 500,
): Promise<UsageReport[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return loadAllUsageReportsLegacy();

  const { data, error } = await supabase
    .from("usage_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("[usage/supabase] loadAll fallback:", error?.message);
    return loadAllUsageReportsLegacy();
  }
  return (data as UsageReportRow[]).map(rowToReport);
};

// ─────────────────────────────────────────────────────────
// 旧APIの再エクスポート（互換用）
// ─────────────────────────────────────────────────────────

export {
  usageReportsStorageKey,
  loadUsageReportsForStockLegacy as loadUsageReportsForStock,
  addLocalUsageReportLegacy as addLocalUsageReport,
  deleteLocalUsageReportLegacy as deleteLocalUsageReport,
  updateLocalUsageReportLegacy as updateLocalUsageReport,
  loadAllUsageReportsLegacy as loadAllUsageReports,
};
