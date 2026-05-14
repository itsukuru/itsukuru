"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  createEmptyBenefit,
  loadBenefitForStock,
  saveBenefitForStock,
} from "@/app/lib/benefitsClient";
import { isUserRegistered, loadProfile } from "@/app/lib/profileClient";
import {
  CONFIDENCE_META,
  getEffectiveConfidence,
  type BenefitConfidence,
  type StockBenefit,
  type TieredBenefit,
} from "@/app/data/stockBenefits";
import { detectCategories, BENEFIT_CATEGORIES } from "@/app/lib/benefitCategories";
import DateYyyymmddField from "@/app/components/DateYyyymmddField";
import { getTodayIsoDate } from "@/app/lib/reportsClient";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * "3月, 9月" のような文字列を [3, 9] に変換する。
 */
const parseRightsMonthsToArray = (text: string): number[] => {
  const out: number[] = [];
  const re = /(\d{1,2})\s*月/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 12 && !out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
};

const monthsArrayToString = (months: number[]): string =>
  months.length === 0 ? "" : months.sort((a, b) => a - b).map((m) => `${m}月`).join(", ");

type Props = {
  stockCode: string;
};

const formatConfirmedDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
};

export default function BenefitInfoSection({ stockCode }: Props) {
  const [benefit, setBenefit] = useState<StockBenefit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StockBenefit>(createEmptyBenefit(stockCode));
  const [registered, setRegistered] = useState(false);
  const [showRegisterNotice, setShowRegisterNotice] = useState(false);

  useEffect(() => {
    const loaded = loadBenefitForStock(stockCode);
    setBenefit(loaded);
    setDraft(loaded ?? createEmptyBenefit(stockCode));
    setRegistered(isUserRegistered(loadProfile()));
  }, [stockCode]);

  const startEdit = () => {
    if (!registered) {
      setShowRegisterNotice(true);
      return;
    }
    setShowRegisterNotice(false);
    setDraft(benefit ?? createEmptyBenefit(stockCode));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(benefit ?? createEmptyBenefit(stockCode));
    setIsEditing(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isUserRegistered(loadProfile())) {
      setShowRegisterNotice(true);
      setIsEditing(false);
      return;
    }
    const cleanTiers = (draft.tieredBenefits ?? [])
      .map((t) => {
        const years = Number(t.minYears ?? 0);
        return {
          minShares: Number.isFinite(t.minShares) ? Number(t.minShares) : 0,
          minYears: Number.isFinite(years) && years > 0 ? years : undefined,
          content: (t.content ?? "").trim(),
        };
      })
      .filter((t) => t.minShares > 0 && t.content !== "")
      .sort((a, b) => {
        if (a.minShares !== b.minShares) return a.minShares - b.minShares;
        return (a.minYears ?? 0) - (b.minYears ?? 0);
      });

    const next: StockBenefit = {
      ...draft,
      stockCode,
      content: draft.content.trim(),
      rightsMonths: draft.rightsMonths.trim(),
      minShares: Number.isFinite(draft.minShares) ? Number(draft.minShares) : 0,
      longTermNote: draft.longTermNote?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      irUrl: draft.irUrl?.trim() || undefined,
      confidence: draft.confidence ?? "uncertain",
      lastConfirmedAt: draft.lastConfirmedAt || undefined,
      expectedArrival: draft.expectedArrival?.trim() || undefined,
      noticeArrival: draft.noticeArrival?.trim() || undefined,
      actualArrival: draft.actualArrival?.trim() || undefined,
      tieredBenefits: cleanTiers.length > 0 ? cleanTiers : undefined,
      badgeKeys:
        draft.badgeKeys && draft.badgeKeys.length > 0
          ? [...new Set(draft.badgeKeys)]
          : undefined,
    };
    saveBenefitForStock(next);
    setBenefit(next);
    setIsEditing(false);
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">優待情報</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={startEdit}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              registered
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
            title={
              registered
                ? "優待情報を編集する"
                : "優待情報の編集には会員登録が必要です"
            }
          >
            {registered
              ? benefit
                ? "編集する"
                : "情報を追加"
              : "🔒 編集（会員のみ）"}
          </button>
        )}
      </div>

      {showRegisterNotice && !registered && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-semibold text-blue-900">
            優待情報の編集には会員登録が必要です
          </p>
          <p className="mt-1 text-blue-800">
            悪質な編集を防ぐため、優待情報の編集は会員登録したユーザーのみが行えます。
            投稿（「届いた！」「使った！」）はゲストのまま自由に行えます。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/mypage"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              マイページで会員登録する →
            </Link>
            <button
              type="button"
              onClick={() => setShowRegisterNotice(false)}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-blue-800 hover:bg-blue-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="mt-4 space-y-3 text-sm">
          {benefit ? (
            <>
              {/* カテゴリーバッジ（主） */}
              {(() => {
                const cats = detectCategories(benefit);
                if (cats.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cats.map((cat) => (
                      <span
                        key={cat.key}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cat.colorClass}`}
                        title={`カテゴリー: ${cat.label}`}
                      >
                        <span aria-hidden>{cat.emoji}</span>
                        {cat.label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* 信頼性メタ情報バー（極コンパクト） */}
              {(() => {
                const conf: BenefitConfidence = getEffectiveConfidence(benefit);
                const meta = CONFIDENCE_META[conf];
                const confirmedText = formatConfirmedDate(benefit.lastConfirmedAt);
                return (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-medium ${meta.bgColor} ${meta.color}`}
                      title={`情報の確度: ${meta.label}（${meta.description}）`}
                    >
                      {meta.label}
                    </span>
                    {confirmedText && (
                      <span className="text-slate-400">
                        最終確認 {confirmedText}
                      </span>
                    )}
                    {benefit.irUrl && (
                      <a
                        href={benefit.irUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-blue-600 hover:underline"
                      >
                        公式IR ↗
                      </a>
                    )}
                  </div>
                );
              })()}

              <BenefitRow label="優待内容" value={benefit.content || "未登録"} />
              <BenefitRow label="権利確定月" value={benefit.rightsMonths || "未登録"} />
              {/* 株数階段がある場合は専用テーブルで表示し、行は省略（重複回避） */}
              {benefit.tieredBenefits && benefit.tieredBenefits.length > 0 ? (
                <TieredBenefitsTable tiers={benefit.tieredBenefits} />
              ) : (
                <BenefitRow
                  label="必要株数"
                  value={
                    benefit.minShares
                      ? `${benefit.minShares.toLocaleString("ja-JP")}株〜`
                      : "未登録"
                  }
                />
              )}
              {benefit.longTermNote && (
                <BenefitRow label="長期保有特典" value={benefit.longTermNote} />
              )}
              {benefit.notes && <BenefitRow label="備考" value={benefit.notes} />}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Link
                  href={`/contact?type=benefit&code=${stockCode}`}
                  className="text-[11px] text-slate-400 hover:text-rose-600 hover:underline"
                  title="この優待情報の誤りを通報する"
                >
                  ⚠ 情報を通報
                </Link>
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
              優待情報がまだ登録されていません。「情報を追加」から登録できます。
            </p>
          )}
        </div>
      )}

      {isEditing && (
        <form className="mt-4 space-y-3 text-sm" onSubmit={handleSubmit}>
          <Field label="優待内容">
            <textarea
              className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="例: QUOカード500円分"
            />
          </Field>
          <Field label="権利確定月（1〜12月から選択／複数可）">
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MONTH_OPTIONS.map((m) => {
                const selected = parseRightsMonthsToArray(draft.rightsMonths).includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const cur = parseRightsMonthsToArray(draft.rightsMonths);
                      const next = selected
                        ? cur.filter((x) => x !== m)
                        : [...cur, m];
                      setDraft({ ...draft, rightsMonths: monthsArrayToString(next) });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selected
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {m}月
                  </button>
                );
              })}
            </div>
            {draft.rightsMonths && (
              <p className="mt-1 text-[11px] text-slate-500">
                選択中: {draft.rightsMonths}
              </p>
            )}
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-800">カテゴリバッジ（任意・複数可）</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              グルメ・食事券・買物・割引など、一覧で使っているバッジを手で付けられます。本文にキーワードがある場合は自動でも付き、ここで選んだものと<strong className="text-slate-700">併せて表示</strong>されます。
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BENEFIT_CATEGORIES.map((cat) => {
                const selected = (draft.badgeKeys ?? []).includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      const cur = draft.badgeKeys ?? [];
                      const has = cur.includes(cat.key);
                      const nextKeys = has
                        ? cur.filter((k) => k !== cat.key)
                        : [...cur, cat.key];
                      setDraft({
                        ...draft,
                        badgeKeys: nextKeys.length > 0 ? nextKeys : undefined,
                      });
                    }}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      selected
                        ? `${cat.colorClass} border-slate-400 ring-2 ring-blue-400/50 ring-offset-1`
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    aria-pressed={selected}
                  >
                    <span aria-hidden>{cat.emoji}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="必要株数（最低保有株数）">
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={draft.minShares}
                onChange={(e) => setDraft({ ...draft, minShares: Number(e.target.value) })}
              />
            </Field>
            <Field label="長期保有特典の概要（任意）">
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={draft.longTermNote ?? ""}
                onChange={(e) => setDraft({ ...draft, longTermNote: e.target.value })}
                placeholder="例: 3年以上保有で増額（詳細は下の表で入力）"
              />
            </Field>
          </div>

          {/* 株数 × 保有年数の階段エディタ */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                保有株数 × 保有年数 別の優待内容（任意）
              </p>
              <button
                type="button"
                onClick={() => {
                  const tiers = draft.tieredBenefits ?? [];
                  const lastMin = tiers.length
                    ? tiers[tiers.length - 1].minShares
                    : draft.minShares || 100;
                  setDraft({
                    ...draft,
                    tieredBenefits: [
                      ...tiers,
                      {
                        minShares: tiers.length === 0 ? lastMin || 100 : lastMin * 10 || 1000,
                        minYears: 0,
                        content: "",
                      },
                    ],
                  });
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                + 段階を追加
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              例1（株数別）：100株→食事券3枚 / 1000株→12枚
              <br />
              例2（株数×年数）：100株→3枚 / 100株3年以上→6枚 / 1000株→12枚 / 1000株3年以上→18枚
              <br />
              未使用なら空欄のままでOK。
            </p>
            {(draft.tieredBenefits ?? []).length > 0 && (
              <div className="mt-2 space-y-2">
                {(draft.tieredBenefits ?? []).map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                  >
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={tier.minShares}
                        onChange={(e) => {
                          const next = [...(draft.tieredBenefits ?? [])];
                          next[idx] = {
                            ...next[idx],
                            minShares: Number(e.target.value),
                          };
                          setDraft({ ...draft, tieredBenefits: next });
                        }}
                      />
                      <span className="text-xs text-slate-600">株〜</span>
                    </div>
                    <select
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={tier.minYears ?? 0}
                      onChange={(e) => {
                        const next = [...(draft.tieredBenefits ?? [])];
                        next[idx] = {
                          ...next[idx],
                          minYears: Number(e.target.value),
                        };
                        setDraft({ ...draft, tieredBenefits: next });
                      }}
                      title="保有年数条件"
                    >
                      <option value={0}>年数条件なし</option>
                      <option value={1}>1年以上保有</option>
                      <option value={2}>2年以上保有</option>
                      <option value={3}>3年以上保有</option>
                      <option value={5}>5年以上保有</option>
                      <option value={7}>7年以上保有</option>
                      <option value={10}>10年以上保有</option>
                    </select>
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      placeholder="例: 食事券3枚（3,000円相当）"
                      value={tier.content}
                      onChange={(e) => {
                        const next = [...(draft.tieredBenefits ?? [])];
                        next[idx] = { ...next[idx], content: e.target.value };
                        setDraft({ ...draft, tieredBenefits: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.tieredBenefits ?? []).filter(
                          (_, i) => i !== idx
                        );
                        setDraft({
                          ...draft,
                          tieredBenefits: next.length > 0 ? next : undefined,
                        });
                      }}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                      aria-label="この段階を削除"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="備考（任意）">
            <textarea
              className="mt-1 h-16 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>

          <Field label="公式IRページのURL（任意・推奨）">
            <input
              type="url"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.irUrl ?? ""}
              onChange={(e) => setDraft({ ...draft, irUrl: e.target.value })}
              placeholder="https://www.example-ir.jp/yutai/"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="情報の確度">
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={draft.confidence ?? "uncertain"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    confidence: e.target.value as BenefitConfidence,
                  })
                }
              >
                <option value="verified">✓ 検証済み（公式IRで確認）</option>
                <option value="stable">● 安定運用（長年継続）</option>
                <option value="uncertain">⚠ 要確認（情報が古い可能性）</option>
                <option value="abolished">✕ 廃止済み</option>
              </select>
            </Field>
            <Field label="最終確認日">
              <div className="mt-1 space-y-2">
                <DateYyyymmddField
                  valueIso={draft.lastConfirmedAt ?? ""}
                  onChangeIso={(iso) =>
                    setDraft({ ...draft, lastConfirmedAt: iso || undefined })
                  }
                  fallbackIso={getTodayIsoDate()}
                  optional
                  label=""
                  inputClassName="border-0 bg-transparent p-0 shadow-none"
                />
                {draft.lastConfirmedAt ? (
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
                    onClick={() => setDraft({ ...draft, lastConfirmedAt: undefined })}
                  >
                    日付をクリア
                  </button>
                ) : null}
              </div>
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              保存する
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              キャンセル
            </button>
          </div>
          <p className="pt-2 text-[11px] text-slate-400">
            ※ 編集内容は他のユーザーからも参照されます。各社IRの最新情報をもとに、正確な情報の登録にご協力ください。
          </p>
        </form>
      )}
    </section>
  );
}

function BenefitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-slate-100 pb-2 last:border-b-0">
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-900">{value}</p>
    </div>
  );
}

function TieredBenefitsTable({ tiers }: { tiers: TieredBenefit[] }) {
  const sorted = [...tiers].sort((a, b) => {
    if (a.minShares !== b.minShares) return a.minShares - b.minShares;
    return (a.minYears ?? 0) - (b.minYears ?? 0);
  });
  const hasYearAxis = sorted.some((t) => (t.minYears ?? 0) > 0);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-blue-900">
        🪜 {hasYearAxis ? "保有株数 × 保有年数別の優待内容" : "保有株数別の優待内容"}
      </p>
      <div className="overflow-hidden rounded-md border border-blue-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-blue-100/60 text-xs text-blue-900">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold">保有株数</th>
              {hasYearAxis && (
                <th className="px-3 py-1.5 text-left font-semibold">保有年数</th>
              )}
              <th className="px-3 py-1.5 text-left font-semibold">内容</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => {
              const yrs = t.minYears ?? 0;
              return (
                <tr
                  key={`${t.minShares}-${yrs}-${i}`}
                  className="border-t border-blue-100 even:bg-blue-50/30"
                >
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-700">
                    {t.minShares.toLocaleString("ja-JP")}株〜
                  </td>
                  {hasYearAxis && (
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                      {yrs > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                          ⏳ {yrs}年以上
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-slate-900">{t.content}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
