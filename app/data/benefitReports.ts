/**
 * 投稿の段階を表す。優待には「案内・申込書だけが先に届くフェーズ」と
 * 「実際の優待品が届くフェーズ」の2段階に分かれているものが多いため、
 * それぞれを区別して投稿・集計できるようにする。
 *
 *  - "notice": カタログ・申込書・案内状などが届いた段階の投稿
 *  - "actual": 実際の優待品（商品・チケット・QUOカード等）が届いた段階の投稿
 *  - "pending": まだ優待品・案内とも届いていない（同じ状況の人の参考用。到着予測の集計からは除外）
 *  - 未指定（undefined）: 区別がない旧データ。表示上は "actual" 扱い。
 */
export type ReportPhase = "notice" | "actual" | "pending";

export type BenefitReport = {
  id: string;
  stockCode: string;
  arrivalDate: string;
  reporterName: string;
  region?: string;
  comment: string;
  createdAt: string;
  /**
   * 添付画像のURL（Supabase Storage の公開URLか、オフライン時の data URL）。
   * 優待券・優待品の写真などをイメージしている。
   */
  imageUrl?: string;
  /**
   * 「いいね」を押した人数（denormalized）。
   * 実際のカウントは Supabase の likes テーブルに記録する。
   */
  helpfulCount?: number;
  /**
   * 「案内・申込書」段階か、「優待品」段階か、「まだ届いていない」か。
   * 未指定の旧データは "actual"（優待品が届いた）として扱う。
   */
  phase?: ReportPhase;
};

export const PHASE_META: Record<
  ReportPhase,
  { label: string; shortLabel: string; emoji: string; colorClass: string }
> = {
  notice: {
    label: "案内・申込書",
    shortLabel: "案内",
    emoji: "✉️",
    colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  actual: {
    label: "優待品",
    shortLabel: "優待品",
    emoji: "🎁",
    colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  pending: {
    label: "まだ届いていない",
    shortLabel: "未着",
    emoji: "⏳",
    colorClass: "bg-amber-100 text-amber-900 border-amber-200",
  },
};

const isReportPhase = (value: unknown): value is ReportPhase =>
  value === "notice" || value === "actual" || value === "pending";

/**
 * 未指定の旧データは "actual" として扱う。
 * localStorage 等に不正な phase 文字列が混入しても落ちないよう正規化する。
 */
export const getEffectivePhase = (report: BenefitReport): ReportPhase => {
  if (isReportPhase(report.phase)) return report.phase;
  return "actual";
};

export const seedBenefitReports: BenefitReport[] = [
  {
    id: "r1",
    stockCode: "7203",
    arrivalDate: "2026-04-18",
    reporterName: "東京都 / 30代",
    comment: "トヨタの優待案内が届きました。",
    createdAt: "2026-04-18T10:00:00+09:00",
    phase: "notice",
  },
  {
    id: "r2",
    stockCode: "8267",
    arrivalDate: "2026-05-02",
    reporterName: "大阪府 / 40代",
    comment: "イオン優待カードが到着しました。",
    createdAt: "2026-05-02T15:30:00+09:00",
    phase: "actual",
  },
  {
    id: "r3",
    stockCode: "9202",
    arrivalDate: "2026-05-07",
    reporterName: "福岡県 / 20代",
    comment: "ANAの株主優待券が到着。",
    createdAt: "2026-05-07T19:20:00+09:00",
    phase: "actual",
  },
];
