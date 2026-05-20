"use client";

import { useId, useMemo } from "react";
import { getTodayIsoDate } from "@/app/lib/reportsClient";

const ISO_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toIsoSafe(y: number, mo: number, d: number): string {
  const max = daysInMonth(y, mo);
  const d2 = Math.min(Math.max(1, d), max);
  return `${y}-${pad2(mo)}-${pad2(d2)}`;
}

function parseIso(iso: string): { y: number; mo: number; d: number } | null {
  const m = iso.trim().match(ISO_YMD);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const max = daysInMonth(y, mo);
  if (d > max) return { y, mo, d: max };
  return { y, mo, d };
}

type Props = {
  id?: string;
  label?: string;
  /** YYYY-MM-DD */
  valueIso: string;
  onChangeIso: (isoYmd: string) => void;
  /** 値が空・無効のときの表示・補完用（省略時は本日）。optional で未設定のときは使わない */
  fallbackIso?: string;
  required?: boolean;
  /**
   * true のとき、年を「年（未設定）」に戻すと空文字を親へ渡す（最終確認日など任意項目向け）。
   * 投稿の到着日・使用日など必須項目では false のままにしてください。
   */
  optional?: boolean;
  labelClassName?: string;
  inputClassName?: string;
};

/**
 * 年月日をそれぞれプルダウンで選択（YYYY-MM-DD を組み立てる）。
 */
export default function DateYyyymmddField({
  id: idProp,
  label = "",
  valueIso,
  onChangeIso,
  fallbackIso,
  required,
  optional = false,
  labelClassName = "mb-1 block text-xs font-medium text-slate-600",
  inputClassName =
    "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-sans text-slate-900 shadow-sm [color-scheme:light]",
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const fieldId = idProp ?? `ymd-${reactId}`;
  const fallbackParsed = parseIso(fallbackIso ?? getTodayIsoDate())!;
  const parsed = parseIso(valueIso);

  const currentYear = new Date().getFullYear();
  /** 現在年を中心に直近数年のみ（例: 2026 → 2026…2023） */
  const yearMin = currentYear - 3;
  const yearMax = currentYear;
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = yearMax; y >= yearMin; y -= 1) list.push(y);
    const pickedY = parsed?.y ?? fallbackParsed.y;
    if (pickedY < yearMin || pickedY > yearMax) {
      if (!list.includes(pickedY)) {
        list.push(pickedY);
        list.sort((a, b) => b - a);
      }
    }
    return list;
  }, [yearMin, yearMax, parsed?.y, fallbackParsed.y]);

  const unset = optional && !parsed;
  const eff = unset ? null : (parsed ?? fallbackParsed);
  const maxDay = eff ? daysInMonth(eff.y, eff.mo) : 31;
  const dayNumbers = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  const rowClass = `flex flex-wrap items-stretch gap-2 ${inputClassName}`;

  return (
    <div>
      {label ? (
        <div id={`${fieldId}-label`} className={labelClassName}>
          {label}
        </div>
      ) : null}
      <div className={rowClass} role="group" aria-labelledby={label ? `${fieldId}-label` : undefined}>
        <select
          id={`${fieldId}-y`}
          className="min-w-[6.5rem] flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm sm:min-w-[7rem]"
          aria-label="年"
          required={required && !optional}
          value={unset ? "" : String(eff!.y)}
          onChange={(e) => {
            const v = e.target.value;
            if (optional && v === "") {
              onChangeIso("");
              return;
            }
            const y = Number(v);
            if (!Number.isFinite(y)) return;
            if (unset) {
              onChangeIso(toIsoSafe(y, 1, 1));
              return;
            }
            onChangeIso(toIsoSafe(y, eff!.mo, eff!.d));
          }}
        >
          {optional ? (
            <option value="" disabled={required}>
              年を選択
            </option>
          ) : null}
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          id={`${fieldId}-m`}
          className="min-w-[5rem] flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          aria-label="月"
          required={required && !optional}
          disabled={unset}
          value={unset ? "" : String(eff!.mo)}
          onChange={(e) => {
            if (unset) return;
            const mo = Number(e.target.value);
            if (!Number.isFinite(mo)) return;
            onChangeIso(toIsoSafe(eff!.y, mo, eff!.d));
          }}
        >
          {unset ? (
            <option value="">月</option>
          ) : (
            Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
              <option key={mo} value={mo}>
                {mo}月
              </option>
            ))
          )}
        </select>
        <select
          id={`${fieldId}-d`}
          className="min-w-[5rem] flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          aria-label="日"
          required={required && !optional}
          disabled={unset}
          value={unset ? "" : String(eff!.d)}
          onChange={(e) => {
            if (unset) return;
            const d = Number(e.target.value);
            if (!Number.isFinite(d)) return;
            onChangeIso(toIsoSafe(eff!.y, eff!.mo, d));
          }}
        >
          {unset ? (
            <option value="">日</option>
          ) : (
            dayNumbers.map((d) => (
              <option key={d} value={d}>
                {d}日
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
