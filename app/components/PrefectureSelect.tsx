"use client";

/**
 * 47都道府県を選ぶプルダウン。
 *   - 空文字 "" を「選択しない（未指定）」として最上段に置く
 *   - 海外居住者向けに最下段に「海外・その他」を追加
 *   - 既存のフリーテキストデータ（"東京都" 等）は保持され、リストにない値の場合は
 *     ユーザー入力値も表示して取りこぼさない
 */
import { OVERSEAS_LABEL, PREFECTURES, isKnownRegion } from "@/app/data/prefectures";

type Props = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  /** 未選択時のラベル */
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
};

const DEFAULT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function PrefectureSelect({
  value,
  onChange,
  className,
  emptyLabel = "選択しない（未指定 / 匿名OK）",
  disabled,
  id,
  name,
}: Props) {
  const current = value ?? "";
  // 過去にフリーテキストで保存された値（リストに無い値）は表示として保持
  const showLegacy = current !== "" && !isKnownRegion(current);

  return (
    <select
      id={id}
      name={name}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className ?? DEFAULT_CLASS}
    >
      <option value="">{emptyLabel}</option>
      {PREFECTURES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
      <option value={OVERSEAS_LABEL}>{OVERSEAS_LABEL}</option>
      {showLegacy && (
        <option value={current}>{current}（過去の登録値）</option>
      )}
    </select>
  );
}
