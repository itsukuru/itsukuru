import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import NotificationWatcher from "./components/NotificationWatcher";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./lib/siteConfig";

/** 日本語 UI 全体の可読性・統一感のため本文は Noto Sans JP を優先 */
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  inLanguage: "ja-JP",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる到着共有コミュニティ`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "株主優待",
    "株主優待 いつ届く",
    "株主優待 いつ来る",
    "株主優待 いつくる",
    "株主優待 いつ",
    "優待 何月",
    "優待 時期",
    "優待 発送",
    "優待 発送日",
    "優待 発送時期",
    "優待 到着日",
    "優待 届く時期",
    "優待 到着",
    "優待 届かない",
    "優待 まだ来ない",
    "株主優待 予測",
    "株主優待 共有",
    "優待カレンダー",
    "優待 権利確定日",
    "優待 権利確定月",
    "優待 権利付き最終日",
    "優待 何株から",
    "優待 最低株数",
    "優待 長期保有",
    "優待 内容",
    "優待 何がもらえる",
    "優待 もらい方",
    "株主優待 最新",
    "株主優待 使った",
    "株主優待 いつ使う",
    "株主優待 使い方",
    "株主優待 使い道",
    "株主優待 活用",
    "優待 レビュー",
    "優待 感想",
  ],
  openGraph: {
    title: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる到着共有コミュニティ`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる到着共有コミュニティ`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    copyright: `© ${SITE_NAME}. All rights reserved.`,
    "msapplication-TileColor": "#1d4ed8",
    "msapplication-tap-highlight": "no",
    "format-detection": "telephone=no,email=no,address=no",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover" as const,
  colorScheme: "light" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${geistMono.variable} antialiased`}
    >
      {/* flex + grow は #main-content がビューポート高に張り付き内側スクロールになることがあるため、通常のブロック積みにする */}
      <body className="min-h-dvh bg-white">
        {/* スクリーンリーダー用のメインコンテンツへのスキップリンク (a11y) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-blue-700 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          メインコンテンツへスキップ
        </a>
        <ServiceWorkerRegistrar />
        <NotificationWatcher />
        <SiteHeader />
        <div id="main-content" className="w-full min-w-0 pb-16 md:pb-0">
          {children}
        </div>
        <SiteFooter />
        <BottomNav />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
