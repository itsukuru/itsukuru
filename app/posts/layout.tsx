import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/app/lib/siteConfig";

export const metadata: Metadata = {
  title: "みんなの投稿 - 「届いた」「使った」一覧",
  description:
    "株主優待の「届いた！」「使った！」投稿を、種類別・本日の新着で閲覧できます。銘柄詳細にもすぐジャンプできます。",
  alternates: { canonical: "/posts" },
  openGraph: {
    title: `${SITE_NAME}｜みんなの投稿`,
    description:
      "「届いた」「使った」のユーザー投稿一覧。気になる銘柄の実体験をさっとチェックできます。",
    url: `${SITE_URL}/posts`,
    type: "website",
  },
};

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
