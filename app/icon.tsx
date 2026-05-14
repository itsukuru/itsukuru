/* eslint-disable react/no-unknown-property */
import { ImageResponse } from "next/og";

/**
 * Favicon（32×32）
 * Next.js が自動的に <link rel="icon"> を埋め込む。
 * ブラウザのタブ・ブックマーク・モバイルホーム画面 (PWA) で利用される。
 */
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#60a5fa",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 16,
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        ク
      </div>
    ),
    { ...size }
  );
}
