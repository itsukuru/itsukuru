import Link from "next/link";
import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import type { ContactCategory } from "@/app/lib/contactClient";

export const metadata: Metadata = {
  title: "お問い合わせ・通報",
  description:
    "「いつクル？」へのお問い合わせ・投稿の通報フォーム。誤った優待情報、不適切な投稿、サービスの改善要望などをお寄せください。",
  alternates: { canonical: "/contact" },
};

const CONTACT_EMAIL = "itsukuru.notify@gmail.com";

type SearchParams = {
  type?: string;
  code?: string;
  postId?: string;
};

const mapTypeToCategory = (type?: string): ContactCategory => {
  if (type === "benefit") return "wrong_info";
  if (type === "post") return "report_post";
  return "other";
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const defaultCategory = mapTypeToCategory(params.type);
  const defaultRelatedCode = params.code ?? "";
  const defaultMessage =
    params.type === "post" && params.postId
      ? `投稿ID: ${params.postId}\n通報理由: `
      : "";
  const isPrefilled = params.type === "benefit" || params.type === "post";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">お問い合わせ・通報</span>
        </nav>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
          お問い合わせ・通報
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          投稿の通報、優待情報の誤り、機能要望、不具合報告などをお寄せください。
        </p>

        {isPrefilled && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-900">
              {params.type === "benefit"
                ? `📝 優待情報の誤り通報${params.code ? `（銘柄コード: ${params.code}）` : ""}`
                : `📝 投稿の通報${params.code ? `（銘柄コード: ${params.code}）` : ""}`}
            </p>
            <p className="mt-1 text-amber-800">
              下のフォームに種別・銘柄コードを自動入力しています。内容を追記して送信してください。
            </p>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            📩 フォームで送信する（推奨）
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            下記のフォームから送信できます。ログイン不要・パスワード不要です。
          </p>
          <div className="mt-4">
            <ContactForm
              defaultCategory={defaultCategory}
              defaultRelatedCode={defaultRelatedCode}
              defaultMessage={defaultMessage}
            />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            ✉️ メールで連絡する（補助手段）
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            フォームが使えない場合や、ファイル添付が必要な場合は、以下のアドレス宛にメールでお送りください。
          </p>
          <p className="mt-3 text-xs text-slate-500">
            メールアドレス: <span className="font-mono text-slate-900">{CONTACT_EMAIL}</span>
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-900">通報・依頼のポイント</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <strong>不適切な投稿の通報</strong>: 銘柄コード・投稿日・該当する投稿者名・問題点をお知らせください。
            </li>
            <li>
              <strong>優待情報の誤り</strong>: 銘柄コード・誤った項目（権利月／最低株数／優待内容）・正しい情報・参考リンクをお知らせください。
            </li>
            <li>
              <strong>機能要望・不具合</strong>: 利用環境（PC / スマホ・ブラウザ）と再現手順を添えていただけると助かります。
            </li>
          </ul>
        </section>

        <p className="mt-6 text-xs text-slate-500">
          ご連絡の前に
          <Link href="/terms" className="mx-1 text-blue-600 hover:underline">
            利用規約
          </Link>
          ・
          <Link href="/privacy" className="mx-1 text-blue-600 hover:underline">
            プライバシーポリシー
          </Link>
          をご確認ください。
        </p>
      </div>
    </main>
  );
}
