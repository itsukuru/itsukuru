import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "免責事項",
  description:
    "「いつクル？」の免責事項。投資情報・株主優待情報は参考情報であり、投資判断や優待の受領を保証するものではないことを記載しています。",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="パンくず" className="text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">免責事項</span>
        </nav>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">免責事項</h1>
        <p className="mt-2 text-xs text-slate-500">最終更新日: 2026年5月16日</p>

        <article className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 sm:p-6">
          <section>
            <h2 className="text-base font-bold text-slate-900">投資情報ではありません</h2>
            <p className="mt-2">
              本サイトは株主優待の到着日・使用シーンを共有する目的のサービスであり、特定銘柄の購入・売却を推奨するものではありません。投資判断は必ずご自身の責任で行ってください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">優待情報の正確性</h2>
            <p className="mt-2">
              本サイトに掲載されている株主優待の内容・最低株数・権利確定月などは、ユーザー投稿および公開情報に基づき記載しています。最新かつ正確な情報は、必ず該当企業のIRページ・公式リリースをご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">到着日予測の精度</h2>
            <p className="mt-2">
              次回到着予測はユーザー投稿の集計から計算した目安です。実際の到着日を保証するものではありません。配送状況、企業側の発送スケジュール、ユーザーの保有株数・住所などにより到着日は変動します。
              統計処理では、明らかに外れた日付を除外する場合があり、その件数は画面に表示します。収集・保存の透明性については
              <Link href="/faq#data-transparency" className="text-blue-600 hover:underline">
                よくある質問・FAQ
              </Link>
              をご参照ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">損害の補償</h2>
            <p className="mt-2">
              本サイトの情報に基づいて生じた損害（投資損失、優待の未着、誤った認識による意思決定など）について、運営は一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">外部リンク</h2>
            <p className="mt-2">
              本サイトから他のウェブサイトへのリンクが含まれる場合がありますが、リンク先の内容については保証いたしません。
            </p>
          </section>

          <section className="rounded-xl bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">投資は自己責任です。</p>
            <p className="mt-1">
              優待目当ての投資であっても、株価変動や上場廃止のリスクを伴います。各種情報を踏まえ、ご自身の判断と責任のもとで投資をご検討ください。
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
