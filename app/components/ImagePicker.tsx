"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { uploadReportImage } from "@/app/lib/imageUploadClient";
import { useAuthUser } from "@/app/lib/useAuthUser";
import { isSupabaseConfigured } from "@/app/lib/supabaseClient";

type Props = {
  /** "arrival" | "usage" などのサブフォルダ名 */
  folder: "arrival" | "usage";
  /** 現在の値（公開URL or data URL） */
  value: string | undefined;
  /** 変更時のハンドラ。undefined を渡すと削除扱い */
  onChange: (next: string | undefined) => void;
  /** 配色のアクセント。submit ボタンと色を合わせるのに使う */
  accent?: "blue" | "sky";
};

const ACCENT: Record<NonNullable<Props["accent"]>, { text: string; bg: string; ring: string }> = {
  blue: {
    text: "text-blue-700",
    bg: "bg-blue-50 hover:bg-blue-100",
    ring: "ring-blue-300",
  },
  sky: {
    text: "text-sky-700",
    bg: "bg-sky-50 hover:bg-sky-100",
    ring: "ring-sky-300",
  },
};

/**
 * 投稿フォームに組み込む画像添付ピッカー。
 *
 * 仕様:
 *   - **会員限定**: 未ログイン時はピッカー UI を表示せず、ログイン誘導を出す
 *   - 個人情報の写り込み防止のため、短い注意＋同意チェックで添付を有効化
 *   - カメラ起動 (capture="environment") も対応
 *   - 自動でリサイズ & JPEG 化（EXIF も除去される）
 *   - Supabase が有効なら Storage に upload、未設定なら data URL を保持
 */
export default function ImagePicker({ folder, value, onChange, accent = "blue" }: Props) {
  const { user, loading } = useAuthUser();
  const supabaseConfigured = isSupabaseConfigured();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const color = ACCENT[accent];

  const requiresAuth = supabaseConfigured;
  const isAuthed = !!user;

  const pick = () => {
    if (!agreed) {
      setErr("チェックを入れてから写真を選択してください");
      return;
    }
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setErr(null);
    try {
      const result = await uploadReportImage(file, folder);
      onChange(result.url);
      if (!result.uploaded) {
        setErr("📡 オフライン保存：この端末でのみ画像が表示されます");
      }
    } catch (e) {
      setErr((e as Error).message || "画像のアップロードに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (requiresAuth && !loading && !isAuthed) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 text-center">
        <p className="text-xs font-medium text-slate-700">
          写真を添付するには会員登録が必要です
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          スパム対策のため画像のみログイン必須です。コメント・日付の投稿はそのまま利用できます。
        </p>
        <Link
          href="/mypage"
          className="mt-2 inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          マイページで登録
        </Link>
      </div>
    );
  }

  if (requiresAuth && loading) {
    return (
      <div className="h-10 animate-pulse rounded-lg bg-slate-100" aria-hidden />
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!value && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-slate-600">
            宛名・住所・券番号など<strong className="font-medium text-slate-800">個人情報が写らない</strong>
            ようご注意ください。アップロード時に位置情報（EXIF）は削除されます。
          </p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-slate-600"
            />
            上記に同意して写真を添付する
          </label>
        </div>
      )}

      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="添付プレビュー"
            className="max-h-48 w-full rounded-lg object-contain ring-1 ring-slate-200"
          />
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setAgreed(false);
            }}
            className="absolute right-1 top-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs text-white hover:bg-slate-900"
          >
            削除
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy || !agreed}
          aria-disabled={busy || !agreed}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${color.bg} ${color.text} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {busy ? (
            <>アップロード中…</>
          ) : !agreed ? (
            <>チェック後に写真を選択できます</>
          ) : (
            <>写真を選択（カメラ可）</>
          )}
        </button>
      )}
      {err && (
        <p
          role="alert"
          className={`text-[11px] ${
            err.startsWith("📡") ? "text-slate-500" : "text-rose-600"
          }`}
        >
          {err}
        </p>
      )}
    </div>
  );
}
