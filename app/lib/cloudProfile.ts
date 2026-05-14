/**
 * プロフィール（profiles）のサーバー側 CRUD。
 *
 * 設計:
 *   - スキーマ: public.profiles (id, display_name, region, registered_at, agreed_to_policy_at, created_at)
 *   - id は auth.users.id と同じ uuid。新規ユーザー作成時にトリガーで自動 insert される
 *   - 未ログイン / Supabase 未設定なら no-op
 *   - 「joinedAt」はクライアント側の概念で、サーバーの created_at に対応する
 */
import { getSupabaseClient } from "./supabaseClient";
import type { UserProfile } from "./profileClient";

const TABLE = "profiles";

type CloudProfileRow = {
  id: string;
  display_name: string;
  region: string | null;
  registered_at: string | null;
  agreed_to_policy_at: string | null;
  created_at: string;
};

/** サーバー上の自分のプロフィールを取得。未ログインなら null。 */
export const fetchCloudProfile = async (): Promise<UserProfile | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[cloudProfile] fetch failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as CloudProfileRow;
  return {
    displayName: row.display_name || "ゲスト",
    joinedAt: row.created_at,
    region: row.region ?? undefined,
    registeredAt: row.registered_at ?? undefined,
    agreedToPolicyAt: row.agreed_to_policy_at ?? undefined,
  };
};

/** ローカルのプロフィールをサーバーに反映。未ログインなら no-op で false。 */
export const pushCloudProfile = async (
  profile: UserProfile
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(TABLE)
    .update({
      display_name: profile.displayName,
      region: profile.region ?? null,
      registered_at: profile.registeredAt ?? null,
      agreed_to_policy_at: profile.agreedToPolicyAt ?? null,
    })
    .eq("id", user.id);

  if (error) {
    console.warn("[cloudProfile] push failed:", error.message);
    return false;
  }
  return true;
};
