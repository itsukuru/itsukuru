/**
 * サイト全体で使う URL / 名称 / 説明を一箇所に集約する。
 *
 * 環境変数 NEXT_PUBLIC_SITE_URL が指定されていればそちらを優先。
 * 本番デプロイ時は Vercel の Environment Variables に
 *   NEXT_PUBLIC_SITE_URL=https://itsukuru.app
 * のように指定する。
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
/** 無効な URL だと layout の metadataBase でビルド・起動が落ちるため検証してフォールバックする */
export const SITE_URL =
  rawSiteUrl && /^https?:\/\//i.test(rawSiteUrl)
    ? rawSiteUrl
    : "https://itsukuru.app";

export const SITE_NAME = "いつクル？";

/** トップヒーローなどで見出し下に二段で置くキャッチコピー */
export const SITE_TAGLINE_PRIMARY =
  "「届いた！」「使った！」を投稿して、次の到着時期をみんなで予測する";

export const SITE_TAGLINE_SECONDARY = "株主優待共有コミュニティ";

/** メタ description / OG 等・一文で使うとき */
export const SITE_DESCRIPTION = `${SITE_TAGLINE_PRIMARY}${SITE_TAGLINE_SECONDARY}。`;
