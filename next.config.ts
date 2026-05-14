import type { NextConfig } from "next";

/**
 * セキュリティヘッダー一式
 * ─────────────────────────────────────────────
 * クリックジャッキング・MIME スニッフィング・MITM 攻撃・参照元漏洩 等の
 * 一般的な攻撃ベクターを HTTP レスポンスレベルで防御する。
 *
 * 開発時とプロダクションで適切に切り分ける:
 *   - dev (npm run dev):
 *       HMR (ws://localhost) や localhost を考慮し
 *       upgrade-insecure-requests と HSTS を抜く。
 *   - production:
 *       フル機能で適用。
 * ─────────────────────────────────────────────
 */
const isProd = process.env.NODE_ENV === "production";

/** Content Security Policy の値を生成 */
const buildCSP = (): string => {
  const directives: string[] = [
    "default-src 'self'",
    // Next.js は inline script を多用するため 'unsafe-inline' が必要
    // dev モードでは blob: と eval も必要（HMR / React Refresh が利用）
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://va.vercel-scripts.com${
      isProd ? "" : " 'wasm-unsafe-eval'"
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    // dev では HMR の ws/wss 接続も許可（127.0.0.1 直打ちや Cursor プレビューで localhost と混在しがち）
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com${
      isProd
        ? ""
        : " ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:* http://localhost:* http://127.0.0.1:*"
    }`,
    // 本番: クリックジャッキング防止のため iframe 埋め込み禁止。
    // 開発: Cursor / VS Code の右側プレビュー・Simple Browser が iframe で
    // localhost を読み込むため、frame-ancestors を緩める（ローカルのみ）。
    isProd ? "frame-ancestors 'none'" : "frame-ancestors *",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  // 本番のみ: HTTPS を強制
  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

const securityHeaders = [
  // X-Frame-Options は本番のみ。dev では Cursor 右パネルの埋め込みプレビューが
  // DENY で真っ白になるため付与しない。
  ...(isProd
    ? ([{ key: "X-Frame-Options", value: "DENY" }] as const)
    : ([] as const)),
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "browsing-topics=()",
      "payment=()",
      "usb=()",
      "fullscreen=(self)",
    ].join(", "),
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Content-Security-Policy",
    value: buildCSP(),
  },
];

// HSTS は本番（HTTPS 環境）のみ付与。dev で付けるとブラウザが localhost を
// HTTPS にリダイレクトしようとして落ちる。
if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
