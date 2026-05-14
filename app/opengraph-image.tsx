/* eslint-disable react/no-unknown-property */
import { ImageResponse } from "next/og";
import { SITE_NAME } from "./lib/siteConfig";

/**
 * トップページの OGP 画像（1200x630）
 *
 * Twitter / LINE / Facebook 等で URL をシェアした際にプレビューされる画像。
 * 動的生成のため公開時に画像ファイルを準備する必要はない。
 */
export const runtime = "edge";
export const alt = `${SITE_NAME} - 株主優待がいつ届く？いつ使った？がわかる共有サイト`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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
          background:
            "linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #0ea5e9 100%)",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
          color: "white",
          padding: 80,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 60,
            fontSize: 24,
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          🎁 itsukuru.app
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 36,
            fontWeight: 600,
            opacity: 0.92,
          }}
        >
          あなたの株主優待、
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginTop: 12,
            fontSize: 168,
            fontWeight: 900,
            letterSpacing: -8,
            lineHeight: 1,
          }}
        >
          いつクル
          <span style={{ color: "#fef9c3" }}>？</span>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.16)",
              padding: "16px 32px",
              borderRadius: 999,
              border: "2px solid rgba(255,255,255,0.32)",
            }}
          >
            🎁 届いた！
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.16)",
              padding: "16px 32px",
              borderRadius: 999,
              border: "2px solid rgba(255,255,255,0.32)",
            }}
          >
            🎫 使った！
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.16)",
              padding: "16px 32px",
              borderRadius: 999,
              border: "2px solid rgba(255,255,255,0.32)",
            }}
          >
            🗓️ 予測
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 26,
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          株主優待コミュニティ・到着日予測・優待カレンダー
        </div>
      </div>
    ),
    { ...size }
  );
}
