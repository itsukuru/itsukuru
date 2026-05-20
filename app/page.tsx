import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

/**
 * クライアント本体は HomePageClient。ここでは `/` の canonical のみ明示。
 * （title / description はルート layout のデフォルトを継承）
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomePageClient />;
}
