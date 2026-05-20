"use client";

/**
 * 現在はサイトから読み込んでいません（ブラウザの「ホーム画面に追加」施策をいったん停止）。
 * 再開するとき: HomePageClient にこのコンポーネントと import を戻し、layout.tsx の metadata に
 * `manifest` / `appleWebApp` と `other` 内のモバイル向けメタタグを復元してください。
 */

import { useEffect, useState } from "react";

/**
 * iOS Safari は beforeinstallprompt を発火しないため、
 * その代わり「ホーム画面に追加」の案内を独自に出す必要がある。
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "install-prompt-dismissed-at:v1";
const REMIND_AFTER_DAYS = 14;

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
};

const wasRecentlyDismissed = (): boolean => {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return ageDays < REMIND_AFTER_DAYS;
};

/**
 * PWA インストールプロンプト。
 * - Chrome/Edge: beforeinstallprompt を捕捉してネイティブダイアログ起動
 * - iOS Safari: 「ホーム画面に追加」操作ガイドを表示
 * - 一度閉じたら 2 週間は再表示しない
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOS()) {
      const timer = setTimeout(() => {
        if (!isStandalone() && !wasRecentlyDismissed()) {
          setShowIOSGuide(true);
          setVisible(true);
        }
      }, 8000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    if (typeof window !== "undefined" && choice.outcome === "dismissed") {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-3 md:bottom-6">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xl">
            📱
          </div>
          <div className="min-w-0 flex-1">
            {showIOSGuide ? (
              <>
                <div className="text-sm font-bold">
                  ホーム画面に追加してアプリのように使う
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-200">
                  画面下の <span className="font-bold">共有ボタン</span>{" "}
                  をタップ →{" "}
                  <span className="font-bold">「ホーム画面に追加」</span> を選択
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold">いつクル？をインストール</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-200">
                  ホーム画面から1タップで起動。通知も受け取れます。
                </div>
              </>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {!showIOSGuide && deferred && (
                <button
                  type="button"
                  onClick={install}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-200"
                >
                  インストール
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
              >
                あとで
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
