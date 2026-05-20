"use client";

import { useState } from "react";
import { SITE_URL, SITE_NAME } from "@/app/lib/siteConfig";

type Props = {
  /** シェアするページの相対パス（例: "/stock/7203"）。未指定時は現在のページ */
  path?: string;
  /** シェアテキスト（ない場合は SITE_NAME を使う） */
  text?: string;
  /** 配置サイズ。compact は小さいフッター用、large はメインボタン用 */
  size?: "compact" | "default" | "large";
  /** ラベル表示（compact は icon-only） */
  showLabel?: boolean;
};

/**
 * シェアボタン集合（X → LINE → リンクコピーの順）
 */
export default function ShareButtons({
  path,
  text,
  size = "default",
  showLabel = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== "undefined"
      ? window.location.origin + (path ?? window.location.pathname)
      : `${SITE_URL}${path ?? ""}`;

  const shareText = text ?? `${SITE_NAME} — 株主優待がいつ届く？がわかる到着共有コミュニティ`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(shareText);

  const xUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}&hashtags=株主優待,いつクル`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`;

  const padding =
    size === "large" ? "px-4 py-3 text-sm" : size === "compact" ? "p-2 text-base" : "px-3 py-2 text-sm";
  const gap = size === "compact" ? "gap-1.5" : "gap-2";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullUrl;
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

  return (
    <div className={`flex flex-wrap items-center ${gap}`}>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X (Twitter) で共有"
        className={`inline-flex items-center gap-1.5 rounded-full bg-black ${padding} font-medium text-white shadow-sm transition active:scale-95 hover:bg-slate-800`}
      >
        <span aria-hidden className="font-black">
          X
        </span>
        {showLabel && size !== "compact" && <span className="sr-only">で共有</span>}
      </a>

      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LINE で共有"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#06C755] ${padding} font-medium text-white shadow-sm transition active:scale-95 hover:bg-[#05b14a]`}
      >
        <span aria-hidden>LINE</span>
        {showLabel && size !== "compact" && <span className="sr-only">で共有</span>}
      </a>

      <button
        type="button"
        onClick={handleCopy}
        aria-label="URL をコピー"
        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white ${padding} font-medium text-slate-700 shadow-sm transition active:scale-95 hover:bg-slate-100`}
      >
        <span aria-hidden>{copied ? "✓" : "🔗"}</span>
        {showLabel && (
          <span className={copied ? "text-emerald-700" : ""}>
            {copied ? "コピー済" : "リンク"}
          </span>
        )}
      </button>
    </div>
  );
}
