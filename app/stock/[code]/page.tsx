import type { Metadata } from "next";
import { findSeedBenefit } from "@/app/data/stockBenefits";
import { getResolvedMasterStocks, resolveStockByCode } from "@/app/lib/stocksClient";
import { SITE_URL } from "@/app/lib/siteConfig";
import StockDetailClient from "./StockDetailClient";
import StockSeoSection from "./StockSeoSection";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateStaticParams() {
  return getResolvedMasterStocks().map((stock) => ({ code: stock.code }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const stock = resolveStockByCode(code);
  const benefit = findSeedBenefit(code);

  if (!stock) {
    return {
      title: `銘柄 ${code}`,
      robots: { index: false, follow: false },
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const title = `【${currentYear}年${currentMonth}月最新】${stock.name}（${stock.code}）の株主優待はいつ届く？発送時期・到着日まとめ`;
  const benefitText = benefit?.content ? `優待内容: ${benefit.content}。` : "";
  const rightsText = benefit?.rightsMonths
    ? `権利確定月: ${benefit.rightsMonths}。`
    : "";
  const minSharesText = benefit?.minShares
    ? `必要株数: ${benefit.minShares.toLocaleString("ja-JP")}株から。`
    : "";
  const description = `${stock.name}（証券コード ${stock.code} / ${stock.market}・${stock.industry}）の株主優待がいつ届くか、何月に発送・到着するかを、みんなの「届いた！」投稿から確認・予測できます。${benefitText}${rightsText}${minSharesText}「${stock.name} 優待 いつ？」「${stock.name} 優待 何月？」「${stock.name} 優待 届かない」など${currentYear}年の最新情報をチェック。`;

  const keywords = [
    `${stock.name} 株主優待`,
    `${stock.name} 優待 いつ`,
    `${stock.name} 優待 いつ届く`,
    `${stock.name} 優待 いつ来る`,
    `${stock.name} 優待 いつくる`,
    `${stock.name} 優待 何月`,
    `${stock.name} 優待 時期`,
    `${stock.name} 優待 発送`,
    `${stock.name} 優待 発送時期`,
    `${stock.name} 優待 到着日`,
    `${stock.name} 優待 届く時期`,
    `${stock.name} 優待 届かない`,
    `${stock.name} 優待 まだ来ない`,
    `${stock.name} 優待 内容`,
    `${stock.name} 優待 何株から`,
    `${stock.name} 優待 権利確定日`,
    `${stock.name} 優待 ${currentYear}`,
    `${stock.code} 優待`,
    `${stock.code} 株主優待 到着`,
    "株主優待",
    "優待 いつ届く",
  ];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/stock/${stock.code}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/stock/${stock.code}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function StockDetailPage({ params }: PageProps) {
  const { code } = await params;
  const stock = resolveStockByCode(code);
  const benefit = findSeedBenefit(code);

  const now = new Date().toISOString();
  const pageUrl = stock ? `${SITE_URL}/stock/${stock.code}` : "";
  const ogImageUrl = stock ? `${pageUrl}/opengraph-image` : "";

  const articleJsonLd = stock
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${stock.name}（${stock.code}）の株主優待はいつ届く？`,
        datePublished: now,
        dateModified: (() => {
          if (!benefit?.lastConfirmedAt) return now;
          const d = new Date(benefit.lastConfirmedAt);
          return Number.isNaN(d.getTime()) ? now : d.toISOString();
        })(),
        image: ogImageUrl ? [ogImageUrl] : undefined,
        about: {
          "@type": "Thing",
          name: `${stock.name}の株主優待`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": pageUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "いつクル？",
          url: SITE_URL,
        },
        ...(benefit?.content
          ? {
              description: `優待内容: ${benefit.content}${
                benefit.rightsMonths ? ` / 権利確定月: ${benefit.rightsMonths}` : ""
              }${
                benefit.expectedArrival
                  ? ` / 発送目安: ${benefit.expectedArrival}`
                  : ""
              }`,
            }
          : {}),
      }
    : null;

  const breadcrumbJsonLd = stock
    ? {
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
            name: `${stock.name}（${stock.code}）の株主優待`,
            item: pageUrl,
          },
        ],
      }
    : null;

  // FAQ structured data - 検索結果でリッチカード化されるとCTRが大幅に上がる
  const faqJsonLd =
    stock && benefit
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `${stock.name}（${stock.code}）の株主優待はいつ届きますか？`,
              acceptedAnswer: {
                "@type": "Answer",
                text: benefit.expectedArrival
                  ? `公式の発送案内では「${benefit.expectedArrival}」とされています。実際の到着日はユーザー投稿でも随時更新されています。`
                  : benefit.rightsMonths && benefit.rightsMonths !== "-"
                    ? `権利確定月（${benefit.rightsMonths}）の約2〜3ヶ月後に発送されるケースが多いです。具体的な日付はユーザー投稿で確認できます。`
                    : `現時点では発送時期の公式情報がありません。「届いた！」投稿が集まり次第、予測日が表示されます。`,
              },
            },
            {
              "@type": "Question",
              name: `${stock.name}の株主優待は何株から受け取れますか？`,
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  benefit.minShares && benefit.minShares > 0
                    ? `${benefit.minShares.toLocaleString("ja-JP")}株以上の保有で受け取れます。`
                    : `現時点では最低株数の情報がありません。`,
              },
            },
            {
              "@type": "Question",
              name: `${stock.name}の株主優待の権利確定月は？`,
              acceptedAnswer: {
                "@type": "Answer",
                text: benefit.rightsMonths
                  ? `${benefit.rightsMonths}が権利確定月です。`
                  : `権利確定月の情報がありません。`,
              },
            },
            {
              "@type": "Question",
              name: `${stock.name}の優待内容は何ですか？`,
              acceptedAnswer: {
                "@type": "Answer",
                text: benefit.content || "優待内容の情報がありません。",
              },
            },
          ],
        }
      : null;

  return (
    <>
      {articleJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <StockDetailClient code={code} fallbackStock={stock} benefit={benefit ?? null} />
      {stock && (
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <StockSeoSection stock={stock} benefit={benefit ?? null} />
        </div>
      )}
    </>
  );
}
