import {
  clampNotificationThreshold,
  loadProfile,
  loadNotificationSettings,
} from "./profileClient";
import { computeArrivalForecast } from "./forecastClient";
import { loadReportsForStock } from "./reportsClient";
import { loadHoldings, type Holdings } from "./holdingsClient";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
} from "./stocksClient";

const LAST_NOTIFIED_KEY = "notify-last-sent:v1";
const ONE_DAY_MS = 86_400_000;

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export const getNotificationPermission = (): NotificationPermissionState => {
  if (typeof window === "undefined") return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (typeof window === "undefined") return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return "denied";
  }
};

type LastNotifiedMap = Record<string, number>;

const loadLastNotified = (): LastNotifiedMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LAST_NOTIFIED_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LastNotifiedMap;
  } catch {
    return {};
  }
};

const saveLastNotified = (map: LastNotifiedMap) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(map));
};

export type UpcomingNotifiable = {
  code: string;
  name: string;
  daysUntil: number;
  estimate: Date;
};

export const collectUpcomingNotifiables = (
  thresholdDays: number,
  holdingsOverride?: Holdings
): UpcomingNotifiable[] => {
  const holdings = holdingsOverride ?? loadHoldings();
  const codes = Object.entries(holdings)
    .filter(([, shares]) => shares > 0)
    .map(([code]) => code);
  if (codes.length === 0) return [];

  const stocks = mergeStocks(getDefaultStocks(), loadCustomStocks());
  const byCode = new Map(stocks.map((s) => [s.code, s]));

  const upcoming: UpcomingNotifiable[] = [];
  for (const code of codes) {
    const stock = byCode.get(code);
    if (!stock) continue;
    const forecast = computeArrivalForecast(loadReportsForStock(code));
    if (!forecast) continue;
    if (forecast.daysUntil < 0) continue;
    if (forecast.daysUntil > thresholdDays) continue;
    upcoming.push({
      code,
      name: stock.name,
      daysUntil: forecast.daysUntil,
      estimate: forecast.nextEstimate,
    });
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
};

/**
 * Service Worker 経由でリッチ通知を発火する。
 * SW が未登録なら通常の Notification API にフォールバック。
 */
const showRichNotification = async (params: {
  title: string;
  body: string;
  tag: string;
  url: string;
}): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        await reg.showNotification(params.title, {
          body: params.body,
          tag: params.tag,
          icon: "/icon.svg",
          badge: "/icon.svg",
          data: { url: params.url },
        });
        return true;
      }
    }
    new Notification(params.title, {
      body: params.body,
      tag: params.tag,
      icon: "/icon.svg",
    });
    return true;
  } catch {
    return false;
  }
};

export const triggerUpcomingArrivalNotifications = async (): Promise<{
  fired: number;
  skipped: number;
  reason?: string;
}> => {
  if (typeof window === "undefined") {
    return { fired: 0, skipped: 0, reason: "no-window" };
  }
  if (typeof Notification === "undefined") {
    return { fired: 0, skipped: 0, reason: "unsupported" };
  }
  const settings = loadNotificationSettings();
  if (!settings.enabled) {
    return { fired: 0, skipped: 0, reason: "disabled" };
  }
  if (Notification.permission !== "granted") {
    return { fired: 0, skipped: 0, reason: "no-permission" };
  }

  // 予想到着日までの日数がこの値以下の保有銘柄を通知対象にする（1〜30日）。
  const daysThreshold = clampNotificationThreshold(settings.threshold);
  const upcoming = collectUpcomingNotifiables(daysThreshold);
  if (upcoming.length === 0) {
    return { fired: 0, skipped: 0, reason: "no-upcoming" };
  }

  const lastNotified = loadLastNotified();
  const now = Date.now();
  const profile = loadProfile();
  let fired = 0;
  let skipped = 0;

  for (const item of upcoming) {
    const last = lastNotified[item.code] ?? 0;
    if (now - last < ONE_DAY_MS) {
      skipped += 1;
      continue;
    }
    const ok = await showRichNotification({
      title: `🎁 まもなく届きそう: ${item.name}`,
      body: `${profile.displayName}さんの保有銘柄「${item.name}」の優待は、あと${item.daysUntil}日（${item.estimate.getMonth() + 1}/${item.estimate.getDate()}）に届く見込みです。`,
      tag: `arrival:${item.code}`,
      url: `/stock/${item.code}`,
    });
    if (ok) {
      lastNotified[item.code] = now;
      fired += 1;
    } else {
      skipped += 1;
    }
  }

  saveLastNotified(lastNotified);
  return { fired, skipped };
};

/**
 * ブラウザのフォアグラウンド復帰時に発火するチェック。
 * 「アプリを開くと自動で通知が出る」を実現するため、layout 直下で1回登録する。
 */
export const startNotificationWatcher = (): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const fire = async () => {
    try {
      await triggerUpcomingArrivalNotifications();
    } catch (err) {
      console.warn("[notify] watcher error:", err);
    }
  };

  // 起動直後にも一度発火（5秒後）
  const initialTimer = window.setTimeout(fire, 5000);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void fire();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // 4時間ごとにも発火（PWAで長時間開きっぱなしのケース）
  const intervalId = window.setInterval(fire, 4 * 60 * 60 * 1000);

  return () => {
    window.clearTimeout(initialTimer);
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};
