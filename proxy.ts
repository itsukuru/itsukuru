import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Proxy（旧: middleware）
 * ─────────────────────────────────────────────────────────
 * すべてのリクエストに対して以下の防御を行う:
 *
 * 1. 既知の悪意のある User-Agent を 403 で拒否
 *    （AI スクレイパー・脆弱性スキャナー・スパムボット）
 *
 * 2. Origin / Referer の検証（CSRF 追加防御）
 *    POST/PUT/DELETE 等の状態変更リクエストで Origin が自サイト
 *    でなければ拒否。Supabase の Bearer 認証だけでは防げない
 *    エッジケースをカバーする。
 *
 * 3. 過剰に長い URL/クエリの拒否（バッファオーバーフロー攻撃の試行）
 *
 * 4. 既知の脆弱性スキャンパス (.env, /wp-admin など) への
 *    アクセスを早期に拒否してリソース節約
 * ─────────────────────────────────────────────────────────
 */

/** AI 学習目的・無断スクレイピング・脆弱性スキャナーの User-Agent */
const BLOCKED_USER_AGENT_PATTERNS = [
  // AI クローラー (robots.txt と二重防御)
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  /ClaudeBot/i,
  /anthropic-ai/i,
  /Claude-Web/i,
  /Google-Extended/i,
  /CCBot/i,
  /PerplexityBot/i,
  /Bytespider/i,
  /Amazonbot/i,
  /cohere-ai/i,
  /meta-externalagent/i,
  /Diffbot/i,
  /AI2Bot/i,

  // 既知の脆弱性スキャナー / スパムボット
  /Nmap/i,
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /zmeu/i,
  /WPScan/i,
  /Acunetix/i,
  /Wfuzz/i,
  /Nessus/i,
  // 注: curl / wget / python-requests 等の汎用クライアントは
  // 正当なヘルスチェックや RSS 取得にも使われるため意図的に許可している
];

/** 確実に攻撃を試みているパスパターン */
const BLOCKED_PATHS = [
  // 環境変数 / 設定ファイル探索
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.htaccess/i,

  // WordPress 脆弱性スキャン
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/wp-content/i,
  /^\/wp-includes/i,
  /^\/wp-json/i,
  /^\/xmlrpc\.php/i,

  // PHP 関連（このサイトには存在しない）
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /\.jsp$/i,

  // 既知の偽管理パス探索（このサイト固有の正規 /admin/* は除外）
  /^\/administrator/i,
  /^\/phpmyadmin/i,
  /^\/myadmin/i,

  // バックアップファイル探索
  /\.sql$/i,
  /\.bak$/i,
  /\.backup$/i,
];

/** リクエストサイズの簡易上限 */
const MAX_URL_LENGTH = 2048;
const MAX_QUERY_PARAMS = 30;

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") ?? "";
  const method = request.method;

  // ── 1. 既知の攻撃パスを早期拒否 ─────────────────────────
  for (const pattern of BLOCKED_PATHS) {
    if (pattern.test(pathname)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // ── 2. 異常に長い URL / クエリ過多を拒否 ────────────────
  if (request.nextUrl.href.length > MAX_URL_LENGTH) {
    return new NextResponse("URI Too Long", { status: 414 });
  }
  if (Array.from(searchParams.keys()).length > MAX_QUERY_PARAMS) {
    return new NextResponse("Too Many Parameters", { status: 400 });
  }

  // ── 3. ブロック対象の User-Agent を拒否 ─────────────────
  // 静的ファイル・画像等は除外（誤検知抑制）
  const isAsset = /\.(ico|png|jpe?g|webp|svg|css|js|woff2?|ttf|map)$/i.test(
    pathname
  );
  if (!isAsset) {
    for (const pattern of BLOCKED_USER_AGENT_PATTERNS) {
      if (pattern.test(userAgent)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
  }

  // ── 4. 状態変更リクエストの Origin 検証 (CSRF 追加防御) ──
  // 通常 Supabase は Bearer トークンと CORS で防いでいるが、
  // 念のため Edge レベルでも検査する。
  if (
    method === "POST" ||
    method === "PUT" ||
    method === "DELETE" ||
    method === "PATCH"
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host") ?? "";

    const isSameOrigin = (value: string | null): boolean => {
      if (!value) return false;
      try {
        const url = new URL(value);
        return url.host === host;
      } catch {
        return false;
      }
    };

    if ((origin || referer) && !isSameOrigin(origin) && !isSameOrigin(referer)) {
      return new NextResponse("Cross-Origin Request Forbidden", {
        status: 403,
      });
    }
  }

  return NextResponse.next();
}

/**
 * Next.js 内部資源を除いた全リクエストに適用する。
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_vercel|favicon\\.ico).*)",
  ],
};
