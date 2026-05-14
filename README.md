# いつクル？ — 株主優待 到着情報共有サイト

株主優待がいつ届くかを、ユーザー投稿の「届いた！」「使った！」から共有・予測する Next.js アプリです。

> 🇯🇵 株主優待コミュニティ・到着日予測・優待カレンダー

---

## クイックスタート

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

**同じ Wi-Fi のスマホ等からローカルを試す**ときは `npm run dev:lan` を使い、別ターミナルで `npm run lan:url` を実行すると **開くべき URL 一覧**が表示されます。**PC が有線 LAN・スマホが Wi‑Fi でも同じルーターならそのまま使えます。** 手順の詳細は [`docs/DEPLOY.md`](docs/DEPLOY.md) の「0-1. プレビュー」を参照してください。

### 環境変数（任意）

Supabase 連携を使う場合は、`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

未設定でもアプリは起動します（localStorage モードで動作）。

---

## 主な機能

### ユーザー向け

- 🔍 **銘柄検索** — 名称 / 証券コード / 業種
- 🎁 **「届いた！」投稿** — 優待品 or 案内・申込書を区別して投稿
- 🎫 **「使った！」投稿** — 優待の使用シーン・感想を共有
- 🗓 **優待カレンダー** — 権利確定月で銘柄を一覧
- ⭐ **保有銘柄 / キニナル管理** — マイページで一元管理
- 🔔 **到着通知** — 「もうすぐ届きそう」をブラウザ通知
- 📱 **PWA 対応** — ホーム画面に追加してアプリのように使える
- 📤 **シェア機能** — LINE / X / Facebook / Threads / OS ネイティブ共有

### 運営者向け

- `/admin/import` — JPX 公開データ / CSV から銘柄マスタを取り込み（直接 URL のみ）

---

## ドキュメント

| ファイル | 用途 |
| - | - |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | 本番デプロイ手順（Vercel + Supabase） |
| [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) | 公開リリース前の最終チェックリスト |
| [`docs/overnight-work-log.md`](docs/overnight-work-log.md) | 開発作業ログ |
| [`SECURITY.md`](SECURITY.md) | セキュリティポリシー / 脆弱性報告窓口 |

---

## 技術スタック

- **Framework**: Next.js 16 (App Router) + React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database / Auth / Storage**: Supabase
- **Hosting**: Vercel
- **PWA**: Service Worker + Web App Manifest

---

## ライセンス

ソースコード: All Rights Reserved
無断複製・無断学習・無断再配信を禁止します。詳細は [`SECURITY.md`](SECURITY.md) および `/terms` を参照してください。
