import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "保有銘柄一覧",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HoldingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
