import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, SITE_NAME } from "@/app/lib/siteConfig";

export const metadata: Metadata = {
  title: "銘柄検索 - 株主優待を権利月・最低株数・優待内容で絞り込み",
  description:
    "「いつクル？」の銘柄検索ページ。権利確定月（1月〜12月）・最低株数（100株・1000株など）・優待内容（クオカード・食事券・カタログギフト・自社製品）の条件で、株主優待銘柄を絞り込み検索できます。「優待 100株 おすすめ」「3月優待 一覧」「QUOカード優待」など、目的に合った銘柄が見つかります。共有用に URL クエリ `?q=` または `?keywords=` で初期キーワードを渡せます。",
  keywords: [
    "株主優待 検索",
    "優待 絞り込み",
    "優待 銘柄一覧",
    "優待 権利月",
    "優待 月別",
    "優待 最低株数",
    "優待 100株",
    "優待 1000株",
    "クオカード 優待",
    "QUOカード優待",
    "食事券 優待",
    "カタログギフト 優待",
    "自社製品 優待",
    "優待 利回り",
    "高利回り優待",
    "優待 おすすめ",
    "優待 初心者",
    "優待 NISA",
    "優待 長期保有",
  ],
  alternates: { canonical: "/search" },
  openGraph: {
    title: `${SITE_NAME}｜株主優待 銘柄検索・絞り込み`,
    description:
      "権利確定月・最低株数・優待内容から株主優待銘柄を絞り込み検索。「3月優待 一覧」「100株 優待」「QUOカード優待」など条件に合う銘柄を素早く発見。",
    url: `${SITE_URL}/search`,
    type: "website",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
