"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
};

/**
 * 投稿カード内の画像表示。
 * クリックでフルスクリーンのライトボックスを開く。
 *
 * a11y / モバイル UX:
 *   - ESC でクローズ
 *   - 開いている間は body スクロールを禁止
 *   - decoding="async" + loading="lazy" でパフォーマンス確保
 */
export default function PostImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 block w-full overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-slate-300"
        aria-label={`${alt} を拡大表示`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="max-h-64 w-full bg-slate-50 object-contain"
        />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="画像を拡大表示"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            decoding="async"
            className="max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-slate-900 hover:bg-white"
            aria-label="画像を閉じる"
          >
            ✕ 閉じる
          </button>
        </div>
      )}
    </>
  );
}
