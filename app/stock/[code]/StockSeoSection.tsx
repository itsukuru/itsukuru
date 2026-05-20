import Link from "next/link";
import type { StockRecord } from "@/app/lib/stocksClient";
import { getResolvedMasterStocks } from "@/app/lib/stocksClient";
import type { StockBenefit } from "@/app/data/stockBenefits";
import { seedStockBenefits } from "@/app/data/stockBenefits";
import { getEffectivePhase, seedBenefitReports } from "@/app/data/benefitReports";
import { detectCategories } from "@/app/lib/benefitCategories";

const RESOLVED_MASTER: StockRecord[] = getResolvedMasterStocks();

/**
 * 個別銘柄ページ下部: 見出しと関連銘柄リンクのみ（本文の長文は出さない）。
 * 構造化データ・meta は page.tsx 側で担保する。
 */
type Props = {
  stock: StockRecord;
  benefit: StockBenefit | null;
};

const monthSuffixToParts = (rightsMonths?: string): number[] => {
  if (!rightsMonths) return [];
  const out: number[] = [];
  const re = /(\d{1,2})\s*月/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rightsMonths)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 12 && !out.includes(n)) out.push(n);
  }
  return out;
};

const monthsToText = (months: number[]): string =>
  months.map((m) => `${m}月`).join("・");

const formatShares = (shares?: number): string | null => {
  if (!shares || shares <= 0) return null;
  return `${shares.toLocaleString("ja-JP")}株`;
};

const arrivalText = (benefit: StockBenefit | null): string => {
  if (!benefit) return "みんなの投稿が集まると、実際の到着時期を確認できます。";
  if (benefit.confidence === "abolished" || benefit.minShares === 0 || benefit.rightsMonths === "-") {
    return "現在は株主優待を実施していないため、到着予測の対象外です。";
  }
  if (benefit.actualArrival) return `実際の到着目安は「${benefit.actualArrival}」です。`;
  if (benefit.expectedArrival) return `発送・到着の目安は「${benefit.expectedArrival}」です。`;
  if (benefit.noticeArrival) return `案内・申込書の到着目安は「${benefit.noticeArrival}」です。`;
  if (benefit.rightsMonths) {
    return `一般的には権利確定月（${benefit.rightsMonths}）から約2〜3ヶ月後が到着の目安です。`;
  }
  return "公式の発送時期が未登録のため、みんなの「届いた！」投稿から目安を確認できます。";
};

const addMonths = (month: number, delta: number): number => ((month + delta - 1) % 12) + 1;

const arrivalFlowText = (months: number[], benefit: StockBenefit | null): string => {
  if (!benefit || benefit.confidence === "abolished" || benefit.minShares === 0) {
    return "現在は優待到着までの流れを案内できる実施中データがありません。";
  }
  if (months.length === 0) {
    return "権利確定月が未登録のため、公式IRや招集通知、みんなの投稿で発送時期を確認してください。";
  }
  const rights = monthsToText(months);
  const roughArrival = months
    .flatMap((m) => [addMonths(m, 2), addMonths(m, 3)])
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .sort((a, b) => a - b);
  return `${rights}に権利が確定した後、一般的には${monthsToText(roughArrival)}頃に案内や優待品が届くケースが多いです。実際の到着日は銘柄や発送順、地域によって前後するため、投稿された到着日もあわせて確認してください。`;
};

const usageIdeaText = (categoryKey?: string): string => {
  switch (categoryKey) {
    case "food":
      return "食事券やグルメ系の優待は、対象店舗、有効期限、ランチ・ディナーでの使いやすさを確認しておくと使い忘れを防げます。";
    case "quo":
    case "voucher":
      return "QUOカードや商品券は日常の買物で使いやすい一方、利用できる店舗や残高管理を早めに確認しておくと安心です。";
    case "catalog":
      return "カタログギフトは申込期限が設定されていることが多いため、案内が届いたら候補商品と締切を早めに確認しましょう。";
    case "points":
      return "ポイント優待は付与時期、利用期限、ID連携の有無を確認しておくと、受け取り漏れや失効を避けやすくなります。";
    case "travel":
      return "旅行・宿泊・交通系の優待は予約条件や除外日が重要です。繁忙期に使う場合は早めに利用条件を確認しましょう。";
    case "themepark":
    case "leisure":
      return "レジャー系の優待は利用可能日、同伴者条件、事前予約の有無を確認しておくと予定を立てやすくなります。";
    case "cosmetics":
    case "product":
      return "自社製品や日用品の優待は、到着後に内容物や賞味期限・使用期限を確認し、家族で分けるなど使い道を決めておくと便利です。";
    case "discount":
      return "割引券や優待カードは、対象店舗、オンライン利用の可否、他クーポンとの併用条件を確認してから使うのがおすすめです。";
    default:
      return "優待が届いたら、有効期限、利用条件、対象店舗や申込期限を確認し、使い忘れないように予定を立てましょう。";
  }
};

const missingArrivalText = (stock: StockRecord, benefit: StockBenefit | null): string => {
  if (!benefit || benefit.confidence === "abolished" || benefit.minShares === 0) {
    return `${stock.name}の優待情報が未登録または実施なしの場合は、まず公式IRの株主還元・株主優待ページを確認してください。`;
  }
  const rights = benefit.rightsMonths && benefit.rightsMonths !== "-"
    ? `権利確定月（${benefit.rightsMonths}）`
    : "権利確定月";
  const shares = formatShares(benefit.minShares);
  return `${stock.name}の優待が届かないと感じたら、${rights}に株主名簿へ載っていたか、${shares ? `${shares}以上の保有条件を満たしていたか、` : ""}証券会社の登録住所が最新かを確認しましょう。発送予定時期を過ぎても届かない場合は、公式IRや株主窓口への確認が有効です。`;
};

type BenefitWithMonths = { stockCode: string; months: number[]; benefit: StockBenefit };

const benefitsWithMonthsCache: BenefitWithMonths[] = (() => {
  const out: BenefitWithMonths[] = [];
  for (const b of seedStockBenefits) {
    if (b.confidence === "abolished") continue;
    const months = monthSuffixToParts(b.rightsMonths);
    if (months.length === 0) continue;
    out.push({ stockCode: b.stockCode, months, benefit: b });
  }
  return out;
})();

const masterStockByCode: Map<string, StockRecord> = new Map(
  RESOLVED_MASTER.map((s) => [s.code, s])
);

const stocksByIndustry: Map<string, StockRecord[]> = (() => {
  const out = new Map<string, StockRecord[]>();
  for (const s of RESOLVED_MASTER) {
    const list = out.get(s.industry) ?? [];
    list.push(s);
    out.set(s.industry, list);
  }
  return out;
})();

export default function StockSeoSection({ stock, benefit }: Props) {
  const isAbolished = benefit?.confidence === "abolished";
  const rightsMonthsList = monthSuffixToParts(benefit?.rightsMonths);
  const categoryList = detectCategories(benefit);
  const minSharesText = formatShares(benefit?.minShares);
  const rightsMonthsText = benefit?.rightsMonths && benefit.rightsMonths !== "-"
    ? benefit.rightsMonths
    : null;
  const primaryCategory = categoryList[0];
  const usageIdea = usageIdeaText(primaryCategory?.key);
  const flowText = arrivalFlowText(rightsMonthsList, benefit);
  const missingText = missingArrivalText(stock, benefit);
  const arrivalReports = seedBenefitReports.filter((report) => report.stockCode === stock.code);
  const actualArrivalReports = arrivalReports.filter(
    (report) => getEffectivePhase(report) === "actual"
  );
  const noticeReports = arrivalReports.filter((report) => getEffectivePhase(report) === "notice");
  const latestArrivalReport = [...arrivalReports].sort((a, b) =>
    b.arrivalDate.localeCompare(a.arrivalDate)
  )[0];

  const relatedSameMonth: { code: string; name: string }[] = [];
  if (rightsMonthsList.length > 0) {
    const monthSet = new Set(rightsMonthsList);
    for (const bw of benefitsWithMonthsCache) {
      if (bw.stockCode === stock.code) continue;
      if (!bw.months.some((m) => monthSet.has(m))) continue;
      const s = masterStockByCode.get(bw.stockCode);
      if (!s) continue;
      relatedSameMonth.push({ code: s.code, name: s.name });
      if (relatedSameMonth.length >= 8) break;
    }
  }

  const relatedSameIndustry = (stocksByIndustry.get(stock.industry) ?? [])
    .filter((s) => s.code !== stock.code)
    .slice(0, 6)
    .map((s) => ({ code: s.code, name: s.name }));

  const relatedSameCategory: { code: string; name: string }[] = [];
  if (primaryCategory) {
    for (const b of seedStockBenefits) {
      if (b.stockCode === stock.code) continue;
      if (b.confidence === "abolished") continue;
      const s = masterStockByCode.get(b.stockCode);
      if (!s) continue;
      if (!detectCategories(b).some((cat) => cat.key === primaryCategory.key)) continue;
      relatedSameCategory.push({ code: s.code, name: s.name });
      if (relatedSameCategory.length >= 6) break;
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
        {stock.name}（{stock.code}）の株主優待はいつ届く？
      </h2>

      {isAbolished ? (
        <p className="mt-3 text-sm text-slate-600">
          この銘柄は現在、株主優待を実施していません。
        </p>
      ) : null}

      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
        <p>
          {stock.name}（証券コード {stock.code}）は{stock.market}の{stock.industry}銘柄です。
          {benefit?.content
            ? ` 株主優待は「${benefit.content}」として登録されています。`
            : " 株主優待の内容はまだ十分に登録されていません。"}
          {rightsMonthsText ? ` 権利確定月は${rightsMonthsText}です。` : ""}
          {minSharesText ? ` 優待対象は${minSharesText}からです。` : ""}
        </p>
        <p>
          {arrivalText(benefit)}
          このページでは、公式情報だけでなく「届いた！」「使った！」投稿をもとに、
          実際にいつ届いたか、どの時期に使われているかを確認できます。
          {arrivalReports.length > 0
            ? ` 現在、サンプルを含む到着投稿は${arrivalReports.length}件（優待品${actualArrivalReports.length}件・案内${noticeReports.length}件）あります。`
            : " まだ到着投稿が少ない銘柄では、最初の投稿が次回以降の予測精度向上につながります。"}
        </p>
      </div>

      <dl className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-500">優待内容</dt>
          <dd className="mt-1 font-medium text-slate-900">{benefit?.content ?? "未登録"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">権利確定月</dt>
          <dd className="mt-1 font-medium text-slate-900">{rightsMonthsText ?? "未登録"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">最低株数</dt>
          <dd className="mt-1 font-medium text-slate-900">{minSharesText ?? "未登録"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">到着・発送目安</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {benefit?.actualArrival ?? benefit?.expectedArrival ?? benefit?.noticeArrival ?? "投稿待ち"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">到着投稿</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {arrivalReports.length > 0 ? `${arrivalReports.length}件` : "募集中"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">直近の到着投稿日</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {latestArrivalReport?.arrivalDate ?? "投稿待ち"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <h3 className="font-bold">いつクル？独自データについて</h3>
        <p className="mt-1">
          このページの到着目安、投稿件数、関連銘柄は、掲載している優待シード情報と
          ユーザーの「届いた！」投稿を組み合わせて整理しています。
          単なる銘柄一覧ではなく、実際の到着体験を集めて次回の目安に役立てるための情報です。
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">到着までの流れ</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{flowText}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">届かない時の確認</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{missingText}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">届いた後の使い道</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{usageIdea}</p>
        </section>
      </div>

      {categoryList.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">この優待のジャンル</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {categoryList.map((cat) => (
              <li
                key={cat.key}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${cat.colorClass}`}
              >
                <span aria-hidden>{cat.emoji}</span>
                <span>{cat.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-900">
          {stock.name}の優待で確認したいポイント
        </h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
          <li>権利確定月と保有株数の条件を、購入前に公式IRで確認しましょう。</li>
          <li>案内・申込書と実際の優待品は、別々の日に届くことがあります。</li>
          <li>到着時期は地域や発送順でずれるため、みんなの投稿を目安にしてください。</li>
          <li>優待券やポイントは有効期限があるため、届いたら早めに使い道を確認しましょう。</li>
        </ul>
      </div>

      {relatedSameMonth.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">
            {monthsToText(rightsMonthsList)}が権利確定月の他の株主優待銘柄
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {relatedSameMonth.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/stock/${r.code}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-mono text-[10px] text-slate-500">{r.code}</span>
                  <span>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedSameCategory.length > 0 && primaryCategory && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900">
            {primaryCategory.label}の株主優待銘柄
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {relatedSameCategory.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/stock/${r.code}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-mono text-[10px] text-slate-500">{r.code}</span>
                  <span>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedSameIndustry.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900">{stock.industry}の他の銘柄</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {relatedSameIndustry.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/stock/${r.code}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-mono text-[10px] text-slate-500">{r.code}</span>
                  <span>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
