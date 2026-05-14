import type { BenefitReport } from "@/app/data/benefitReports";
import { getEffectivePhase } from "@/app/data/benefitReports";

/**
 * 1つの「届くサイクル」の予測情報。
 * 年に1回だけ届く優待なら 1 つ、年2回（半期ごと）なら 2 つできる。
 */
export type ArrivalCycleForecast = {
  monthIndex: number;
  count: number;
  avgDayInMonth: number;
  nextEstimate: Date;
  daysUntil: number;
};

export type ArrivalForecast = {
  /** 最も近い到着サイクル（cycles[0] と同じ）。後方互換のため top-level に残す。 */
  nextEstimate: Date;
  daysUntil: number;
  /** 主サイクル（最頻月）の情報。後方互換用。 */
  peakMonthIndex: number;
  peakMonthCount: number;
  avgDayInPeakMonth: number;
  /** 検出された全ての到着サイクル。「直近→次→…」の順に並ぶ。 */
  cycles: ArrivalCycleForecast[];
  earliest: Date;
  latest: Date;
  totalReports: number;
  monthCounts: number[];
};

const daysBetween = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000);

/**
 * 月ごとの投稿数から「届くサイクル」を抽出する。
 *
 * - 隣接月（n月とn+1月）は同じサイクルとして1つに統合する
 *   （例: 5月20日 と 6月3日 はどちらも「5月下旬発送」由来とみなす）
 * - peakCount * 0.4 以上、かつ最低2件あるサイクルだけ採用
 * - 単一の山の場合は単一サイクル
 */
const detectCycles = (
  dates: Date[],
  monthCounts: number[]
): { monthIndex: number; count: number; avgDay: number }[] => {
  const peakCount = Math.max(...monthCounts);
  if (peakCount === 0) return [];

  // 連続月をクラスタにまとめる（12月→1月もつなぐ）
  const presentMonths: number[] = [];
  for (let m = 0; m < 12; m += 1) {
    if (monthCounts[m] > 0) presentMonths.push(m);
  }

  if (presentMonths.length === 0) return [];

  // モジュロ12でクラスタ化（隣接月を1グループ）
  type Cluster = { months: number[]; count: number };
  const clusters: Cluster[] = [];
  let current: Cluster = { months: [presentMonths[0]], count: monthCounts[presentMonths[0]] };
  for (let i = 1; i < presentMonths.length; i += 1) {
    const prev = presentMonths[i - 1];
    const cur = presentMonths[i];
    if (cur === prev + 1) {
      current.months.push(cur);
      current.count += monthCounts[cur];
    } else {
      clusters.push(current);
      current = { months: [cur], count: monthCounts[cur] };
    }
  }
  clusters.push(current);

  // 12月と1月が両方ある場合、最後と最初をマージ
  if (
    clusters.length >= 2 &&
    clusters[clusters.length - 1].months.includes(11) &&
    clusters[0].months.includes(0)
  ) {
    const last = clusters.pop()!;
    clusters[0].months = [...last.months, ...clusters[0].months];
    clusters[0].count += last.count;
  }

  const threshold = Math.max(2, peakCount * 0.4);

  return clusters
    .filter((c) => c.count >= threshold)
    .map((c) => {
      const clusterDates = dates.filter((d) => c.months.includes(d.getMonth()));
      const repMonth = c.months.reduce(
        (best, m) => (monthCounts[m] > monthCounts[best] ? m : best),
        c.months[0]
      );
      const monthDates = clusterDates.filter((d) => d.getMonth() === repMonth);
      const avgDay = Math.round(
        monthDates.reduce((s, d) => s + d.getDate(), 0) / monthDates.length
      );
      return { monthIndex: repMonth, count: c.count, avgDay };
    });
};

export const computeArrivalForecast = (
  reports: BenefitReport[]
): ArrivalForecast | null => {
  const forecastReports = reports.filter(
    (r) => getEffectivePhase(r) !== "pending"
  );
  if (forecastReports.length === 0) {
    return null;
  }

  const dates = forecastReports
    .map((r) => new Date(r.arrivalDate))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return null;
  }

  const monthCounts = Array.from({ length: 12 }, () => 0);
  for (const d of dates) {
    monthCounts[d.getMonth()] += 1;
  }
  const peakMonthIndex = monthCounts.indexOf(Math.max(...monthCounts));

  const peakMonthDates = dates.filter((d) => d.getMonth() === peakMonthIndex);
  const avgDayInPeakMonth = Math.round(
    peakMonthDates.reduce((sum, d) => sum + d.getDate(), 0) / peakMonthDates.length
  );

  const today = new Date();

  const detectedCycles = detectCycles(dates, monthCounts);

  // 何もクラスタが検出されないケース（投稿が少なすぎる）は、最頻月だけを単一サイクルとして登録
  const baseCycles = detectedCycles.length > 0
    ? detectedCycles
    : [{ monthIndex: peakMonthIndex, count: monthCounts[peakMonthIndex], avgDay: avgDayInPeakMonth }];

  const cycles: ArrivalCycleForecast[] = baseCycles
    .map((c) => {
      let nextEst = new Date(today.getFullYear(), c.monthIndex, c.avgDay);
      if (nextEst.getTime() < today.getTime()) {
        nextEst = new Date(today.getFullYear() + 1, c.monthIndex, c.avgDay);
      }
      return {
        monthIndex: c.monthIndex,
        count: c.count,
        avgDayInMonth: c.avgDay,
        nextEstimate: nextEst,
        daysUntil: Math.max(0, daysBetween(today, nextEst)),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const primary = cycles[0];

  return {
    nextEstimate: primary.nextEstimate,
    daysUntil: primary.daysUntil,
    peakMonthIndex,
    peakMonthCount: monthCounts[peakMonthIndex],
    avgDayInPeakMonth,
    cycles,
    earliest: dates[0],
    latest: dates[dates.length - 1],
    totalReports: forecastReports.length,
    monthCounts,
  };
};

export const formatMonthDay = (date: Date) =>
  `${date.getMonth() + 1}月${date.getDate()}日`;

/**
 * 権利月文字列から「発送時期の一般的な目安」を文字列で返す。
 *
 * 日本の上場企業の優待発送は、概ね「権利確定月 +3ヶ月」の下旬が一般的。
 * これは株主総会（権利確定月の3ヶ月後に開催）と同じタイミングで発送する
 * 企業が圧倒的に多いため。
 *
 * 例:
 *   - "3月" → "6月下旬"
 *   - "3月, 9月" → "6月下旬 / 12月下旬"
 *   - "2月, 8月" → "5月下旬 / 11月下旬"
 *
 * 「-」や空文字、解釈不能な場合は null を返す（廃止済み等）。
 */
export const inferExpectedArrival = (rightsMonths: string | undefined): string | null => {
  if (!rightsMonths) return null;
  const trimmed = rightsMonths.trim();
  if (!trimmed || trimmed === "-") return null;

  const monthPattern = /(\d{1,2})\s*月/g;
  const months: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = monthPattern.exec(trimmed)) !== null) {
    const m = parseInt(match[1], 10);
    if (m >= 1 && m <= 12 && !months.includes(m)) {
      months.push(m);
    }
  }
  if (months.length === 0) return null;

  const labels = months.map((m) => {
    const arrivalMonth = ((m - 1 + 3) % 12) + 1;
    return `${arrivalMonth}月下旬`;
  });

  return labels.join(" / ");
};
