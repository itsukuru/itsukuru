"use client";

import { useMemo } from "react";
import {
  getEffectivePhase,
  PHASE_META,
  type BenefitReport,
} from "@/app/data/benefitReports";
import type { StockBenefit } from "@/app/data/stockBenefits";
import {
  computeArrivalForecast,
  formatMonthDay,
  inferExpectedArrival,
  type ArrivalForecast,
} from "@/app/lib/forecastClient";

type Props = {
  reports: BenefitReport[];
  benefit?: StockBenefit | null;
};

export default function ArrivalForecastSection({ reports, benefit }: Props) {
  const { phaseData, pendingCount } = useMemo(() => {
    const pending = reports.filter((r) => getEffectivePhase(r) === "pending");
    const notice = reports.filter((r) => getEffectivePhase(r) === "notice");
    const actual = reports.filter((r) => getEffectivePhase(r) === "actual");
    return {
      pendingCount: pending.length,
      phaseData: {
        notice: {
          forecast:
            notice.length > 0 ? computeArrivalForecast(notice, { benefit }) : null,
          count: notice.length,
        },
        actual: {
          forecast:
            actual.length > 0 ? computeArrivalForecast(actual, { benefit }) : null,
          count: actual.length,
        },
      },
    };
  }, [reports, benefit]);

  const explicitExpected = benefit?.expectedArrival?.trim() ?? "";
  const noticeArrivalText = benefit?.noticeArrival?.trim() ?? "";
  // actualArrival が未設定なら、legacy フィールド expectedArrival を「企業案内（優待品到着）」として流用。
  // 多くの銘柄が expectedArrival に「6月下旬発送」のような実発送日を入れているため、
  // これをメイン優待品カードの企業公式案内として扱うのが自然。
  const actualArrivalText =
    benefit?.actualArrival?.trim() || explicitExpected || "";
  const rightsMonths = benefit?.rightsMonths ?? "";

  const isAbolished =
    benefit?.confidence === "abolished" ||
    (benefit?.minShares === 0 && rightsMonths === "-");

  const inferred = useMemo(
    () => (isAbolished ? null : inferExpectedArrival(rightsMonths)),
    [isAbolished, rightsMonths]
  );

  const totalCount =
    phaseData.notice.count + phaseData.actual.count + pendingCount;
  const hasAnyData = totalCount > 0;

  if (isAbolished) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm">
        ✕ この銘柄は現在、株主優待を実施していません。
      </section>
    );
  }

  if (
    !hasAnyData &&
    !inferred &&
    !noticeArrivalText &&
    !actualArrivalText
  ) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        💡 投稿が0件のため到着時期を推定できません。下のフォームから最初の「届いた！」を投稿してみましょう。
      </section>
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* 上: 案内・申込（補助） / 下: 優待品到着（メイン・大号表示） */}
      <div className="flex flex-col gap-2">
        <SubNoticeCard
          forecast={phaseData.notice.forecast}
          count={phaseData.notice.count}
          companyText={noticeArrivalText}
        />
        <MainActualCard
          forecast={phaseData.actual.forecast}
          count={phaseData.actual.count}
          companyText={actualArrivalText}
          inferred={inferred}
        />
      </div>
    </section>
  );
}

/**
 * メインの優待品カード（縦レイアウトでは下段・大号の本文）。
 *
 * 表示の優先順位:
 *   1. 企業案内（actualArrival）があれば「いつ頃」をメイン表示
 *   2. 投稿予測があれば日付を併記（投稿件数つき）
 *   3. それもなければ「権利月＋3ヶ月の一般目安」
 */
function MainActualCard({
  forecast,
  count,
  companyText,
  inferred,
}: {
  forecast: ArrivalForecast | null;
  count: number;
  companyText: string;
  inferred: string | null;
}) {
  const meta = PHASE_META.actual;
  const hasForecast = forecast !== null && count > 0;
  const hasCompanyInfo = !!companyText;

  // 主要日付・補足ラベル・サブテキストの3要素に正規化
  let mainText: string;
  let sourceLabel: string;
  let subText: string | null = null;

  if (hasCompanyInfo) {
    mainText = companyText;
    sourceLabel = "🏢 企業公式";
    subText =
      hasForecast && forecast
        ? `投稿からの集計: ${formatMonthDay(forecast.nextEstimate)}頃（到着投稿${forecast.rawReportCount}件中${forecast.totalReports}件を使用${forecast.excludedReportCount > 0 ? `・外れ値除外${forecast.excludedReportCount}件` : ""}）`
        : null;
  } else if (hasForecast && forecast) {
    mainText = `${formatMonthDay(forecast.nextEstimate)}頃`;
    sourceLabel = `📊 投稿からの集計 ${forecast.rawReportCount}件`;
    subText = `あと${forecast.daysUntil}日（統計に${forecast.totalReports}件を使用${forecast.excludedReportCount > 0 ? `・除外${forecast.excludedReportCount}件` : ""}）`;
    if (forecast.cycles.length > 1) {
      subText += ` ・ 次々回 ${formatMonthDay(forecast.cycles[1].nextEstimate)}頃`;
    }
  } else if (inferred) {
    mainText = inferred;
    sourceLabel = "🗓️ 一般的な目安";
    subText = null;
  } else {
    mainText = "投稿待ち";
    sourceLabel = "";
    subText = null;
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${meta.colorClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <span className="text-xl" aria-hidden>
            {meta.emoji}
          </span>
          {meta.label}が届く
        </p>
        {sourceLabel && (
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
            {sourceLabel}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
        {mainText}
      </p>
      {subText && <p className="mt-1 text-xs opacity-80">{subText}</p>}
    </div>
  );
}

/**
 * 案内・申込カード（縦レイアウトでは上段・コンパクト）。
 */
function SubNoticeCard({
  forecast,
  count,
  companyText,
}: {
  forecast: ArrivalForecast | null;
  count: number;
  companyText: string;
}) {
  const meta = PHASE_META.notice;
  const hasForecast = forecast !== null && count > 0;
  const hasCompanyInfo = !!companyText;
  const isActive = hasForecast || hasCompanyInfo;

  return (
    <div
      className={`flex flex-col rounded-xl border p-3 sm:p-3.5 ${
        isActive
          ? meta.colorClass
          : "border-dashed border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <div className="flex items-center gap-1">
        <span className="text-lg" aria-hidden>
          {meta.emoji}
        </span>
        <p className="text-[10px] font-semibold opacity-80">
          {meta.label}が届く
        </p>
      </div>

      {hasCompanyInfo ? (
        <div className="mt-1.5">
          <p className="text-base font-bold leading-tight">{companyText}</p>
          <p className="text-[9px] opacity-70">🏢 企業案内</p>
          {hasForecast && forecast && (
            <p className="mt-1 text-[10px] opacity-75">
              投稿: {formatMonthDay(forecast.nextEstimate)}頃（{forecast.rawReportCount}件中
              {forecast.totalReports}件で集計
              {forecast.excludedReportCount > 0
                ? `・除外${forecast.excludedReportCount}件`
                : ""}
              ）
            </p>
          )}
        </div>
      ) : hasForecast && forecast ? (
        <div className="mt-1.5">
          <p className="text-base font-bold leading-tight">
            {formatMonthDay(forecast.nextEstimate)}頃
          </p>
          <p className="text-[10px] opacity-75">
            あと{forecast.daysUntil}日（{forecast.rawReportCount}件中{forecast.totalReports}件で集計
            {forecast.excludedReportCount > 0 ? `・除外${forecast.excludedReportCount}件` : ""}）
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-xs italic opacity-75">投稿待ち</p>
      )}
    </div>
  );
}
