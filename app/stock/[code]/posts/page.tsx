import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveStockByCode } from "@/app/lib/stocksClient";
import { SITE_URL } from "@/app/lib/siteConfig";
import StockPostsClient from "./StockPostsClient";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const stock = resolveStockByCode(code);
  if (!stock) {
    return {
      title: `投稿一覧 ${code}`,
      robots: { index: false, follow: false },
    };
  }
  const title = `${stock.name}（${stock.code}）の届いた・使った投稿一覧`;
  const description = `${stock.name}の株主優待について、ユーザー投稿の「届いた」「使った」を一覧で確認できます。`;
  return {
    title,
    description,
    alternates: {
      canonical: `/stock/${stock.code}/posts`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/stock/${stock.code}/posts`,
      type: "article",
    },
  };
}

export default async function StockPostsPage({ params }: PageProps) {
  const { code } = await params;
  const stock = resolveStockByCode(code);
  if (!stock) {
    notFound();
  }
  return <StockPostsClient code={stock.code} fallbackStock={stock} />;
}
