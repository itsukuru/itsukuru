"use client";

/**
 * MyPage 上に置く「会員登録 / ログイン」セクション。
 *
 * 機能はこれだけ:
 *   - メールアドレスで Magic Link を送信（登録 兼 ログイン）
 *   - ログイン中の表示 + ログアウト
 *   - ログイン直後にローカルとサーバーのデータをマージ
 *     - キニナル銘柄: 和集合（ローカル + サーバー）
 *     - プロフィール: サーバー優先、サーバーに無ければローカルをアップロード
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/app/lib/supabaseClient";
import { signInWithMagicLink, signOut } from "@/app/lib/authClient";
import {
  bulkPushFavorites,
  fetchCloudFavorites,
} from "@/app/lib/cloudFavorites";
import { fetchCloudProfile, pushCloudProfile } from "@/app/lib/cloudProfile";
import {
  loadFavoriteCodes,
  saveFavoriteCodes,
} from "@/app/lib/favoritesClient";
import { loadProfile, saveProfile } from "@/app/lib/profileClient";

export default function AuthSection() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const configured = isSupabaseConfigured();

  /**
   * ログイン直後にローカル ↔ サーバーをマージ。
   *   - キニナル: 和集合
   *   - プロフィール: サーバー優先、無ければローカルを upload
   * （関数宣言にして onAuthStateChange より上で定義し、eslint の TDZ 指摘を避ける）
   */
  async function mergeOnLogin() {
    setMerging(true);
    try {
      // --- キニナル銘柄: 和集合マージ
      const localFavs = loadFavoriteCodes();
      const cloudFavs = (await fetchCloudFavorites()) ?? [];
      const merged = Array.from(new Set([...cloudFavs, ...localFavs]));
      saveFavoriteCodes(merged);
      const onlyLocal = localFavs.filter((c) => !cloudFavs.includes(c));
      if (onlyLocal.length > 0) {
        await bulkPushFavorites(onlyLocal);
      }

      // --- プロフィール: サーバー優先、無ければローカルをアップロード
      const cloudProfile = await fetchCloudProfile();
      if (cloudProfile) {
        // サーバーの値で上書き（skipCloudPush=true で無限ループ防止）
        const localProfile = loadProfile();
        saveProfile(
          {
            displayName:
              cloudProfile.displayName || localProfile.displayName,
            joinedAt: cloudProfile.joinedAt || localProfile.joinedAt,
            region: cloudProfile.region ?? localProfile.region,
            registeredAt:
              cloudProfile.registeredAt ?? localProfile.registeredAt,
            agreedToPolicyAt:
              cloudProfile.agreedToPolicyAt ?? localProfile.agreedToPolicyAt,
          },
          { skipCloudPush: true }
        );
      } else {
        // サーバーに無い → ローカルをアップロード
        const localProfile = loadProfile();
        if (localProfile.registeredAt) {
          await pushCloudProfile(localProfile);
        }
      }
      setMessage(
        "ログインしました！ キニナル銘柄とプロフィールを同期しました。"
      );
    } catch (err) {
      console.warn("[AuthSection] mergeOnLogin failed:", err);
      setError("同期に一部失敗しました。詳細はコンソールをご確認ください。");
    } finally {
      setMerging(false);
    }
  }

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const next = session?.user ?? null;
        setUser(next);
        if (event === "SIGNED_IN" && next) {
          await mergeOnLogin();
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const result = await signInWithMagicLink(email);
    setSubmitting(false);
    if (result.ok) {
      setMessage(
        "確認メールを送信しました📧 受信トレイ（迷惑メールフォルダもご確認ください）のリンクをクリックすると登録/ログインが完了します。"
      );
      setEmail("");
    } else {
      setError("送信に失敗しました: " + result.error);
    }
  };

  const handleSignOut = async () => {
    if (
      !confirm(
        "ログアウトしますか？\n（この端末のキニナルや投稿などのローカルデータは残ります）"
      )
    ) {
      return;
    }
    await signOut();
    setMessage("ログアウトしました。");
  };

  if (!configured) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">会員登録（任意）</h2>
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          現在この環境では会員登録機能が無効化されています。引き続きこの端末のローカルでは全機能をご利用いただけます。
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">会員登録（任意）</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            user
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {user ? "ログイン中" : "未ログイン"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        メールを登録すると、別端末でもキニナルと表示名を同期できます（投稿データはこの端末に保存）。
      </p>

      {user ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            <div className="text-xs font-semibold">✅ ログイン中</div>
            <div className="mt-0.5 break-all">{user.email}</div>
          </div>
          {merging && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              ローカルとサーバーのデータを同期中…
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="mt-4 space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            メールアドレス
            <input
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="example@mail.com"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "送信中..." : "ログイン用リンクを送信"}
          </button>
          <p className="text-[10px] leading-relaxed text-slate-500">
            ※ パスワード不要。初めてのメールアドレスなら新規登録、登録済みならログインになります。
          </p>
        </form>
      )}

      {message && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}
    </section>
  );
}
