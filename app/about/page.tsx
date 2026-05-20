import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/app/lib/siteConfig";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "「いつクル？」は、株主優待がいつ届くかをみんなの投稿で共有・予測する情報サイトです。運営者情報・サイトの目的・主な機能・データ出典・利用上のご注意をまとめています。投資助言業ではない個人運営の情報共有サイトです。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `${SITE_NAME}について｜株主優待 到着情報共有サイト`,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/about`,
    type: "article",
  },
};

export default function AboutPage() {
  // Organization JSON-LD（検索エンジンに運営者情報を構造化データで提供）
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["いつクル", "itsukuru", "イツクル"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    foundingDate: "2026",
    knowsAbout: [
      "株主優待",
      "Stock Shareholder Benefits",
      "日本株 優待",
      "Japanese Stock Market",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
      availableLanguage: ["Japanese", "ja"],
    },
  };

  // パンくず JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "このサイトについて",
        item: `${SITE_URL}/about`,
      },
    ],
  };

  // WebSite + SearchAction (Sitelinks Search Box対応)
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span>このサイトについて</span>
        </nav>

        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          いつクル？ — 株主優待の到着情報共有サイトとは
        </h1>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">サイトの目的</h2>
          <p className="mt-2 text-sm text-slate-700">
            「いつクル？」は、上場企業の株主優待がいつ届くかを、みんなの「届いた！」投稿から共有・予測するサイトです。
            権利確定日の後、優待がいつ自宅に到着するのか分かりにくいため、ユーザー同士の情報共有で見える化します。
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">主な機能</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>銘柄名・証券コードでの検索</li>
            <li>銘柄ごとの「届いた！」投稿と最新到着日</li>
            <li>過去の投稿からの到着予測（「いつ届く目安」）</li>
            <li>
              投稿データの取り扱いの透明性（保存場所・集計のしかた・削除・
              <Link href="/faq#data-transparency" className="text-blue-600 hover:underline">
                よくある質問・FAQ
              </Link>
              ）
            </li>
            <li>保有銘柄・キニナルの管理と、保有銘柄の優待カレンダー（権利月・届く目安）</li>
            <li>保有株数の登録による優待対象判定</li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">ご利用にあたって</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>本サイトの情報は参考目安であり、投資勧誘を目的とするものではありません。</li>
            <li>優待内容・権利確定月などは各企業のIR情報で必ずご確認ください。</li>
            <li>到着日や優待内容は変更・廃止される場合があります。</li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">データの出典</h2>
          <p className="mt-2 text-sm text-slate-700">
            銘柄マスタは日本取引所グループ（JPX）が公開する東証上場銘柄一覧を参考にしています。
            優待情報は主要銘柄のみ参考データを収録し、ユーザー編集で随時更新できます。
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">サイト運営者情報</h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-3 text-sm text-slate-700 sm:grid-cols-[8rem_1fr] sm:gap-x-4">
            <dt className="font-medium text-slate-500">サイト名</dt>
            <dd>いつクル？（itsukuru）</dd>

            <dt className="font-medium text-slate-500">運営形態</dt>
            <dd>個人運営</dd>

            <dt className="font-medium text-slate-500">サイトの性質</dt>
            <dd>株主優待情報のユーザー共有プラットフォーム</dd>

            <dt className="font-medium text-slate-500">連絡先</dt>
            <dd>
              <Link
                href="/contact"
                className="text-blue-700 hover:underline"
              >
                お問い合わせ・通報フォーム
              </Link>
              （氏名・住所等の表示はプライバシーの観点から運営者宛のフォーム経由でご請求ください）
            </dd>

            <dt className="font-medium text-slate-500">公開開始</dt>
            <dd>2026 年</dd>
          </dl>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            ※ 当サイトは金融商品取引法に基づく投資助言業の登録は受けておりません。投資判断は必ずご自身の責任でお願いいたします。投資勧誘・特定銘柄の取得推奨は一切行いません。
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-900">企業の方へ</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-900">
            掲載されている貴社の優待情報に誤りがある場合や、内容のご相談がある場合は、
            <Link href="/contact" className="ml-1 underline hover:no-underline">
              お問い合わせフォーム
            </Link>
            よりご連絡ください。可能な限り速やかに対応いたします。
          </p>
        </section>
      </div>
    </main>
  );
}
