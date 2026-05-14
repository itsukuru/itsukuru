"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Next.js のルートレベルでスローされたエラーを受け止めるエラーバウンダリ。
 * Server Component / Client Component の双方からの予期せぬ例外を捕捉する。
 *
 * 表示はあくまでユーザー向け。本物の調査ログは Vercel Logs / Sentry 側で確認する。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 将来 Sentry / LogRocket 等を導入した際はここから送信する
    // 開発中は console に出して確認
    if (process.env.NODE_ENV !== "production") {
      console.error("[App Error]", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-rose-100 text-4xl">
          ⚠️
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-rose-600">
          Error
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          一時的な問題が発生しました
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          時間をおいてからもう一度お試しください。
          繰り返し発生する場合はお問い合わせフォームよりご連絡ください。
        </p>

        {error.digest && (
          <p className="mt-3 text-[11px] text-slate-400">
            参照コード: {error.digest}
          </p>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
          >
            🔄 もう一度試す
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
          >
            🏠 ホームへ戻る
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-800">
            問題が繰り返される場合
          </p>
          <p className="mt-2">
            <Link href="/contact" className="text-blue-700 hover:underline">
              お問い合わせフォーム
            </Link>
            より、操作内容・ご利用端末（PC / スマホ）・ブラウザを添えてご連絡いただけると助かります。
          </p>
        </div>
      </div>
    </main>
  );
}
