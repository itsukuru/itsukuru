/**
 * キニナル銘柄（watchlist）のサーバー側 CRUD。
 *
 * 設計:
 *   - 未ログイン / Supabase 未設定の場合は全関数が黙って no-op（false / null を返す）
 *   - localStorage 側との整合は呼び出し側で取る（マージは AuthSection で実施）
 */
import { getSupabaseClient } from "./supabaseClient";

const TABLE = "watchlist";

/** ログイン中ユーザーの watchlist を全件取得。未ログインなら null。 */
export const fetchCloudFavorites = async (): Promise<string[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("stock_code")
    .eq("user_id", user.id);

  if (error) {
    console.warn("[cloudFavorites] fetch failed:", error.message);
    return null;
  }
  return (data ?? []).map((r) => r.stock_code as string);
};

/** 1件追加（既に存在しても upsert で安全）。未ログインなら no-op で false。 */
export const addCloudFavorite = async (stockCode: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from(TABLE).upsert(
    { user_id: user.id, stock_code: stockCode },
    { onConflict: "user_id,stock_code" }
  );
  if (error) {
    console.warn("[cloudFavorites] add failed:", error.message);
    return false;
  }
  return true;
};

/** 1件削除。未ログインなら no-op で false。 */
export const removeCloudFavorite = async (
  stockCode: string
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", user.id)
    .eq("stock_code", stockCode);
  if (error) {
    console.warn("[cloudFavorites] remove failed:", error.message);
    return false;
  }
  return true;
};

/** 複数件をまとめて upsert（ログイン時のマージで使用）。 */
export const bulkPushFavorites = async (
  stockCodes: string[]
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if (stockCodes.length === 0) return true;

  const rows = stockCodes.map((code) => ({
    user_id: user.id,
    stock_code: code,
  }));
  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "user_id,stock_code" });
  if (error) {
    console.warn("[cloudFavorites] bulk push failed:", error.message);
    return false;
  }
  return true;
};
