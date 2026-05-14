/**
 * お問い合わせフォームの送信ロジック。
 *
 * 仕組み:
 *   - Supabase 未設定 → エラーを返す（フォールバックなし）
 *   - 設定済み → public.contact_messages テーブルへ INSERT
 *
 * RLS により未認証ユーザーでも INSERT のみ可能。
 * 閲覧は管理者が Supabase Dashboard で行う。
 */
import { getSupabaseClient } from "./supabaseClient";

export type ContactCategory =
  | "bug"
  | "wrong_info"
  | "report_post"
  | "feature"
  | "other";

export const CATEGORY_LABELS: Record<ContactCategory, string> = {
  bug: "🐛 不具合の報告",
  wrong_info: "📋 優待情報の誤り",
  report_post: "🚨 不適切な投稿の通報",
  feature: "💡 機能要望",
  other: "💬 その他",
};

export type ContactSubmitInput = {
  category: ContactCategory;
  message: string;
  email?: string;
  relatedCode?: string;
  relatedUrl?: string;
};

export type ContactSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

const validate = (input: ContactSubmitInput): string | null => {
  if (!input.category) return "種別を選択してください。";
  const msg = input.message?.trim() ?? "";
  if (msg.length < 5) return "本文は5文字以上で入力してください。";
  if (msg.length > 5000) return "本文は5000文字以内で入力してください。";
  if (input.email && input.email.trim() && !/.+@.+\..+/.test(input.email)) {
    return "メールアドレスの形式が正しくありません。";
  }
  if (input.relatedCode && !/^\d{4,5}[A-Za-z0-9]?$/.test(input.relatedCode.trim())) {
    return "銘柄コードは4〜5桁の数字（または銘柄コードの形式）で入力してください。";
  }
  return null;
};

export const submitContactMessage = async (
  input: ContactSubmitInput
): Promise<ContactSubmitResult> => {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "送信機能が利用できません。お手数ですがメールでご連絡ください。",
    };
  }

  const payload = {
    category: input.category,
    message: input.message.trim(),
    email: input.email?.trim() || null,
    related_code: input.relatedCode?.trim() || null,
    related_url: input.relatedUrl?.trim() || null,
    user_agent:
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, 500)
        : null,
  };

  const { error } = await supabase.from("contact_messages").insert(payload);
  if (error) {
    console.warn("[contactClient] insert failed:", error.message);
    return { ok: false, error: `送信に失敗しました: ${error.message}` };
  }
  return { ok: true };
};
