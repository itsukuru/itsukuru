"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavKey = "home" | "search" | "mypage";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  key: NavKey;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: "🏠", key: "home" },
  { href: "/#stock-search", label: "検索", icon: "🔍", key: "search" },
  { href: "/mypage", label: "マイページ", icon: "👤", key: "mypage" },
];

function useLocationHash() {
  const pathname = usePathname() ?? "/";
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => {
      setHash(typeof window !== "undefined" ? window.location.hash : "");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  return { pathname, hash };
}

const isActive = (key: NavKey, pathname: string, hash: string) => {
  if (key === "home") {
    return pathname === "/" && hash !== "#stock-search";
  }
  if (key === "search") {
    return pathname.startsWith("/search") || hash === "#stock-search";
  }
  if (key === "mypage") {
    return pathname.startsWith("/mypage");
  }
  return false;
};

export default function BottomNav() {
  const { pathname, hash } = useLocationHash();

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden pb-safe"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.key, pathname, hash);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] transition active:scale-95 ${
                  active ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
