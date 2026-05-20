"use client";

import { useEffect, useState } from "react";
import type { ReportPhase } from "@/app/data/benefitReports";

type Props = {
  kind: "arrival" | "usage";
  stockCode: string;
  stockName: string;
  postId: string;
  /** kind が arrival のとき、共有文に反映（未指定は「優待品が届いた」扱い） */
  arrivalPhase?: ReportPhase;
  className?: string;
};

function sharePhrase(kind: "arrival" | "usage", arrivalPhase?: ReportPhase): string {
  if (kind === "usage") {
    return "🎫株主優待を使った";
  }
  switch (arrivalPhase) {
    case "notice":
      return "✉️案内状・申込書が届いた";
    case "pending":
      return "⏳まだ届いていない（記録）";
    case "actual":
    default:
      return "🎁優待品が届いた";
  }
}

/** 自分の投稿用：X・LINE・投稿URLコピーを控えめに並べる */
export default function OwnPostShareLinks({
  kind,
  stockCode,
  stockName,
  postId,
  arrivalPhase,
  className = "",
}: Props) {
  const [urls, setUrls] = useState<{
    /** 投稿アンカー付き（リンクコピー用） */
    deepUrl: string;
    xUrl: string;
    lineUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const anchor =
      kind === "arrival" ? `arrival-report-${postId}` : `usage-report-${postId}`;
    const origin = window.location.origin;
    const deepUrl = `${origin}/stock/${stockCode}#${anchor}`;
    const phrase = sharePhrase(kind, arrivalPhase);
    const shareText = `【${stockName}（${stockCode}）】${phrase}｜いつクル？`;
    const euDeep = encodeURIComponent(deepUrl);
    const et = encodeURIComponent(shareText);
    setUrls({
      deepUrl,
      xUrl: `https://twitter.com/intent/tweet?text=${et}&url=${euDeep}&hashtags=株主優待,いつクル`,
      lineUrl: `https://social-plugins.line.me/lineit/share?url=${euDeep}&text=${et}`,
    });
  }, [kind, stockCode, stockName, postId, arrivalPhase]);

  const handleCopy = async () => {
    if (!urls) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urls.deepUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = urls.deepUrl;
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
      // ignore
    }
  };

  if (!urls) {
    return null;
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 text-[10px] text-slate-400 ${className}`}
    >
      <span className="mr-0.5 text-slate-200" aria-hidden>
        ·
      </span>
      <a
        href={urls.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded px-0.5 hover:bg-slate-100 hover:text-slate-600 hover:underline"
        aria-label="X で共有（投稿の種類が本文に入ります。必要なら編集してから投稿できます）"
      >
        X
      </a>
      <a
        href={urls.lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded px-0.5 hover:bg-slate-100 hover:text-slate-600 hover:underline"
        aria-label="LINE で銘柄ページへのリンクを送る"
      >
        LINE
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded px-0.5 hover:bg-slate-100 hover:text-slate-600 hover:underline"
        aria-label="この投稿へ直接飛ぶURL（#付き）をコピー"
      >
        {copied ? "コピー済" : "リンク"}
      </button>
    </span>
  );
}
