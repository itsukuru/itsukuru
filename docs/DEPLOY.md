# 本番デプロイ手順（Vercel + Supabase）

このドキュメントは、いつクル？ を **Vercel + Supabase** で本番運用するための手順書です。
朝起きたらこのチェックリストを上から順に進めれば本番リリースできるよう、コピペ可能な形でまとめています。

---

## 0. 全体像

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel         │         │  Supabase        │
│  (Next.js本体)  │ ─HTTPS→ │  (DB + 認証 + 画像)│
└─────────────────┘         └──────────────────┘
        ↑
        │ git push
        │
┌─────────────────┐
│  GitHub         │
│  (このリポジトリ)│
└─────────────────┘
```

---

## 0-1. プレビュー: 同一 Wi-Fi の別端末からローカルを開く（デプロイ前テスト）

開発 PC でアプリを起動し、スマホや別 PC のブラウザから同じ LAN 内でアクセスする手順です。

**PC が有線（LAN ケーブル）・スマホが Wi‑Fi でも問題ありません。** 同じ家庭用ルーターにぶら下がっていれば、有線と無線は同じネットワークとしてつながります。

1. **PC のローカル IP を確認**（例: Windows は `ipconfig` の「IPv4 アドレス」、よく `192.168.x.x`）。
2. リポジトリ直下で **LAN 向けに起動**（開発サーバー）:
   ```bash
   npm run dev:lan
   ```
3. **別のターミナル**で URL 一覧を表示（任意・おすすめ）:
   ```bash
   npm run lan:url
   ```
   表示された `http://192.168.x.x:3000` のいずれかをスマホで開きます。
4. 手元で IP が分かっている場合は、別端末のブラウザで `http://（IPv4）:3000` を直接開いても構いません（例: `http://192.168.1.10:3000`）。
5. 繋がらない場合は **Windows ファイアウォール**で Node / ポート 3000 の受信を許可するか、一時的にプライベートネットワークを「検出」にする。

**インターネット越し**に素早く共有したい場合（外からスマホで見る等）は、[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) の `cloudflared tunnel --url http://localhost:3000` などで一時 URL を発行する方法があります（本番 URL ではありません）。

本番と同じ HTTPS ドメインで試す場合は、次章の **Vercel にプレビューデプロイ**が確実です。

---

## 1. Supabase 側の準備（10〜15分）

### 1-1. プロジェクト作成

1. [Supabase ダッシュボード](https://supabase.com/dashboard) → **New project**
2. Name: `itsukuru-prod`（任意）
3. Region: **Northeast Asia (Tokyo)** を推奨
4. Database Password: 強固なもの。**Bitwarden 等にメモ**
5. **Create new project** → 完了まで 1〜2 分待つ

### 1-2. SQL マイグレーション適用

左メニュー「**SQL Editor**」 → **New query** に、以下のファイルを **順番に** 貼り付けて実行:

| 順 | ファイル | 内容 |
| - | - | - |
| 1 | `supabase/migrations/0001_initial_schema.sql` | 主要テーブル（profiles / benefits / arrival_reports / usage_reports / holdings / watchlist）+ RLS + トリガー |
| 2 | `supabase/migrations/0002_benefits_confidence.sql` | benefits の確度カラム拡張 |
| 3 | `supabase/migrations/0003_likes_and_images.sql` | いいね（post_likes）と画像（image_url）対応 |
| 4 | `supabase/migrations/0004_contact_messages.sql` | お問い合わせ / 通報フォーム用テーブル |
| 5 | `supabase/migrations/0005_arrival_reports_phase.sql` | arrival_reports に phase（案内/実物）列を追加 |

> 各 SQL は冪等（再実行しても壊れない）ように作ってあるので、間違って 2 回実行しても大丈夫。

### 1-3. ストレージバケット作成（投稿画像用）

1. 左メニュー「**Storage**」 → **New bucket**
2. Name: `report-images`
3. **Public bucket**: ON
4. File size limit: `5 MB`
5. Allowed MIME types: `image/jpeg, image/png, image/webp`
6. **Save**

その後 **Storage → Policies** で `report-images` バケットに以下を追加:

| Operation | Definition |
| - | - |
| SELECT | `true`（全員に読み込み許可） |
| INSERT | `auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text` |
| DELETE | `auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text` |

### 1-4. 認証設定（Magic Link / メール）

1. 左メニュー「**Authentication**」 → **Providers** → **Email**
2. **Enable Email provider**: ON
3. **Confirm email**: ON（推奨）
4. **Secure email change**: ON
5. **Save**

#### 任意: カスタム SMTP（無料 Gmail で OK）

無料プランは 1 時間あたり 4 通までなので、本気で運用するなら Gmail SMTP を設定:

1. 左メニュー「**Project Settings**」 → **Auth** → **SMTP Settings**
2. Enable Custom SMTP: ON
3. Sender email: 自分の Gmail アドレス
4. Sender name: `いつクル？`
5. Host: `smtp.gmail.com`
6. Port: `465`
7. Username: 自分の Gmail アドレス
8. Password: [Gmail のアプリパスワード](https://myaccount.google.com/apppasswords)
9. **Save**

### 1-5. Site URL の設定

「**Authentication**」 → **URL Configuration**:
- Site URL: `https://itsukuru.example.com`（本番ドメイン）
- Redirect URLs に以下を追加:
  - `https://itsukuru.example.com/**`
  - `http://localhost:3000/**`（開発用）

### 1-6. API キー控え

「**Project Settings**」 → **API**:
- **Project URL**: `https://xxx.supabase.co` をコピー
- **Publishable key**（旧 anon key）: コピー
- これを後で Vercel の環境変数に貼る

---

## 2. Vercel デプロイ（10分）

### 2-1. GitHub にプッシュ

```bash
git add .
git commit -m "feat: ready for production deploy"
git push origin main
```

### 2-2. Vercel プロジェクト作成

1. [Vercel ダッシュボード](https://vercel.com/dashboard) → **Add New** → **Project**
2. **Import Git Repository** → 当該リポジトリを選択
3. Framework Preset: **Next.js** が自動検出されることを確認
4. Build Command / Output Directory はデフォルトのまま

### 2-3. 環境変数を設定

「**Environment Variables**」セクションで以下を追加（**Production / Preview / Development すべてにチェック**）:

| Key | Value |
| - | - |
| `NEXT_PUBLIC_SUPABASE_URL` | 1-6 でコピーした Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1-6 でコピーした Publishable key |
| `NEXT_PUBLIC_SITE_URL` | 後で割り当てるカスタムドメインの URL |

### 2-4. **Deploy** ボタンを押す

3〜5 分でデプロイ完了。`https://itsukuru-xxx.vercel.app` のような URL が発行される。

### 2-5. カスタムドメイン（任意）

1. Vercel プロジェクトの **Settings** → **Domains**
2. 取得済みドメイン（例: `itsukuru.com`）を入力 → **Add**
3. Vercel が指示する DNS レコード（A レコード or CNAME）をドメインレジストラに設定
4. 数分〜数時間で SSL 込みで公開

ドメインが確定したら **2-3 の `NEXT_PUBLIC_SITE_URL` を更新** → **再デプロイ**。

---

## 3. デプロイ後の動作確認（5分）

本番 URL を開いて以下をチェック:

- [ ] トップページが表示される
- [ ] 銘柄検索（`/search`）が動く
- [ ] 銘柄詳細（`/stock/9433`）が表示される
- [ ] マイページ（`/mypage`）でメール登録 → Magic Link メールが届く
- [ ] Magic Link をクリック → ログイン状態でリダイレクト
- [ ] 「届いた！」を投稿 → Supabase の `arrival_reports` テーブルにレコードが入る
- [ ] 別ブラウザ／シークレットウィンドウで同じ銘柄を開く → 投稿が見える ★最重要★
- [ ] 画像投稿は未ログインだとピッカーが出ず、ログイン誘導が出る
- [ ] ログイン状態で画像投稿 → 写り込み防止チェック後にアップロード可能
- [ ] 画像付きで投稿 → 別ブラウザでも画像が表示される
- [ ] お問い合わせフォーム（`/contact`）から送信 → `contact_messages` に入る
- [ ] `/admin/import` は **直接 URL からのみアクセス可** / フッターやナビに出ていない

---

## 4. 運用開始後の継続タスク

### 4-1. SEO 設定

- [Google Search Console](https://search.google.com/search-console) にドメインを登録
- `https://itsukuru.example.com/sitemap.xml` を送信
- 1 週間ほどでインデックス開始

### 4-2. 監視

- Vercel Analytics は無料枠で十分（オプション）
- Supabase ダッシュボードで `Database → Database Health` を週 1 回確認

### 4-3. バックアップ

- Supabase 無料プランは 7 日分の自動バックアップあり
- 大きな変更前は **Database → Backups** で手動バックアップ推奨

---

## トラブルシューティング

### Magic Link メールが届かない
- Supabase の SMTP 設定を再確認
- 迷惑メールフォルダを確認
- カスタム SMTP を設定すれば確実

### 投稿が他の人に見えない
- ブラウザ DevTools で `arrival_reports` への INSERT が成功しているか確認
- 失敗していれば RLS ポリシー（auth.uid() = user_id）を再確認
- 認証されているか（`auth.uid()` が null でないか）も確認

### 画像がアップロードできない
- Storage の `report-images` バケットが Public か確認
- バケットのポリシーで INSERT が `authenticated` 限定になっているか
- 未ログイン状態だと意図的にピッカーが出ない仕様

### Vercel ビルドが失敗
- Vercel のビルドログを確認
- `npm run build` がローカルで成功するか確認
- 環境変数が全て設定されているか確認

---

困ったら `/contact` から自分宛てに通報するか、Supabase ダッシュボードの Logs を見れば大体わかります。
