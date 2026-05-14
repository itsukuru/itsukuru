/**
 * 入力サニタイズ・正規化ユーティリティ
 * ─────────────────────────────────────────────────────────
 * React は JSX 内の文字列を自動でエスケープするため XSS は基本的に
 * 起きないが、以下のケースでは追加の対策が必要:
 *
 *   1. dangerouslySetInnerHTML を使う箇所 (本アプリでは現状なし)
 *   2. href / src 等の属性に動的値を入れる箇所
 *   3. JSON-LD / sitemap.xml 等の構造化データ
 *
 * このモジュールは「壊れ値」「攻撃文字列」を排除する純粋関数の集合。
 * React にレンダリングする前 or DB に保存する前に通すことで多層防御する。
 * ─────────────────────────────────────────────────────────
 */

/**
 * 制御文字（NUL, BEL, BS 等の見えない攻撃文字）を除去。
 * 改行(\n)とタブ(\t)は保持。
 */
export const stripControlChars = (input: string): string =>
  // eslint-disable-next-line no-control-regex
  input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

/**
 * 投稿コメント・名前等のテキスト入力を最終的に正規化する。
 * - 制御文字除去
 * - 先頭末尾の空白除去
 * - 改行は最大 2 連続まで（空行の連打抑止）
 * - 文字数上限でカット
 */
export const sanitizeUserText = (
  input: string,
  maxLength: number = 2000
): string => {
  const cleaned = stripControlChars(input)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.slice(0, maxLength);
};

/**
 * 投稿者名・地域名等の短い1行入力。
 * 改行も削除する。
 */
export const sanitizeUserShortText = (
  input: string,
  maxLength: number = 80
): string => {
  return stripControlChars(input)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
};

/**
 * 銘柄コードは「4桁の数字のみ」を許可。
 * 攻撃ペイロードや空白の混入を防ぐ。
 */
export const sanitizeStockCode = (input: string): string =>
  input.replace(/[^0-9]/g, "").slice(0, 4);

/**
 * 外部 URL の検証。安全な URL のみ通す。
 *   - http: / https: スキームのみ許可
 *   - javascript: / data: / vbscript: 等は拒否（XSS 起点）
 *   - 内部スラッシュ始まりも拒否（open redirect 抑止）
 */
export const isSafeExternalUrl = (input: string): boolean => {
  if (!input) return false;
  const trimmed = input.trim();

  // 危険スキームを明示的に弾く
  if (/^\s*(javascript|data|vbscript|file|about):/i.test(trimmed)) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * 表示用に文字列を HTML エスケープする（一応の保険）。
 * React 経由で表示する場合は不要だが、メタタグ・JSON-LD 等で使う。
 */
export const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * 投稿フォームへの入力をまとめてクリーニングするヘルパー。
 * 「届いた！」「使った！」フォームの送信前に通す前提。
 */
export type SanitizedReportInput = {
  reporterName: string;
  region: string | undefined;
  comment: string;
};

export const sanitizeReportInput = (raw: {
  reporterName?: string;
  region?: string;
  comment?: string;
}): SanitizedReportInput => ({
  reporterName: sanitizeUserShortText(raw.reporterName ?? "匿名", 30) || "匿名",
  region: raw.region ? sanitizeUserShortText(raw.region, 40) : undefined,
  comment: sanitizeUserText(raw.comment ?? "", 2000),
});
