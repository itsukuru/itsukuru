/* eslint-disable react/no-unknown-property */
import { ImageResponse } from "next/og";

/**
 * Apple Touch Icon（180×180）
 * iOS Safari でホーム画面に追加した際のアイコン。
 * Next.js が自動で <link rel="apple-touch-icon"> を埋め込む。
 */
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "#93c5fd",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
          fontWeight: 900,
          fontSize: 78,
          letterSpacing: -4,
        }}
      >
        クル
      </div>
    ),
    { ...size }
  );
}
