"use client";

import { useEffect, useState } from "react";

type Props = {
  stockCode: string;
  stockName: string;
};

/**
 * 銘柄詳細ページ専用のシェア UI。
 * - Web Share API（iOS Safari / Android Chrome）で OS ネイティブ共有
 * - LINE / X / Facebook / Threads の個別シェア
 * - URL コピー（フォールバック付き）
 */
export default function ShareButtons({ stockCode, stockName }: Props) {
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPageUrl(window.location.href);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  const shareText = `${stockName}（${stockCode}）の株主優待、いつ届く？いつ使った？を共有 - いつクル？`;
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(shareText);

  const xUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=株主優待,いつクル`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`;

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ url: pageUrl, text: shareText, title: stockName });
    } catch {
      // ユーザーがキャンセル
    }
  };

  const handleCopy = async () => {
    if (!pageUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pageUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = pageUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード書き込み拒否
    }
  };

  if (!pageUrl) {
    return null;
  }

  return (
    <section
      aria-label="この銘柄をシェア"
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-700">この銘柄をシェア:</span>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label="共有する"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition active:scale-95 hover:bg-slate-800"
          >
            <span aria-hidden>📤</span>
            <span>共有</span>
          </button>
        )}

        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LINE で共有"
          className="inline-flex items-center gap-1 rounded-lg bg-[#06C755] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-[#05b14a]"
        >
          <span>LINE</span>
        </a>

        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X (Twitter) で共有"
          className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-slate-800"
        >
          <span>X</span>
        </a>

        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook で共有"
          className="inline-flex items-center gap-1 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-[#1666d6]"
        >
          <span>f</span>
        </a>

        <a
          href={threadsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Threads で共有"
          className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-slate-600"
        >
          <span>@</span>
        </a>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="URL をコピー"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition active:scale-95 hover:bg-slate-100"
        >
          <span aria-hidden>{copied ? "✓" : "🔗"}</span>
          <span className={copied ? "text-emerald-700" : ""}>
            {copied ? "コピー済" : "リンク"}
          </span>
        </button>
      </div>
    </section>
  );
}
