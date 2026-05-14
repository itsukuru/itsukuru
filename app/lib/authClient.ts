/**
 * 会員登録/ログイン（Magic Link 認証）
 *
 * 設計:
 *   - パスワード不要。メールに届くリンクをクリックすると認証完了
 *   - 初回ログイン時に auth.users が作られ、トリガーで public.profiles が自動作成される
 *   - サインアウトしてもこの端末のローカルデータ（投稿・保有・キニナル等）は残す
 */
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * メールアドレス宛に Magic Link を送信する。
 * 未登録のメールアドレスでも自動で新規登録される（shouldCreateUser=true）。
 */
export const signInWithMagicLink = async (
  email: string
): Promise<SignInResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase 未設定です" };

  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "メールアドレスを入力してください" };

  const emailRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/mypage`
      : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: true,
      emailRedirectTo,
    },
  });

  if (error) {
    console.warn("[auth] signInWithMagicLink failed:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
};
