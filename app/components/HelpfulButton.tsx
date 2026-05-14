"use client";

import { useEffect, useState } from "react";
import { isLiked, toggleLike, type LikeTargetType } from "@/app/lib/likesClient";

type Props = {
  targetType: LikeTargetType;
  targetId: string;
  /** サーバー側のカウント（denormalized） */
  initialCount?: number;
};

/**
 * 投稿への「いいね」ボタン。
 * - ローカルストレージで自分のいいね状態を管理
 * - 押すと楽観的にカウントを増減し、Supabase へ非同期反映
 */
export default function HelpfulButton({
  targetType,
  targetId,
  initialCount = 0,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setLiked(isLiked(targetType, targetId));
  }, [targetType, targetId]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleClick = () => {
    const next = toggleLike(targetType, targetId);
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
  };

  const label = liked ? "いいね済み" : "いいね";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
        liked
          ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
          : "border-slate-300 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
      }`}
      title={liked ? "いいねを取り消す" : "いいねする"}
    >
      <span aria-hidden>👍</span>
      <span>{label}</span>
      {count > 0 && (
        <span className="rounded-full bg-white/60 px-1.5 text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}
