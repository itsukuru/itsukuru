/* eslint-disable react/no-unknown-property */
import { ImageResponse } from "next/og";
import { findSeedBenefit } from "@/app/data/stockBenefits";
import { resolveStockByCode } from "@/app/lib/stocksClient";

// Twitter Card 用画像。OGP 画像と同一内容だが、Next.js が
// `runtime` フィールドの再エクスポートを認識しないので直書きする。
export const runtime = "edge";
export const alt = "株主優待 到着情報";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ code: string }> };

export default async function StockTwitterImage({ params }: Props) {
  const { code } = await params;
  const stock = resolveStockByCode(code);
  const benefit = findSeedBenefit(code);

  const name = stock?.name ?? `銘柄 ${code}`;
  const industry = stock?.industry ?? "";
  const market = stock?.market ?? "";
  const benefitText = benefit?.content ?? "優待情報を確認する";
  const rightsMonth = benefit?.rightsMonths ?? "公式IRで確認";
  const minShares = benefit?.minShares
    ? `${benefit.minShares.toLocaleString("ja-JP")}株〜`
    : "公式IRで確認";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
          padding: 64,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 700,
            color: "#1d4ed8",
          }}
        >
          🎁 いつクル？ — 株主優待 到着情報
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            color: "#0f172a",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 36,
              color: "#475569",
            }}
          >
            <span
              style={{
                background: "#1e40af",
                color: "white",
                padding: "8px 20px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 32,
              }}
            >
              {code}
            </span>
            <span>{market}</span>
            <span style={{ color: "#94a3b8" }}>/</span>
            <span>{industry}</span>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1.1,
              maxWidth: 1100,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 36,
              fontSize: 32,
              fontWeight: 700,
              color: "#1e40af",
            }}
          >
            この銘柄の優待、いつ届く？
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                border: "2px solid #e2e8f0",
                borderRadius: 16,
                padding: "20px 28px",
                minWidth: 280,
              }}
            >
              <div style={{ fontSize: 18, color: "#64748b" }}>権利確定月</div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginTop: 6,
                }}
              >
                {rightsMonth}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                border: "2px solid #e2e8f0",
                borderRadius: 16,
                padding: "20px 28px",
                minWidth: 280,
              }}
            >
              <div style={{ fontSize: 18, color: "#64748b" }}>必要株数</div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginTop: 6,
                }}
              >
                {minShares}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 22,
              color: "#475569",
              maxWidth: 1080,
              lineHeight: 1.5,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {benefitText}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 64,
            fontSize: 22,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          itsukuru.app/stock/{code}
        </div>
      </div>
    ),
    { ...size }
  );
}
