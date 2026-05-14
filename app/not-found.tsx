import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりませんでした",
  description:
    "お探しのページは存在しないか、移動・削除された可能性があります。トップページまたは銘柄検索からお探しください。",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-blue-100 text-4xl">
          🔍
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-blue-600">
          404 Not Found
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          ページが見つかりませんでした
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          お探しのページは移動・削除されたか、URL が間違っている可能性があります。
          下記から再度お探しください。
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href="/"
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
          >
            🏠 ホームへ
          </Link>
          <Link
            href="/#stock-search"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
          >
            🔍 銘柄を検索
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-left">
          <p className="text-xs font-semibold text-slate-700">よくアクセスされるページ</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link href="/#stock-search" className="text-blue-700 hover:underline">
                🔍 トップの検索欄で銘柄を探す
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-blue-700 hover:underline">
                ❓ よくある質問
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-blue-700 hover:underline">
                💡 いつクル？とは
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-blue-700 hover:underline">
                📩 お問い合わせ・通報
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
