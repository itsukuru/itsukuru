"use client";

import { useEffect } from "react";
import { startNotificationWatcher } from "@/app/lib/notificationsClient";

/**
 * ブラウザ通知のウォッチャーを起動するだけのクライアントコンポーネント。
 * layout 直下に1つ置いておけば、保有銘柄の優待到着が近い場合に
 * フォアグラウンド復帰時や定期チェックで通知が飛ぶ。
 */
export default function NotificationWatcher() {
  useEffect(() => {
    const stop = startNotificationWatcher();
    return stop;
  }, []);
  return null;
}
