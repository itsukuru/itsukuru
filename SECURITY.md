# セキュリティポリシー / Security Policy

「いつクル？」のセキュリティ対応方針と、脆弱性報告窓口についてまとめています。

---

## 脆弱性を見つけられた方へ

**ありがとうございます。攻撃ではなく、責任ある開示（Responsible Disclosure）にご協力ください。**

報告窓口:
- フォーム: [/contact](https://itsukuru.example.com/contact) の「不具合」カテゴリ
- 内容例: 再現手順 / 影響範囲 / 想定深刻度 / PoC（あれば）

下記の行為は法的措置の対象となります:
- 公開前の脆弱性を SNS 等で広報する
- 他ユーザーのアカウントに実際にアクセスする
- 個人情報を取得・閲覧・保存する
- サービスを停止させる（DoS）
- 自動化ツールで負荷をかける

---

## 実装済みのセキュリティ対策

### 1. 認証・認可

| 項目 | 対応 |
| - | - |
| 認証方式 | Supabase Auth による Magic Link / OTP |
| パスワード | 使わない（フィッシング・流出リスクの根本対策） |
| セッション | Supabase が JWT + refresh token を Cookie 管理 |
| Email 変更 | Supabase の Secure Email Change (両アドレスに確認メール) |
| Magic Link 有効期間 | 1 時間 (Supabase 設定) |
| 同時ログイン端末数 | 制限なし、ただし RLS で本人以外は他人データを読めない |
| 認可 | Row Level Security (RLS) で本人のみ書込可、閲覧は全員可 |

### 2. 入力検証

| 項目 | 場所 |
| - | - |
| テキスト入力サニタイズ | `app/lib/sanitize.ts` (制御文字除去・長さ制限) |
| 銘柄コード検証 | 数字 4 桁のみ許可 |
| URL 検証 | `http(s):` のみ許可、`javascript:` 等は拒否 |
| 画像アップロード | MIME・拡張子・マジックバイト 3 段階検証 |
| 画像メタデータ | Canvas 経由のリサイズで EXIF / 埋込みデータを除去 |
| 画像サイズ上限 | 5MB（DoS 対策） |

### 3. 通信・HTTP ヘッダー

`next.config.ts` で全ページに以下を付与:

| Header | 効果 |
| - | - |
| `Strict-Transport-Security` | HTTPS 強制（HTTP からの中間者攻撃防止） |
| `X-Frame-Options: DENY` | クリックジャッキング防止 |
| `X-Content-Type-Options: nosniff` | MIME スニッフィング無効化 |
| `Referrer-Policy: strict-origin-when-cross-origin` | プライバシー |
| `Permissions-Policy` | カメラ以外の機能 API を無効化 |
| `Content-Security-Policy` | スクリプト読込元を限定 |

### 4. Edge Middleware (`middleware.ts`)

| 防御 | 詳細 |
| - | - |
| 攻撃 User-Agent 拒否 | AI クローラー / sqlmap / nikto / 古い curl など 403 |
| 攻撃パス拒否 | `.env`, `wp-admin`, `.php`, `.sql` 等を 404 |
| URL 長さ制限 | 2KB 超過は 414 |
| クエリ数制限 | 30 個超過は 400 |
| CSRF 二重防御 | POST/PUT/DELETE で Origin が他サイトなら 403 |

### 5. AI 学習データ・スクレイピング対策

`robots.ts` で以下を明示的にブロック:

| カテゴリ | 主要 UA |
| - | - |
| OpenAI | GPTBot / ChatGPT-User / OAI-SearchBot |
| Anthropic | ClaudeBot / anthropic-ai / Claude-Web |
| Google | Google-Extended（Gemini 学習用） |
| Apple | Applebot-Extended |
| Meta | meta-externalagent |
| Common Crawl | CCBot（LLM の元データ） |
| Perplexity | PerplexityBot |
| その他 | Bytespider, Amazonbot, cohere-ai 等 計 30+ |

加えて `middleware.ts` で同じ UA を 403 として遮断する**二重防御**を実装。
robots.txt を無視するクローラーにも対応。

### 6. データベース (Supabase RLS)

| テーブル | SELECT | INSERT | UPDATE | DELETE |
| - | - | - | - | - |
| `profiles` | 全員 | 本人のみ | 本人のみ | - |
| `benefits` | 全員 | 登録済みのみ | 登録済みのみ | - |
| `arrival_reports` | 全員 | 認証済みのみ | 本人のみ | 本人のみ |
| `usage_reports` | 全員 | 認証済みのみ | 本人のみ | 本人のみ |
| `holdings` | **本人のみ** | 本人のみ | 本人のみ | 本人のみ |
| `watchlist` | **本人のみ** | 本人のみ | - | 本人のみ |
| `contact_messages` | service_role のみ | 全員 | - | - |
| `post_likes` | 本人のみ | 本人のみ | - | 本人のみ |

詳細は `supabase/migrations/0001_initial_schema.sql` 参照。

### 7. 投稿スパム対策

| 機構 | 場所 |
| - | - |
| 投稿クールダウン | クライアント 30 秒（`localStorage` で管理） |
| Honeypot | コンタクトフォームに hidden field |
| 文字数制限 | 5〜5000 文字 |
| User-Agent / IP ロギング | 行わない（プライバシー優先） |

将来追加予定:
- [ ] Supabase Edge Function で IP ベースのレート制限
- [ ] Cloudflare Turnstile（Captcha 不要のボット判定）

### 8. ストレージ（Supabase Storage）

| 項目 | 設定 |
| - | - |
| バケット | `report-images`（Public read） |
| サイズ上限 | 5 MB |
| 許可 MIME | `image/jpeg`, `image/png`, `image/webp` |
| アップロード権限 | 認証済みかつ自分の `uid/` 配下のみ |
| 削除権限 | 認証済みかつ自分の `uid/` 配下のみ |
| 読込権限 | 公開（誰でも閲覧可、サイト表示のため） |

---

## 攻撃シナリオごとの防御層

### 乗っ取り (Account Takeover)

| 攻撃 | 防御層 |
| - | - |
| パスワードリスト型攻撃 | パスワードを使わない（Magic Link のみ） |
| Magic Link 流出 | 有効期間 1 時間 / ワンタイム |
| セッション乗っ取り | HttpOnly + Secure + SameSite Cookie |
| XSS による token 窃取 | CSP + React の自動エスケープ + sanitize.ts |
| CSRF | Origin 検証 (middleware) + SameSite Cookie |
| 端末紛失 | マイページから手動ログアウト可 |

### コンテンツ盗用 (Scraping / パクリ)

| 攻撃 | 防御層 |
| - | - |
| AI 学習目的のクロール | robots.txt + middleware で 403 |
| 全銘柄一括 DL | クエリ数 / URL 長制限 + 将来 Rate Limit |
| 個別ページ大量取得 | User-Agent ブロック + Cloudflare（導入推奨） |
| コピペ転載 | 利用規約で明示的に禁止 + 著作権表記 |
| 画像転載 | EXIF 除去後の独自リサイズ済み画像のみ公開 |

### サーバー攻撃

| 攻撃 | 防御層 |
| - | - |
| SQL Injection | Supabase が PostgREST 経由でパラメタライズ |
| XSS | CSP + React の自動エスケープ + sanitize.ts |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| MITM | `Strict-Transport-Security` (HSTS preload) |
| Open Redirect | sanitize.ts の `isSafeExternalUrl` |
| 既知の脆弱性スキャン | middleware で 404 |
| DDoS | Vercel + Cloudflare（推奨） |

---

## 運用者向けチェックリスト

### 月次

- [ ] Supabase Dashboard で `auth.audit_log_entries` を確認
- [ ] 異常な数の `contact_messages` がないか確認
- [ ] `npm audit` を実行して依存パッケージの脆弱性確認

### 四半期ごと

- [ ] `npm outdated` で主要パッケージのアップデート確認
- [ ] Next.js / Supabase の major version 追従検討
- [ ] ペネトレーションテストの委託検討（外部業者）

### インシデント発生時

1. Supabase で疑わしいユーザーの `auth.users` を確認 → 必要なら BAN
2. Storage の不正アップロード画像を削除
3. ログ ([Vercel Logs](https://vercel.com/dashboard)) で攻撃元 IP を特定
4. Cloudflare（導入時）で IP 単位の遮断
5. `contact_messages` で被害ユーザーに連絡
6. 必要に応じて [JPCERT/CC](https://www.jpcert.or.jp/) へ報告

---

## 追加で推奨される対策（未実装）

優先度順:

### 🟠 推奨（Vercel 移行後すぐ）

1. **Cloudflare 経由化**
   - Vercel ドメインの前段に Cloudflare を置く
   - WAF / DDoS / Bot Management が無料プランで利用可能
2. **Supabase の MFA / Passkey 有効化**
   - Dashboard → Authentication → Providers → MFA を ON
3. **Vercel Analytics / Speed Insights**
   - 異常トラフィックの早期検知

### 🟡 余裕があれば

4. **Sentry / Datadog 等のエラー監視**
5. **Supabase の Database Backups を有償プランへ**（7日 → 30日保持）
6. **依存パッケージの自動アップデート**（Dependabot 等）

---

## ライセンス・著作権表記

- ソースコード: All Rights Reserved
- 投稿コンテンツ: 投稿者帰属（運営に表示権許諾）
- 銘柄シードデータ: 公開情報の編集著作物として保護

無断複製・無断学習・無断再配信を禁止します。詳細は [/terms](https://itsukuru.example.com/terms) 第 5〜6 条を参照してください。
