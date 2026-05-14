/**
 * Supabase 版「届いた！」クライアント（dry-run / 雛形）
 * ─────────────────────────────────────────────────────────
 * ⚠️ このファイルはまだどこからも import されていません。
 *
 * 既存の reportsClient.ts（localStorage 専用）に対し、Supabase で
 * 読み書きする版を独立ファイルとして用意したものです。明朝、以下の
 * 手順でアプリ全体を切り替えられます。
 *
 *   1. 全コンポーネントの
 *        from "@/app/lib/reportsClient"
 *      を
 *        from "@/app/lib/reportsClientSupabase"
 *      へ書き換え（IDE の「Find & Replace」で一括）
 *   2. 関数の呼び出し側を `await` 対応に修正
 *      （関数のシグネチャが同期 → 非同期に変わるため）
 *   3. supabase/migrations/0005_arrival_reports_phase.sql を本番反映
 *      （これがないと phase カラムが無く INSERT が失敗する）
 *
 * フォールバック仕様:
 *   - Supabase 未設定（環境変数が空）の場合は localStorage に保存する。
 *   - そのため Vercel に環境変数を入れる前でもアプリは壊れない。
 * ─────────────────────────────────────────────────────────
 */

import type { BenefitReport, ReportPhase } from "@/app/data/benefitReports";
import { seedBenefitReports } from "@/app/data/benefitReports";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import {
  loadLocalReportsForStock as loadLocalReportsForStockLegacy,
  addLocalReport as addLocalReportLegacy,
  deleteLocalReport as deleteLocalReportLegacy,
  updateLocalReport as updateLocalReportLegacy,
  loadAllLocalReports as loadAllLocalReportsLegacy,
  reportsStorageKey,
} from "@/app/lib/reportsClient";

// ─────────────────────────────────────────────────────────
// 内部ユーティリティ: DB行 → BenefitReport の変換
// ─────────────────────────────────────────────────────────

type ArrivalReportRow = {
  id: string;
  stock_code: string;
  reporter_name: string | null;
  region: string | null;
  arrival_date: string;
  comment: string | null;
  image_url: string | null;
  helpful_count: number | null;
  phase: string | null;
  created_at: string;
};

const isReportPhase = (v: unknown): v is ReportPhase =>
  v === "notice" || v === "actual" || v === "pending";

const rowToReport = (row: ArrivalReportRow): BenefitReport => ({
  id: row.id,
  stockCode: row.stock_code,
  reporterName: row.reporter_name ?? "匿名",
  region: row.region ?? undefined,
  arrivalDate: row.arrival_date,
  comment: row.comment ?? "",
  imageUrl: row.image_url ?? undefined,
  helpfulCount: row.helpful_count ?? 0,
  phase: isReportPhase(row.phase) ? row.phase : "actual",
  createdAt: row.created_at,
});

// ─────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────

/**
 * 指定銘柄の「届いた！」を Supabase から取得する。
 * Supabase 未設定時はローカルにフォールバック。
 * シードデータは常に末尾に連結する（既存挙動の互換）。
 */
export const loadReportsForStock = async (
  stockCode: string,
): Promise<BenefitReport[]> => {
  const supabase = getSupabaseClient();
  const seed = seedBenefitReports.filter((r) => r.stockCode === stockCode);

  if (!supabase) {
    return [...loadLocalReportsForStockLegacy(stockCode), ...seed];
  }

  const { data, error } = await supabase
    .from("arrival_reports")
    .select("*")
    .eq("stock_code", stockCode)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("[reports/supabase] fallback to local:", error?.message);
    return [...loadLocalReportsForStockLegacy(stockCode), ...seed];
  }

  return [...(data as ArrivalReportRow[]).map(rowToReport), ...seed];
};

/**
 * 新規「届いた！」投稿を Supabase に追加する。
 * 失敗時は localStorage へフォールバック保存する（オフライン用）。
 *
 * report.id, report.createdAt は呼び出し側で生成済みの想定。
 * Supabase に保存後は DB 側の id / created_at で上書きした BenefitReport を返す。
 */
export const addReport = async (
  stockCode: string,
  report: BenefitReport,
  userId: string | null,
): Promise<BenefitReport> => {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) {
    addLocalReportLegacy(stockCode, report);
    return report;
  }

  const { data, error } = await supabase
    .from("arrival_reports")
    .insert({
      stock_code: stockCode,
      user_id: userId,
      reporter_name: report.reporterName,
      region: report.region ?? null,
      arrival_date: report.arrivalDate,
      comment: report.comment,
      image_url: report.imageUrl ?? null,
      phase: report.phase ?? "actual",
    })
    .select()
    .single();

  if (error || !data) {
    console.warn("[reports/supabase] insert failed, fallback:", error?.message);
    addLocalReportLegacy(stockCode, report);
    return report;
  }
  return rowToReport(data as ArrivalReportRow);
};

/**
 * 「届いた！」を編集する。本人のみ（Supabase の RLS で守られる）。
 */
export const updateReport = async (
  stockCode: string,
  reportId: string,
  patch: Partial<BenefitReport>,
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    updateLocalReportLegacy(stockCode, reportId, patch);
    return;
  }

  const { error } = await supabase
    .from("arrival_reports")
    .update({
      reporter_name: patch.reporterName,
      region: patch.region,
      arrival_date: patch.arrivalDate,
      comment: patch.comment,
      image_url: patch.imageUrl,
      phase: patch.phase,
    })
    .eq("id", reportId);

  if (error) {
    console.warn("[reports/supabase] update failed, fallback:", error.message);
    updateLocalReportLegacy(stockCode, reportId, patch);
  }
};

/**
 * 「届いた！」を1件削除する。本人のみ（RLS）。
 */
export const deleteReport = async (
  stockCode: string,
  reportId: string,
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    deleteLocalReportLegacy(stockCode, reportId);
    return;
  }

  const { error } = await supabase
    .from("arrival_reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.warn("[reports/supabase] delete failed, fallback:", error.message);
    deleteLocalReportLegacy(stockCode, reportId);
  }
};

/**
 * 全銘柄の「届いた！」を一気に読む（カレンダー画面・通知画面で使用）。
 * 100 件以上は重くなるので order + limit でページネーション推奨。
 */
export const loadAllReports = async (limit = 500): Promise<BenefitReport[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [...loadAllLocalReportsLegacy(), ...seedBenefitReports];
  }

  const { data, error } = await supabase
    .from("arrival_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("[reports/supabase] loadAll fallback:", error?.message);
    return [...loadAllLocalReportsLegacy(), ...seedBenefitReports];
  }
  return [...(data as ArrivalReportRow[]).map(rowToReport), ...seedBenefitReports];
};

// ─────────────────────────────────────────────────────────
// 旧APIの再エクスポート（互換用）
// ─────────────────────────────────────────────────────────
// 既存コンポーネントの import を一括書き換えしやすいよう、
// 既存の同期APIもこのモジュールから提供する。
//
// ⚠️ 一括書き換え後は、書き込み系（addLocalReport 等）は使わず、
//    非同期版の addReport / updateReport / deleteReport を使うこと。

export {
  reportsStorageKey,
  loadLocalReportsForStockLegacy as loadLocalReportsForStock,
  addLocalReportLegacy as addLocalReport,
  deleteLocalReportLegacy as deleteLocalReport,
  updateLocalReportLegacy as updateLocalReport,
  loadAllLocalReportsLegacy as loadAllLocalReports,
};

export { isToday, formatRelativeTime } from "@/app/lib/reportsClient";
