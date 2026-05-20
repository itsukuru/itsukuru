import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size="sm" />
            <p className="mt-2 text-xs text-slate-500">
              株主優待の「届いた！」と「使った！」を共有するコミュニティ
            </p>
          </div>
          <nav aria-label="フッターリンク" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <Link href="/#stock-search" className="hover:underline">
              銘柄検索
            </Link>
            <Link href="/faq" className="hover:underline">
              よくある質問・FAQ
            </Link>
            <Link href="/about" className="hover:underline">
              いつクル？とは
            </Link>
            <Link href="/contact" className="hover:underline">
              お問い合わせ・通報
            </Link>
            <Link href="/terms" className="hover:underline">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:underline">
              プライバシーポリシー
            </Link>
            <Link href="/disclaimer" className="hover:underline">
              免責事項
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-[11px] text-slate-400">
          ※ 当サイトは投資助言を行うものではありません。投資は自己責任でお願いします。
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          © {new Date().getFullYear()} いつクル？ All rights reserved.
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          掲載情報・投稿・文章・画面構成の無断転載、機械的取得、再配布を禁止します。
        </p>
      </div>
    </footer>
  );
}
