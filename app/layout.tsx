import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import NotificationWatcher from "./components/NotificationWatcher";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "./lib/siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる共有サイト`,
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
    title: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる共有サイト`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる共有サイト`,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": SITE_NAME,
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
      </body>
    </html>
  );
}
