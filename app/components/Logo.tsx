import Link from "next/link";

/**
 * 「いつクル？」のロゴ。
 *
 * サウナイキタイ風のタイポグラフィ・ロゴ。
 * アイコンは持たず、和文ワードマーク 1 つで完結。
 *
 *   いつクル？   ← "？"だけ sky-500 で軽くアクセント
 *
 * size:
 *   - "sm": フッター等の小さい場所向け
 *   - "md": ヘッダー向け（デフォルト）
 */
type Props = {
  size?: "sm" | "md";
  href?: string;
};

export default function Logo({ size = "md", href = "/" }: Props) {
  const isSm = size === "sm";
  const wordmarkClass = isSm
    ? "text-base sm:text-lg"
    : "text-xl sm:text-[1.65rem]";

  const inner = (
    <span
      className={`inline-flex items-baseline font-black tracking-tighter text-slate-900 ${wordmarkClass}`}
      style={{ letterSpacing: "-0.04em" }}
    >
      <span>いつ</span>
      <span className="text-blue-700">クル</span>
      <span>？</span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="いつクル？ ホームへ">
      {inner}
    </Link>
  );
}
