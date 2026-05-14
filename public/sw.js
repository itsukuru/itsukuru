/**
 * いつクル？ Service Worker
 * ──────────────────────────────────────────────────────────
 * 静的アイコン類のキャッシュ優先 + 通知ハンドラー。
 *
 * 設計方針:
 *   - 静的アセット (/icon.svg, /manifest.webmanifest) はキャッシュ優先で高速化
 *   - HTML（ナビゲーション）はキャッシュしない（デプロイ後の旧 HTML + 新チャンクで白画面化を防ぐ）
 *   - `/_next/*` と `/api/*` は一切介入しない
 *   - 通知クリックで該当銘柄ページへ遷移
 *   - クライアントから postMessage で通知をスケジュール可能
 */

/** 挙動変更時は必ずバンプ（古い SW が HTML を握り続けないようにする） */
const CACHE_NAME = "itsukuru-v2";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Supabase API はキャッシュしない
  if (url.hostname.endsWith("supabase.co")) return;

  // Next.js のビルド成果物・HMR・API は一切介入しない（誤キャッシュで白画面になるのを防ぐ）
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) {
    return;
  }

  // 静的アセットはキャッシュ優先
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // ドキュメントはネットワークのみ（HTML を SW で抱えるとデプロイ後に旧 HTML + 新チャンクで壊れやすい）
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
  }
});

/**
 * クライアントから通知をスケジュールするための postMessage ハンドラー。
 *   action: "schedule-notification"
 *   title, body, tag, url, when (epoch ms)
 *
 * Service Worker は eval や setTimeout の長時間タイマーが OS によって
 * 停止されるため、当面はクライアント側で setTimeout を持ち、満了時に
 * showNotification を呼ぶ単純実装。SW はその受け口として動く。
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.action === "show-notification") {
    const { title, body, tag, url } = data;
    self.registration.showNotification(title || "いつクル？", {
      body: body || "",
      tag: tag || "itsukuru-notify",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: url || "/" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
