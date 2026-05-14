import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/siteConfig";

/**
 * robots.txt 生成
 * ─────────────────────────────────────────────
 * 1. 一般検索エンジン (Google / Bing 等) には公開ページのインデックスを許可
 *    マイページ・API・コンタクト送信ページは crawl 禁止
 *
 * 2. AI 学習用クローラーを明示的にブロック（パクリ・無断学習対策）
 *    対象:
 *      - GPTBot (OpenAI)
 *      - ChatGPT-User (OpenAI Browse)
 *      - OAI-SearchBot (OpenAI SearchGPT)
 *      - ClaudeBot (Anthropic)
 *      - anthropic-ai (Anthropic 旧 UA)
 *      - Google-Extended (Google Gemini 学習)
 *      - CCBot (Common Crawl - 多くの LLM の元データ)
 *      - PerplexityBot (Perplexity AI)
 *      - Bytespider (TikTok / ByteDance AI)
 *      - Amazonbot (Amazon AI)
 *      - cohere-ai (Cohere)
 *      - meta-externalagent (Meta AI)
 *      - DuckAssistBot (DuckDuckGo AI)
 *      - Applebot-Extended (Apple Intelligence)
 *      - Diffbot, FacebookBot, ImagesiftBot 等
 * ─────────────────────────────────────────────
 */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "Google-Extended",
  "CCBot",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "cohere-ai",
  "Cohere-AI",
  "meta-externalagent",
  "Meta-ExternalAgent",
  "DuckAssistBot",
  "Applebot-Extended",
  "Diffbot",
  "FacebookBot",
  "ImagesiftBot",
  "AwarioRssBot",
  "AwarioSmartBot",
  "DataForSeoBot",
  "MagpieCrawler",
  "Omgilibot",
  "Omgili",
  "PiplBot",
  "SemrushBot-OCOB",
  "SemrushBot-SWA",
  "Timpibot",
  "VelenPublicWebCrawler",
  "YouBot",
  "AI2Bot",
  "TurnitinBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 一般クローラー: 公開ページのみ許可
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/mypage",
          "/mypage/*",
          "/api/",
          "/api/*",
          "/contact",
          "/_next/",
          // 運営者専用ページ
          "/admin",
          "/admin/*",
          // ユーザー個別プロフィールはインデックス対象外（ニックネーム漏洩抑止）
          "/u/",
          "/u/*",
        ],
      },
      // AI 学習クローラー: 全面ブロック
      ...AI_CRAWLERS.map((bot) => ({
        userAgent: bot,
        disallow: "/",
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
