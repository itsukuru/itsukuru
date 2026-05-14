import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "「いつクル？」のプライバシーポリシー。Supabase に保存されるアカウント情報、localStorage の利用、クッキー、アクセス解析、第三者提供についての方針を記載しています。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">プライバシーポリシー</span>
        </nav>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-xs text-slate-500">最終更新日: 2026年5月13日</p>

        <article className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 sm:p-6">
          <section>
            <h2 className="text-base font-bold text-slate-900">1. 基本方針</h2>
            <p className="mt-2">
              当サイト（以下「当サイト」）は、ユーザーのプライバシーを最大限尊重し、必要最小限の情報のみを取得・保管します。
              当サイトの一部機能はサインインなしでも利用できますが、投稿・お気に入り等の同期機能を使うにはメールアドレスによるサインインが必要です。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">2. サーバー（Supabase）に保存される情報</h2>
            <p className="mt-2">
              当サイトはバックエンドサービスとして
              <a
                href="https://supabase.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-blue-600 hover:underline"
              >
                Supabase
              </a>
              （データセンター: 海外含む）を利用します。サインイン時に以下の情報がサーバーに保存されます。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>メールアドレス（認証目的、Magic Link 送信用）</li>
              <li>表示名（任意。「届いた！」「使った！」投稿に表示する名前）</li>
              <li>地域名（任意。投稿の参考情報として表示）</li>
              <li>投稿内容（到着日・コメント・添付画像）</li>
              <li>いいね（投稿への反応）</li>
              <li>サインインの記録（不正アクセス検知用、Supabase 標準）</li>
            </ul>
            <p className="mt-2">
              パスワードは保存しません（Magic Link 方式のため）。
              IP アドレスは Supabase が認証ログに一定期間保存しますが、当サイト運営者は通常これを閲覧しません（脆弱性調査・不正対応時のみ参照）。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">3. ブラウザに保存される情報（localStorage）</h2>
            <p className="mt-2">
              以下の情報はユーザーのブラウザの localStorage にのみ保存され、サーバーには送信されません。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>保有銘柄・キニナル銘柄の一覧</li>
              <li>通知設定</li>
              <li>銘柄マスタのローカル編集内容</li>
              <li>投稿の下書き（送信前の一時保存）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">4. クッキー</h2>
            <p className="mt-2">
              当サイトは Supabase の認証用クッキー（セッショントークン）を使用します。これはサインイン状態の維持にのみ使われ、第三者には共有されません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">5. アクセス解析・パフォーマンス計測</h2>
            <p className="mt-2">
              当サイトは将来的に以下のサービスを導入する場合があります（個人を特定する情報は取得しません）。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Vercel Analytics（ページビュー数の集計）</li>
              <li>Vercel Speed Insights（パフォーマンス計測）</li>
              <li>Google Analytics 4 等の一般的なアクセス解析ツール</li>
            </ul>
            <p className="mt-2">
              導入時には本ページにて告知し、必要に応じてオプトアウト方法を案内します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">6. 第三者への提供</h2>
            <p className="mt-2">
              当サイトはユーザーの個人情報を、ユーザー本人の同意なく第三者に販売・譲渡することはありません。
              ただし、以下の場合はこの限りではありません。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>法令に基づく開示請求があった場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
              <li>サービスの運営に必要な範囲で業務委託先（Supabase / Vercel 等）に共有する場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">7. データの保管期間</h2>
            <p className="mt-2">
              投稿データはアカウント削除依頼があるまで保管します。アカウント削除をご希望の場合は
              <Link href="/contact" className="ml-1 text-blue-600 hover:underline">
                お問い合わせフォーム
              </Link>
              からご連絡ください。お問い合わせメッセージは対応完了後 1 年程度で削除します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">8. ユーザーの権利</h2>
            <p className="mt-2">
              ユーザーは以下の権利を有します。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>保存されているご自身の情報の開示請求</li>
              <li>誤った情報の訂正請求</li>
              <li>情報の利用停止・削除請求</li>
              <li>マイページからの投稿削除・データエクスポート</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">9. お子様の個人情報</h2>
            <p className="mt-2">
              本サイトは投資関連の情報を扱うため、18 歳未満のユーザーは原則として保護者の同意のもとでご利用ください。13 歳未満のユーザーの情報を意図的に収集することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">10. お問い合わせ</h2>
            <p className="mt-2">
              本ポリシーや当サイトに関するお問い合わせ・開示請求は
              <Link href="/contact" className="ml-1 text-blue-600 hover:underline">
                お問い合わせ・通報フォーム
              </Link>
              よりご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">11. ポリシーの変更</h2>
            <p className="mt-2">
              本ポリシーは予告なく改定されることがあります。改定後の内容は本ページに掲載した時点で効力を生じます。重要な変更がある場合は、サイト内で告知します。
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
