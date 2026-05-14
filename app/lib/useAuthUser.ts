"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";

/**
 * 現在ログイン中の Supabase User をリアクティブに購読する。
 * - 初回マウント時に `auth.getUser()` を呼んで状態を取得
 * - その後 `onAuthStateChange` を購読して、ログイン / サインアウトに自動追従
 * - Supabase 未設定の場合は常に { user: null, loading: false, ready: true }
 *
 * 戻り値:
 *   user    : 現在ログイン中のユーザー or null
 *   loading : 初回取得中のみ true（ローディング表示判定用）
 *   ready   : Supabase 設定が完了して購読が確立したか
 */
export type AuthUserState = {
  user: User | null;
  loading: boolean;
  ready: boolean;
};

export const useAuthUser = (): AuthUserState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUser(null);
      setLoading(false);
      setReady(true);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setUser(data.user);
          setLoading(false);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
          setReady(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, ready };
};
