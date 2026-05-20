"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import HeaderStockSearch from "./HeaderStockSearch";
import { isUserRegistered, loadProfile } from "@/app/lib/profileClient";
import { SITE_TAGLINE_SECONDARY } from "@/app/lib/siteConfig";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/search",
    label: "詳細銘柄検索",
    match: (p) => p.startsWith("/search"),
  },
];

export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    if (typeof window === "undefined") return;
    const profile = loadProfile();
    setRegistered(isUserRegistered(profile));
    setDisplayName(profile.displayName || "");
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-30 w-full overflow-visible border-b bg-white/95 backdrop-blur transition-colors ${
        scrolled
          ? "border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-2.5 sm:px-6 sm:py-3">
        {/* モバイル: 1行（ロゴ → キャッチ → コンパクト検索 → メニュー） */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div className="shrink-0">
              <Logo size="sm" />
            </div>
            <p
              className="min-w-0 max-w-[min(11rem,46vw)] shrink truncate text-[10px] font-semibold leading-tight text-slate-600 sm:text-[11px]"
              title={SITE_TAGLINE_SECONDARY}
            >
              {SITE_TAGLINE_SECONDARY}
            </p>
            <div className="min-w-0 flex-1 basis-0 overflow-visible">
              <HeaderStockSearch
                inputId="header-stock-search-mobile"
                compact
                className="w-full min-w-0"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 sm:h-9 sm:w-9"
            aria-label="メニューを開く"
            aria-expanded={menuOpen}
          >
            <span aria-hidden className="text-base leading-none">
              {menuOpen ? "✕" : "≡"}
            </span>
          </button>
        </div>

        {/* md+: 1行レイアウト */}
        <div className="hidden items-center justify-between gap-2 sm:gap-3 md:flex">
          <div className="flex min-w-0 flex-none items-center gap-2 md:max-w-xs lg:max-w-sm">
            <Logo size="md" />
            <p className="text-xs font-semibold leading-snug text-slate-600 lg:text-sm">
              {SITE_TAGLINE_SECONDARY}
            </p>
          </div>

          <div className="mx-3 flex min-w-0 flex-1 items-center justify-center gap-3 overflow-visible">
            <HeaderStockSearch
              inputId="header-stock-search-desktop"
              className="w-full max-w-[14rem] lg:max-w-xs xl:max-w-sm"
            />
            <nav className="flex shrink-0 items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition lg:px-3 ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {registered ? (
              <Link
                href="/mypage"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {(displayName || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate">{displayName || "マイページ"}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/mypage#login"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  ログイン
                </Link>
                <Link
                  href="/mypage#register"
                  className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 sm:px-4"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex w-full max-w-5xl flex-col gap-0.5 px-3 py-2">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  <span aria-hidden className="text-slate-400">
                    ›
                  </span>
                </Link>
              );
            })}
            <div className="mt-1 border-t border-slate-100 pt-1" />
            {registered ? (
              <Link
                href="/mypage"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    {(displayName || "?").slice(0, 1).toUpperCase()}
                  </span>
                  {displayName || "マイページ"}
                </span>
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/mypage#register"
                  className="flex items-center justify-between rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-bold text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>✍️</span>
                    新規登録
                  </span>
                  <span aria-hidden>›</span>
                </Link>
                <Link
                  href="/mypage#login"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>🔑</span>
                    ログイン
                  </span>
                  <span aria-hidden className="text-slate-400">
                    ›
                  </span>
                </Link>
                <Link
                  href="/mypage"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>👤</span>
                    マイページ
                  </span>
                  <span aria-hidden className="text-slate-400">
                    ›
                  </span>
                </Link>
              </>
            )}
            <Link
              href="/about"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>ℹ️</span>
                このサイトについて
              </span>
              <span aria-hidden className="text-slate-400">
                ›
              </span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>📮</span>
                お問い合わせ
              </span>
              <span aria-hidden className="text-slate-400">
                ›
              </span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
