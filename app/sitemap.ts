import type { MetadataRoute } from "next";
import { seedStockBenefits } from "./data/stockBenefits";
import { getResolvedMasterStocks } from "./lib/stocksClient";
import { SITE_URL } from "./lib/siteConfig";

// Sitemap 生成は build/cron で実行されることもあるため、
// 銘柄一覧 × seedBenefits の O(N²) を避けて Map で O(N) に。
const benefitByCode = new Map(seedStockBenefits.map((b) => [b.stockCode, b]));

const stockLastModified = (benefit: (typeof seedStockBenefits)[number] | undefined, fallback: Date): Date => {
  if (!benefit?.lastConfirmedAt) return fallback;
  const d = new Date(benefit.lastConfirmedAt);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/posts`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/calendar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // 銘柄ページの優先順位を「優待情報の有無」と「廃止済みか」で重み付け。
  // - 優待情報あり ＆ 廃止されていない: priority 0.9（最重要、daily 更新）
  // - 優待情報あり ＆ 廃止済み:        priority 0.4（重要度低、monthly 更新）
  // - 優待情報なし:                    priority 0.5（中、weekly 更新）
  const stockUrls: MetadataRoute.Sitemap = getResolvedMasterStocks().map((stock) => {
    const benefit = benefitByCode.get(stock.code);
    const lastModified = stockLastModified(benefit, now);
    if (!benefit) {
      return {
        url: `${SITE_URL}/stock/${stock.code}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      };
    }
    if (benefit.confidence === "abolished") {
      return {
        url: `${SITE_URL}/stock/${stock.code}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      };
    }
    return {
      url: `${SITE_URL}/stock/${stock.code}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.9,
    };
  });

  // 月別の calendar アンカーリンクを sitemap に含めることで、
  // 検索エンジンに「月別ページ」として認識させる。
  // hash アンカーは厳密には sitemap 用ではないが、Google は内部リンクとして扱う。
  // ここでは検索クエリ付きの search ページを月別に並べる。
  const monthSearchUrls: MetadataRoute.Sitemap = Array.from(
    { length: 12 },
    (_, i) => i + 1
  ).map((m) => ({
    url: `${SITE_URL}/search?rightsMonth=${m}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // 主要カテゴリの絞り込みパスも sitemap に登録（カテゴリ別流入用）
  const categoryUrls: MetadataRoute.Sitemap = [
    "quocard",
    "voucher",
    "catalog",
    "food",
    "service",
    "long-hold",
  ].map((cat) => ({
    url: `${SITE_URL}/search?category=${cat}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticUrls, ...monthSearchUrls, ...categoryUrls, ...stockUrls];
}
