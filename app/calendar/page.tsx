import type { Metadata } from "next";
import HoldingsCalendarClient from "./HoldingsCalendarClient";
import { SITE_URL, SITE_NAME } from "@/app/lib/siteConfig";

export const metadata: Metadata = {
  title: "保有銘柄の優待カレンダー｜届く月の予測",
  description: `${SITE_NAME}に登録した保有銘柄だけを表示。権利確定月ではなく、「いつごろ優待が届くか」の予測日の属する年月でグループ化します（投稿があれば投稿ベース、なければ権利約3か月後の暦換算）。`,
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: `保有銘柄の優待カレンダー｜${SITE_NAME}`,
    description:
      "保有株を登録すると、優待が届く月ごとの見込みを表示します（届くタイミングの予測を優先）。",
    url: `${SITE_URL}/calendar`,
    type: "website",
  },
};

/** 優待一覧ではなく、この端末の保有銘柄にフォーカスしたカレンダー（クライアント） */
export default function CalendarPage() {
  return <HoldingsCalendarClient />;
}
