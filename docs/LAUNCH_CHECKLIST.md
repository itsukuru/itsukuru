# 公開リリース チェックリスト

「いつクル？」を本番公開する前に確認・実施するタスク一覧です。

---

## 夜間バッチで完了済みの作業

### データ・コンテンツ

- ✅ **銘柄シードデータの拡充**（`app/data/stockBenefits.ts`）
  - 約 428 行 → **約 745 件**（約 **300 件以上追加**）
  - **高確信度（stable）の長期継続優待**を多数収録:
    サイゼリヤ / 第一興商 / コジマ / トリドール（丸亀製麺）/ クスリのアオキ /
    アルペン / 大戸屋 / KeePer 技研 / サトウ食品 / なとり / トラスコ中山 /
    丸千代山岡家 / 関門海 / 川本産業 / ミツウロコ / 朝日放送 / 片倉工業 /
    くら寿司 / S Foods / ロックフィールド / 旭松食品 / ユーグレナ /
    オリエンタルランド / コメダ HD / スシロー / H.I.S. / U-NEXT / 東洋水産 など
  - 不確実な情報は `confidence: "uncertain"` 付き、`notes` に変動可能性を明記
  - 重複エントリは notes で明示し、最新値を末尾に追加して維持

### サイト復旧 (2026-05-13)

- ✅ **CSP の dev/prod 切替**（`next.config.ts`）
  - dev で `upgrade-insecure-requests` を外して localhost を HTTPS リダイレクトしない
  - dev で `ws://localhost:* http://localhost:*` を connect-src に追加（HMR 用）
  - HSTS は本番のみ付与（dev で `localhost` を HTTPS にしないよう）
- ✅ **middleware.ts → proxy.ts**（Next.js 最新版の慣習に対応）
  - 関数名も `middleware` → `proxy` に変更
- ✅ **正規 /admin/* を 404 から救出**（`proxy.ts`）
  - 攻撃パスとしての `/admin\b` ブロックを削除
  - `/administrator/` `/phpmyadmin/` `/myadmin/` `/wp-json/` のみブロック

### 環境・デプロイ準備

- ✅ **`.env.example` の整備**
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SITE_URL`
- ✅ **`docs/DEPLOY.md`** - Vercel + Supabase 反映の完全手順書（migration 0005 含む）

### Supabase 投稿 API 雛形（未 import）

- ✅ `supabase/migrations/0005_arrival_reports_phase.sql` … phase 列追加
- ✅ `app/lib/reportsClientSupabase.ts` … 「届いた！」の Supabase アダプター
- ✅ `app/lib/usageReportsClientSupabase.ts` … 「使った！」の Supabase アダプター

### セキュリティ対策（乗っ取り・パクリ・XSS 等の防御）

- ✅ `next.config.ts` … HTTP セキュリティヘッダー一式（CSP / HSTS / X-Frame-Options 等）
- ✅ `middleware.ts` … 攻撃 UA / 攻撃パス / CSRF Origin 検証（Edge レベル）
- ✅ `app/robots.ts` … AI クローラー 30 種を除外（GPTBot / ClaudeBot 等）
- ✅ `app/lib/imageUploadClient.ts` … マジックバイト + MIME + 拡張子の 3 段階検証
- ✅ `app/lib/sanitize.ts` … XSS サニタイズ + URL 検証
- ✅ `app/terms/page.tsx` … 著作権・スクレイピング禁止条項を追加
- ✅ `SECURITY.md` … セキュリティ対応方針・脆弱性報告窓口

### 法務 / SEO / UX / 拡散 / 全ブラウザ最適化

#### SEO / 発見性

- ✅ `app/opengraph-image.tsx` … トップページの動的 OGP 画像（1200×630）
- ✅ `app/twitter-image.tsx` … Twitter Card 用画像
- ✅ `app/stock/[code]/opengraph-image.tsx` … 銘柄ごとの動的 OGP 画像
- ✅ `app/stock/[code]/twitter-image.tsx` … 銘柄ごとの Twitter Card 画像
- ✅ `app/icon.tsx` … タブ favicon（32×32 PNG 動的生成）
- ✅ `app/apple-icon.tsx` … iOS ホーム画面アイコン（180×180）
- ✅ `app/page.tsx` … JSON-LD のハードコード `example.com` を `SITE_URL` に修正

#### UX 仕上げ

- ✅ `app/not-found.tsx` … カスタム 404（よくアクセスされるページ案内付き）
- ✅ `app/error.tsx` … カスタム 500（リトライ + お問い合わせ導線）
- ✅ `app/global-error.tsx` … RootLayout 障害時の最終フォールバック
- ✅ `app/loading.tsx` … スケルトン loading（perceived performance ↑）

#### 法務・運営者表記

- ✅ `app/about/page.tsx` … 運営者情報セクション + 投資助言業ではない旨を明示
- ✅ `app/privacy/page.tsx` … Supabase 対応に全面リライト（11 条構成）

#### 拡散・共有導線

- ✅ `app/components/ShareButtons.tsx` … 汎用シェア UI（LINE / X / FB / Threads / コピー / OS ネイティブ共有）
- ✅ `app/stock/[code]/ShareButtons.tsx` … 銘柄ページ用シェア UI を強化
- ✅ ホームのヒーロー直下にシェアボタンを設置

#### 全ブラウザ最適化（iOS Safari / Android Chrome / PC）

- ✅ `app/globals.css` … セーフエリア / タップハイライト / 日本語フォント / overscroll / reduced-motion / focus-visible / 印刷スタイル
- ✅ `app/layout.tsx` … `viewport.themeColor` をライト/ダーク両対応、`appleWebApp.statusBarStyle: black-translucent`、スキップリンク追加、Supabase への preconnect
- ✅ `app/components/BottomNav.tsx` … iOS ホームインジケータの `safe-area-inset-bottom` 対応、`aria-current`、最小タップ領域 56px 確保

### 整理・運用上の改善

- ✅ ホームから運営者専用 CSV 取り込み UI を撤去（`/admin/import` に移動）
- ✅ 画像投稿を**会員限定**化（`app/components/ImagePicker.tsx`）
- ✅ 画像投稿前の**個人情報写り込み防止チェックリスト**を必須化
- ✅ `app/lib/useAuthUser.ts` … 認証状態を購読する共通フック

### SEO 追加強化 (2026-05-13)

- ✅ **FAQ 拡充**（12 → **27 件**）: NISA / 配当 / 引越し / 確定申告 / 名義 / 株式分割 / 海外居住 などロングテール質問
- ✅ **Calendar 月別説明文**: 1〜12月ごとに「3 月権利 おすすめ」「9 月優待 一覧」等の検索意図に答える説明文を追加
- ✅ **About ページ JSON-LD**: Organization / WebSite + SearchAction / BreadcrumbList
- ✅ **Search ページ meta 強化**: 高利回り / NISA / 100株 / クオカード 等 19 キーワード
- ✅ **ホームページ最下部に SEO ロングフォーム**: 「いつ届く」「まだ届かない」「何月」等の検索意図を網羅
- ✅ **sitemap.xml の月別検索 URL + カテゴリ検索 URL** 追加（18 件の検索クエリ用エントリー）
- ✅ **sitemap の優先度を優待データ有無で重み付け**: ある=0.9 / 廃止=0.4 / なし=0.5

### パフォーマンス改善 (2026-05-13)

- ✅ `StockSeoSection.tsx` の O(jpStocks × seedBenefits) を O(N) に（モジュール初期化時に Map 化）
- ✅ `calendar/page.tsx` も seedStockBenefits を直接走査するように
- ✅ `sitemap.ts` も benefitByCode Map で findSeedBenefit を回避

### UX / アクセシビリティ改善 (2026-05-13)

- ✅ `PostImage.tsx` / `PhotoGallerySection.tsx`: ESC キーで閉じる + body スクロール禁止 + decoding="async"
- ✅ `PhotoGallerySection.tsx`: alt 属性に具体情報を追加（投稿者・日付・種別）

---

## 今日のメインタスク（優先度順）

### 🔴 タスク 1: Supabase 投稿の API 層を実装（2〜4 時間）

**現状**: 投稿は `app/lib/reportsClient.ts` / `usageReportsClient.ts` で `localStorage` のみに保存している。

**ゴール**: 同じインタフェースのまま Supabase に書き込み・読み出しに切替える。`localStorage` は **未認証時のドラフト** または **オフラインキャッシュ** として残してもよい。

#### 1-1. 夜間に作成済みの雛形を活用

既存コードには触らずに、Supabase 版の雛形を新規ファイルとして用意済みです:

```
app/lib/reportsClient.ts             ← 既存（localStorage） … そのまま
app/lib/reportsClientSupabase.ts     ← 新規 ★ Supabase + localStorage フォールバック
app/lib/usageReportsClient.ts        ← 既存（localStorage） … そのまま
app/lib/usageReportsClientSupabase.ts ← 新規 ★ Supabase + localStorage フォールバック
```

#### 1-2. 切替手順（インクリメンタル）

##### Step A: スキーマ反映（5 分）

`supabase/migrations/0005_arrival_reports_phase.sql` をまだ流していなければ、
Supabase SQL Editor で実行する（phase カラムが追加される）。

##### Step B: import 一括書き換え（10 分）

VSCode の検索（Cmd/Ctrl+Shift+F）で以下を全置換:

| 検索 | 置換 |
| - | - |
| `from "@/app/lib/reportsClient"` | `from "@/app/lib/reportsClientSupabase"` |
| `from "@/app/lib/usageReportsClient"` | `from "@/app/lib/usageReportsClientSupabase"` |

##### Step C: 呼び出し側を await 対応に修正

主要修正箇所:
- `app/stock/[code]/StockReportSection.tsx`
  - `addLocalReport(...)` → `await addReport(stockCode, report, userId)` に置換
  - `deleteLocalReport(...)` → `await deleteReport(stockCode, reportId)` に置換
  - `updateLocalReport(...)` → `await updateReport(stockCode, reportId, patch)` に置換
- `app/stock/[code]/StockUsageSection.tsx`
  - `addLocalUsageReport(...)` → `await addUsageReport(...)` に置換
- `app/stock/[code]/StockDetailClient.tsx`
  - `loadReportsForStock(stockCode)` （同期）→ `await loadReportsForStock(stockCode)` （非同期版）

##### Step D: userId を引数で渡す

新 API の `addReport` は第 3 引数に `userId: string | null` を取ります:

```ts
import { useAuthUser } from "@/app/lib/useAuthUser";

const { user } = useAuthUser();
await addReport(stockCode, report, user?.id ?? null);
```

#### 1-3. テスト

ローカル環境で：
- 別ブラウザ（Chrome / Firefox）から同じ銘柄を開く
- 一方で投稿 → もう一方で見える ★これが最重要

---

### 🟡 タスク 2: Vercel デプロイ（30 分）

`docs/DEPLOY.md` の手順通りに進めれば OK。

要点：
1. Supabase プロジェクト作成
2. `supabase/migrations/000{1..5}_*.sql` を SQL Editor で順に実行
3. Storage バケット `report-images` を Public で作成
4. Vercel に GitHub リポジトリをインポート
5. 環境変数 3 つを設定
6. Deploy

---

### 🟢 タスク 3: 本番動作確認（15 分）

`docs/DEPLOY.md` の「デプロイ後の動作確認」をそのまま実行。
**「別ブラウザから投稿が見える」** が確認できたら **本番運用開始 OK**。

---

### 🛡️ タスク 4: セキュリティ強化の Supabase 側設定（10 分）

1. **Authentication → Email**
   - **OTP expiry**: `3600` 秒（1 時間に短縮）
   - **Confirm email**: ON

2. **Authentication → URL Configuration**
   - Site URL: 本番ドメインのみ
   - Redirect URLs: 必要最小限に絞る

3. **Authentication → Rate Limits**
   - **Token refresh requests**: `30/hour`
   - **Sign in / sign up requests**: `30/hour`
   - **Email OTP / Magic Link**: `4/hour`

4. **Authentication → MFA**
   - **Enable MFA**: ON

---

### 🛡️ タスク 5: Cloudflare 経由化（推奨・30 分）

無料プランでも以下が得られる:
- DDoS 自動防御
- WAF (Web Application Firewall)
- Bot Fight Mode
- Rate Limit Rules

手順:
1. Cloudflare で無料アカウント作成
2. ドメインのネームサーバーを Cloudflare のものに変更
3. DNS で Vercel への CNAME を「プロキシ経由（オレンジ雲）」に
4. SSL/TLS → Full (Strict) を選択
5. Security → Bot Fight Mode を ON

---

### 🚀 タスク 6: SEO 登録（15 分）

1. **Google Search Console** に `https://itsukuru.app` を登録
2. `https://itsukuru.app/sitemap.xml` を送信
3. **Bing Webmaster Tools** にも同様に登録（任意）

---

## 推奨作業順序

```
朝起きる
   ↓
1. (5 分) 夜間追加された銘柄を 2〜3 ランダム確認
   ↓
2. (5 分) Supabase プロジェクトを作成して SQL を流しておく
   ↓
3. (2〜4 時間) Supabase API 層の実装（タスク 1）
   ↓
4. (30 分) Vercel デプロイ（タスク 2）
   ↓
5. (15 分) 本番動作確認（タスク 3）
   ↓
6. (10 分) Supabase セキュリティ設定（タスク 4）
   ↓
7. (15 分) SEO 登録（タスク 6）
   ↓
8. ☕ 本番運用スタート 🎉
   ↓
9. （余裕があれば）Cloudflare 経由化（タスク 5）
```

---

## 詰まったら

| 症状 | 確認順 |
| - | - |
| Supabase でテーブルが作れない | 既存テーブルとの衝突がないか / `0001_initial_schema.sql` が冪等な書き方になっているか |
| 投稿しても Supabase に入らない | DevTools の Network タブで POST のレスポンスを確認 / RLS ポリシーを再確認 |
| ログインできない | Authentication → URL Configuration で Site URL / Redirect URLs を確認 |
| ビルドエラー | `npm run build` をローカル実行 / 型エラーは ReadLints で見つける |
| 画像投稿のチェックボックスが表示されない | ImagePicker が会員限定になっているため、ログインして再確認 |

---

良い 1 日になりますように 🌅
