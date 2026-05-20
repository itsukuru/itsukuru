import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "「いつクル？」の利用規約。ユーザー投稿のルール、禁止事項、運営からの削除権限などを定めています。",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">利用規約</span>
        </nav>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">利用規約</h1>
        <p className="mt-2 text-xs text-slate-500">最終更新日: 2026年5月16日</p>

        <article className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 sm:p-6">
          <section>
            <h2 className="text-base font-bold text-slate-900">第1条（適用）</h2>
            <p className="mt-2">
              本規約は、ユーザーが本サイトを利用する際の一切の行為に適用されます。本サイトを利用した時点で本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第2条（ユーザー投稿）</h2>
            <p className="mt-2">
              ユーザーは「届いた！」「使った！」などの投稿を行うことができます。投稿内容については、ユーザー自身が責任を負うものとします。
            </p>
            <p className="mt-2">
              当サイトは、<strong>実際に届いた・使った事実に基づく正直な投稿</strong>を求めます。データの保存場所・予測への利用・統計からの除外など、収集と処理の透明性については
              <Link href="/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              および
              <Link href="/faq#data-transparency" className="text-blue-600 hover:underline">
                よくある質問・FAQ（投稿データと予測）
              </Link>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第3条（禁止事項）</h2>
            <p className="mt-2">ユーザーは次の行為をしてはなりません。</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>法令または公序良俗に反する投稿</li>
              <li>他者を誹謗中傷する投稿</li>
              <li>虚偽の到着情報・使用情報の投稿</li>
              <li>株価操作・投資勧誘を目的とした投稿</li>
              <li>個人情報を含む投稿</li>
              <li>営利を目的とした宣伝・スパム行為</li>
              <li>当サイトの運営を妨害する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第4条（投稿の削除）</h2>
            <p className="mt-2">
              運営は、本規約に違反する投稿、または不適切と判断した投稿を、事前の通知なく削除する権利を有します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第5条（著作権・知的財産権）</h2>
            <p className="mt-2">
              本サイトに掲載されたコンテンツ（投稿、画像、データベース、デザイン、ソースコード等の一切）の著作権は、当該コンテンツを作成したユーザーまたは運営に帰属します。
            </p>
            <p className="mt-2">
              当サイトが独自に整理・編集した銘柄情報、到着時期の説明、投稿の集計、予測表示、関連銘柄リンク等のデータベースおよび編集物について、運営は著作権その他の知的財産権を留保します。
            </p>
            <p className="mt-2">
              ユーザーが本サイトに投稿したコンテンツについては、運営がサイト上での表示・複製・改変（誤字修正等）・配信のために必要な範囲で無償・非独占的に利用できる権利を、ユーザーは運営に許諾するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第6条（スクレイピング・無断複製の禁止）</h2>
            <p className="mt-2">
              運営の事前の書面による許可なく、以下の行為を行うことを禁止します。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>本サイトの掲載情報をクローラー・自動化ツール等で大量取得すること</li>
              <li>検索結果ページ、銘柄ページ、投稿一覧、sitemap 等を機械的に巡回し、継続的にデータを抽出・保存すること</li>
              <li>取得した情報を AI モデルの学習データとして利用すること</li>
              <li>取得した情報を再構成して類似のデータベース・サービス・アプリを構築・公開すること</li>
              <li>取得した情報を有償・無償を問わず第三者に提供・販売すること</li>
              <li>本サイトのコンテンツをコピーして自社サイト・SNS 等に掲載すること（引用要件を満たす場合を除く）</li>
            </ul>
            <p className="mt-2">
              違反が確認された場合、運営はアクセス遮断・損害賠償請求・法的措置を含む対応を行います。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第7条（セキュリティ）</h2>
            <p className="mt-2">
              本サイトに対する以下の行為を禁止します。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>他人のアカウントへの不正アクセス・乗っ取り行為</li>
              <li>脆弱性スキャン、ペネトレーションテスト等の許可なき実施</li>
              <li>サーバーへの過剰な負荷をかける行為（DoS / DDoS）</li>
              <li>本サイトのセキュリティ機構を回避・無効化する試み</li>
            </ul>
            <p className="mt-2">
              脆弱性を発見された方は、攻撃ではなく
              <Link href="/contact" className="ml-1 text-blue-600 hover:underline">
                お問い合わせフォーム
              </Link>
              より責任ある開示（Responsible Disclosure）にご協力をお願いします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第8条（免責事項）</h2>
            <p className="mt-2">
              本サイトの情報は投資判断・株主優待の受領を保証するものではありません。詳細は
              <Link href="/disclaimer" className="ml-1 text-blue-600 hover:underline">
                免責事項
              </Link>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">第9条（規約の変更）</h2>
            <p className="mt-2">
              運営は、必要と判断した場合、本規約を変更できるものとします。変更後の規約は本ページに掲載した時点で効力を生じます。
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
