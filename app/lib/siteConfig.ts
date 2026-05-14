/**
 * サイト全体で使う URL / 名称 / 説明を一箇所に集約する。
 *
 * 環境変数 NEXT_PUBLIC_SITE_URL が指定されていればそちらを優先。
 * 本番デプロイ時は Vercel の Environment Variables に
 *   NEXT_PUBLIC_SITE_URL=https://itsukuru.app
 * のように指定する。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://itsukuru.app";

export const SITE_NAME = "いつクル？";

export const SITE_DESCRIPTION =
  "株主優待がいつ届く？いつ使った？をみんなで共有するサイト。銘柄ごとの「届いた！」「使った！」投稿を集めて、次回の到着日を予測し、優待の活用アイデアもシェアできます。";
