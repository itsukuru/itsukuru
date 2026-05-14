import Link from "next/link";
import type { Metadata } from "next";
import { getResolvedMasterStocks } from "@/app/lib/stocksClient";
import { seedStockBenefits } from "@/app/data/stockBenefits";
import { SITE_URL, SITE_NAME } from "@/app/lib/siteConfig";

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

/**
 * 月別の SEO 用説明文。
 * 「3月権利 優待 一覧」「9月優待 おすすめ」などの検索クエリに対して
 * 自然な日本語の本文を提供し、検索流入を最大化する。
 */
const MONTH_DESCRIPTIONS: Record<number, string> = {
  1: "1月権利確定の銘柄は数が限られるため、希少性の高い優待が多いのが特徴です。1月末に保有していると約3〜4月頃に優待品が発送される傾向があります。年始の権利確定銘柄として注目されることが多く、決算月が1月の小売・サービス系企業が中心です。",
  2: "2月権利の銘柄はイオン（8267）など大手小売を中心に層が厚く、4〜5月頃に優待品の発送が始まることが多いです。家計に役立つ食料品・日用品の優待が豊富で、「クロス取引（つなぎ売り）」での取得も人気が高い月です。",
  3: "3月権利は日本企業で最も多く、株主優待銘柄の半数以上が集中します。発送は主に6月下旬〜7月にかけて行われ、配当金・議決権行使書とともに郵送されるケースが多いです。「3月優待 おすすめ」「3月権利 優待 一覧」などで検索される人気の月です。",
  4: "4月権利の銘柄は数こそ少ないものの、独自性のある優待が多い月です。発送は7〜8月頃が中心で、夏休みシーズンに合わせた商品券・カタログギフトが届くこともあります。決算が4月の小売・外食企業に多く見られます。",
  5: "5月権利の銘柄は少数派ですが、ニッチな業界の優待が見つかる月です。発送は8月前後で、お中元シーズンと重なるため食品系の優待が好まれます。決算月が5月の企業は少ないため、希少優待を狙う投資家に人気です。",
  6: "6月権利は3月権利に次ぐ「上半期決算」の銘柄が多く、9月下旬〜10月にかけて優待品が発送されます。9月権利と組み合わせて「半期ごとに2回もらえる」銘柄も多く、年2回優待を狙う方におすすめです。",
  7: "7月権利は小売・サービス業を中心に、夏のレジャー・お中元に役立つ優待が多い月です。発送は10〜11月頃が中心で、年末の贈答品としても活用できます。決算月が7月の企業に集中します。",
  8: "8月権利は数こそ少ないですが、ユニークな優待が多い月です。発送は11月〜12月にかけて行われ、お歳暮シーズンと重なるため、年末年始に役立つ食品・ギフトが届きます。決算月が8月のチェーン店系企業に多く見られます。",
  9: "9月権利は3月権利に次いで多く、特に「9月のみ・3月のみ・3月＋9月の2回」など様々なパターンがあります。発送は12月下旬〜翌1月にかけて行われ、お歳暮・お正月用としても活用できる優待が豊富です。",
  10: "10月権利の銘柄は数が限られていますが、年末年始に楽しめる優待が多い月です。発送は翌年1〜2月頃で、新春シーズンに届くため「お年玉」として家族で楽しめる優待が中心です。",
  11: "11月権利の銘柄も少数派ですが、決算月が独特な業界（教育・サービス業など）の優待が見つかる月です。発送は翌年2〜3月頃で、新生活シーズンの準備に役立つ優待品が届くこともあります。",
  12: "12月権利は年末決算の銘柄を中心に、翌年3〜4月頃に優待品が発送されます。新年度のスタートと合わせて新生活・新入学に役立つ優待が多く、ファミリー向け銘柄も豊富です。「年末優待」として人気のカテゴリです。",
};

const parseMonths = (rightsMonths?: string): number[] => {
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

export const metadata: Metadata = {
  title: "株主優待カレンダー｜権利確定月別の優待一覧",
  description:
    "1月から12月まで、権利確定月別に株主優待のある銘柄を一覧表示。「3月優待 一覧」「9月権利 優待」「年末優待」など、月別の優待検索に最適。発送時期の目安も掲載。",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "株主優待カレンダー｜権利確定月別の優待一覧",
    description:
      "1月〜12月の月別に株主優待銘柄を一覧表示。権利確定月から逆算して優待を選べます。",
    url: `${SITE_URL}/calendar`,
    type: "article",
  },
};

// 銘柄マスタ＋優待シード補完の和集合でルックアップする Map を一度だけ作成。
// これにより findSeedBenefit のループとペアで O(N²) になっていた処理を O(N) に。
const jpStockByCode = new Map(getResolvedMasterStocks().map((s) => [s.code, s]));

export default function CalendarPage() {
  // 月別に銘柄を分類（権利確定月複数を含む銘柄は各月にカウント）
  const byMonth: { [month: number]: { code: string; name: string }[] } = {};
  for (let m = 1; m <= 12; m += 1) byMonth[m] = [];

  // seedStockBenefits を走査する方が早い（件数は銘柄マスタより少ない想定）
  for (const benefit of seedStockBenefits) {
    if (benefit.confidence === "abolished") continue;
    const stock = jpStockByCode.get(benefit.stockCode);
    if (!stock) continue;
    const months = parseMonths(benefit.rightsMonths);
    for (const m of months) {
      byMonth[m].push({ code: stock.code, name: stock.name });
    }
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "株主優待カレンダー",
        item: `${SITE_URL}/calendar`,
      },
    ],
  };

  const totalBenefits = Object.values(byMonth).reduce(
    (sum, list) => sum + list.length,
    0
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="min-h-screen bg-slate-50 pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <nav aria-label="パンくず" className="text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1">›</span>
            <span className="text-slate-700">優待カレンダー</span>
          </nav>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            🗓️ 株主優待カレンダー（月別一覧）
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            権利確定月別に株主優待のある銘柄を一覧表示しています。
            <strong>「3月権利 優待」「9月優待 一覧」「年末優待」</strong>
            などをお探しの方はこちらからどうぞ。各銘柄ページではより詳しい優待内容と発送時期の予測が確認できます。
            <strong>{SITE_NAME}</strong>に掲載している優待銘柄は{totalBenefits}件です。
          </p>

          <section className="mt-6 space-y-4">
            {MONTH_LABELS.map((label, idx) => {
              const m = idx + 1;
              const stocks = byMonth[m];
              if (stocks.length === 0) return null;
              const shippingMonth = ((m - 1 + 3) % 12) + 1;
              return (
                <article
                  key={m}
                  id={`month-${m}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <header className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {label} 権利確定の優待銘柄
                    </h2>
                    <span className="text-xs text-slate-500">
                      {stocks.length}件 ・ 発送目安は{shippingMonth}月頃
                    </span>
                  </header>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {label}末に株式を保有していると優待が受け取れる銘柄です。実際の優待品は
                    <strong>{shippingMonth}月頃</strong>（権利月＋約3ヶ月）に発送されることが多いです。
                  </p>
                  {MONTH_DESCRIPTIONS[m] && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                      {MONTH_DESCRIPTIONS[m]}
                    </p>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {stocks.map((s) => (
                      <li key={s.code}>
                        <Link
                          href={`/stock/${s.code}`}
                          prefetch={false}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        >
                          <span className="font-mono text-[10px] text-slate-500">
                            {s.code}
                          </span>
                          <span>{s.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              月別索引（クイックジャンプ）
            </h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {MONTH_LABELS.map((label, idx) => {
                const m = idx + 1;
                const count = byMonth[m].length;
                if (count === 0) return null;
                return (
                  <li key={m}>
                    <a
                      href={`#month-${m}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {label}（{count}）
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="mt-6 text-xs text-slate-500">
            ※ 廃止が確認された銘柄は除外しています。各銘柄の最新情報は公式IRページもあわせてご確認ください。
          </p>
        </div>
      </main>
    </>
  );
}
