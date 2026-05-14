"use client";

import Link from "next/link";

/**
 * RootLayout 自体が落ちた場合の最後のフォールバック。
 * html / body から自前で出力する必要がある（Next.js 公式仕様）。
 *
 * SiteHeader や BottomNav が描画できない状況でも最低限のメッセージを表示する。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
          color: "#0f172a",
          padding: "16px",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "white",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            申し訳ありません、表示できません
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#475569",
            }}
          >
            ページの読み込み中に問題が発生しました。
            ブラウザを再読み込みするか、しばらく時間をおいて再度お試しください。
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              参照コード: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "#1d4ed8",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔄 再読み込み
          </button>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 12,
              fontSize: 13,
              color: "#1d4ed8",
              textDecoration: "none",
            }}
          >
            ホームへ戻る
          </Link>
        </div>
      </body>
    </html>
  );
}
