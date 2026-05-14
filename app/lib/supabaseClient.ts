/**
 * Supabaseクライアント（ブラウザ用・最小版）
 *
 * 用途は「会員登録 + キニナル銘柄 + プロフィール のみ」に限定。
 * 環境変数が未設定の場合は null を返し、利用側でローカルのみ動作にフォールバック。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !key ||
    url.includes("YOUR-PROJECT") ||
    key.includes("xxxxx") ||
    key.startsWith("ここに")
  ) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
};

export const isSupabaseConfigured = (): boolean => getSupabaseClient() !== null;
