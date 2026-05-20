"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";
import {
  loadFavoriteCodes,
  removeFavoriteCode,
} from "@/app/lib/favoritesClient";
import {
  loadReportsForStock,
} from "@/app/lib/reportsClient";
import { computeArrivalForecast, formatMonthDay } from "@/app/lib/forecastClient";
import { loadBenefitForStock } from "@/app/lib/benefitsClient";
import {
  isUserRegistered,
  loadNotificationSettings,
  loadProfile,
  registerUser,
  saveNotificationSettings,
  saveProfile,
  clampNotificationThreshold,
  NOTIFICATION_THRESHOLD_MAX,
  NOTIFICATION_THRESHOLD_MIN,
  type NotificationSettings,
  type UserProfile,
} from "@/app/lib/profileClient";
import {
  loadHoldings,
  parseRightsMonths,
  setHoldingShares,
  type Holdings,
} from "@/app/lib/holdingsClient";
import { downloadBackupFile, importBackup } from "@/app/lib/backupClient";
import AuthSection from "@/app/components/AuthSection";
import PrefectureSelect from "@/app/components/PrefectureSelect";
import MyPostsSection from "@/app/mypage/MyPostsSection";
import {
  collectUpcomingNotifiables,
  getNotificationPermission,
  requestNotificationPermission,
  triggerUpcomingArrivalNotifications,
  type NotificationPermissionState,
} from "@/app/lib/notificationsClient";
import { getEffectiveConfidence, type StockBenefit } from "@/app/data/stockBenefits";
import { approxNextArrivalFromRightsMonth } from "@/app/lib/rightsArrivalApprox";
import {
  computeHoldingRows,
  computeWatchingRows,
  type StockRow,
} from "@/app/mypage/holdingRowsModel";
import { StockRowList } from "@/app/mypage/MyStockRowList";

const HOLDINGS_PREVIEW_LIMIT = 5;

const formatJapaneseDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export default function MyPage() {
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    joinedAt: new Date().toISOString(),
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    enabled: true,
    threshold: 7,
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [draftRegion, setDraftRegion] = useState("");
  const [myPostsCount, setMyPostsCount] = useState(0);
  const [holdings, setHoldings] = useState<Holdings>({});
  const [backupMessage, setBackupMessage] = useState("");
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermissionState>("default");
  const [notifMessage, setNotifMessage] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerRegion, setRegisterRegion] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerAgreed, setRegisterAgreed] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  useEffect(() => {
    const customStocks = loadCustomStocks();
    setStocks(mergeStocks(getDefaultStocks(), customStocks));
    setFavoriteCodes(loadFavoriteCodes());
    const loaded = loadProfile();
    setProfile(loaded);
    setDraftName(loaded.displayName);
    setDraftRegion(loaded.region ?? "");
    setNotifications(loadNotificationSettings());
    setHoldings(loadHoldings());
    setNotifPermission(getNotificationPermission());

    // ヘッダーから #register / #login で来た時に該当セクションへスクロール
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
  }, []);

  /**
   * 各月セルには「優待が届く目安」の属する暦月で銘柄を並べる（権利確定月ベースではない）。
   * 到着報告からの予測があれば forecast の各サイクル、無ければ権利月末＋約3か月後（/calendar と同様）。
   */
  const yearCalendar = useMemo(() => {
    const byCode = new Map(stocks.map((s) => [s.code, s]));
    const buckets: Record<
      number,
      Array<{ stock: StockRecord; benefit: StockBenefit; shares: number; eligible: boolean }>
    > = {};
    for (let m = 1; m <= 12; m += 1) {
      buckets[m] = [];
    }

    const now = new Date();

    const addToBucket = (
      calendarMonth: number,
      item: {
        stock: StockRecord;
        benefit: StockBenefit;
        shares: number;
        eligible: boolean;
      }
    ) => {
      const list = buckets[calendarMonth];
      if (!list.some((row) => row.stock.code === item.stock.code)) {
        list.push(item);
      }
    };

    for (const [code, shares] of Object.entries(holdings)) {
      const stock = byCode.get(code);
      if (!stock) continue;
      const benefit = loadBenefitForStock(code);
      if (!benefit) continue;
      if (getEffectiveConfidence(benefit) === "abolished") continue;

      const eligible = (benefit.minShares ?? 0) === 0 ? true : shares >= benefit.minShares;
      const row = { stock, benefit, shares, eligible };

      const forecast = computeArrivalForecast(loadReportsForStock(code), {
        benefit,
      });

      if (forecast) {
        for (const cycle of forecast.cycles) {
          const m = cycle.nextEstimate.getMonth() + 1;
          addToBucket(m, row);
        }
      } else {
        const rightsMonthsParsed = parseRightsMonths(benefit.rightsMonths);
        for (const rm of rightsMonthsParsed) {
          const when = approxNextArrivalFromRightsMonth(rm, now);
          addToBucket(when.getMonth() + 1, row);
        }
      }
    }
    return buckets;
  }, [holdings, stocks]);

  const totalEligibleStocks = useMemo(() => {
    const set = new Set<string>();
    for (const list of Object.values(yearCalendar)) {
      for (const item of list) {
        if (item.eligible) set.add(item.stock.code);
      }
    }
    return set.size;
  }, [yearCalendar]);

  const handleExport = () => {
    downloadBackupFile();
    setBackupMessage(`バックアップを保存しました（${new Date().toLocaleTimeString("ja-JP")}）。`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const count = importBackup(parsed);
      setBackupMessage(`${count}件のデータを復元しました。ページを再読み込みします。`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setBackupMessage(
        `復元に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`
      );
    } finally {
      event.target.value = "";
    }
  };

  const holdingRows = useMemo<StockRow[]>(
    () => computeHoldingRows(holdings, stocks),
    [holdings, stocks]
  );

  const holdingPreviewRows = useMemo(
    () => holdingRows.slice(0, HOLDINGS_PREVIEW_LIMIT),
    [holdingRows]
  );

  const watchingRows = useMemo<StockRow[]>(
    () => computeWatchingRows(favoriteCodes, holdings, stocks),
    [favoriteCodes, holdings, stocks]
  );

  const holdingCount = holdingRows.length;
  const watchingCount = watchingRows.length;

  const removeWatching = (code: string) => {
    const next = favoriteCodes.filter((c) => c !== code);
    setFavoriteCodes(next);
    removeFavoriteCode(code);
  };

  const removeHolding = (code: string) => {
    const name = stocks.find((s) => s.code === code)?.name ?? code;
    if (
      !confirm(
        `「${name}（${code}）」を保有銘柄から外しますか？\n株数の登録が消え、年間カレンダーなどの表示からも外れます。`
      )
    ) {
      return;
    }
    const next = setHoldingShares(code, 0);
    setHoldings(next);
  };

  const startEditName = () => {
    setDraftName(profile.displayName);
    setIsEditingName(true);
  };

  const saveName = () => {
    const next = { ...profile, displayName: draftName.trim() || "ゲスト" };
    setProfile(next);
    saveProfile(next);
    setIsEditingName(false);
  };

  const startEditRegion = () => {
    setDraftRegion(profile.region ?? "");
    setIsEditingRegion(true);
  };

  const saveRegion = () => {
    const trimmed = draftRegion.trim();
    const next: UserProfile = { ...profile, region: trimmed || undefined };
    setProfile(next);
    saveProfile(next);
    setIsEditingRegion(false);
  };

  const updateNotifications = (patch: Partial<NotificationSettings>) => {
    const next: NotificationSettings = {
      ...notifications,
      ...patch,
      threshold:
        patch.threshold !== undefined
          ? clampNotificationThreshold(patch.threshold)
          : notifications.threshold,
    };
    setNotifications(next);
    saveNotificationSettings(next);
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      setNotifMessage("通知が許可されました。テスト送信を試せます。");
    } else if (result === "denied") {
      setNotifMessage("通知がブロックされています。ブラウザの設定から変更してください。");
    }
  };

  const handleTestNotification = async () => {
    const { fired, skipped, reason } = await triggerUpcomingArrivalNotifications();
    if (fired > 0) {
      setNotifMessage(`通知を${fired}件送信しました（24時間以内に同銘柄は再送されません）。`);
    } else if (reason === "no-upcoming") {
      setNotifMessage("対象となる「もうすぐ届きそう」な保有銘柄がありません。");
    } else if (reason === "no-permission") {
      setNotifMessage("通知が許可されていません。「通知を許可する」を先に押してください。");
    } else if (reason === "disabled") {
      setNotifMessage("通知が無効になっています。スイッチをオンにしてください。");
    } else if (reason === "unsupported") {
      setNotifMessage("このブラウザは通知に対応していません。");
    } else {
      setNotifMessage(`送信なし（既に通知済み: ${skipped}件）`);
    }
  };

  const upcomingNotifyCount = useMemo(() => {
    return collectUpcomingNotifiables(notifications.threshold, holdings).length;
  }, [holdings, notifications.threshold]);

  const registered = isUserRegistered(profile);

  const handleRegister = async () => {
    const name = registerName.trim();
    if (!name) {
      setRegisterError("表示名を入力してください。");
      return;
    }
    if (!registerAgreed) {
      setRegisterError("編集ガイドラインへの同意が必要です。");
      return;
    }

    setRegisterError("");
    setRegisterMessage("");
    setRegisterSubmitting(true);

    const next = registerUser({
      displayName: name,
      region: registerRegion.trim() || undefined,
    });
    setProfile(next);
    setDraftName(next.displayName);
    setDraftRegion(next.region ?? "");

    const email = registerEmail.trim();
    let emailNote = "";
    if (email) {
      try {
        const { signInWithMagicLink } = await import("@/app/lib/authClient");
        const result = await signInWithMagicLink(email);
        if (result.ok) {
          emailNote =
            "📧 確認メールを送信しました。受信トレイ（迷惑メールフォルダもご確認ください）のリンクをクリックすると、メールアドレスでの本会員連携が完了します。";
        } else {
          emailNote = `メール連携の送信に失敗しました: ${result.error}（登録自体は完了しています。あとからメール連携も可能です）`;
        }
      } catch (err) {
        console.warn("[register] magic link failed:", err);
        emailNote =
          "メール連携の送信中にエラーが発生しました。登録自体は完了しています。あとからメール連携も可能です。";
      }
    }

    setRegisterMessage(
      emailNote ||
        "✅ 会員登録が完了しました。表示名や地域はプロフィールから編集できます。"
    );
    setRegisterName("");
    setRegisterRegion("");
    setRegisterEmail("");
    setRegisterAgreed(false);
    setRegisterSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-slate-900">マイページ</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <button
              type="button"
              className="rounded-full p-2 hover:bg-slate-100"
              aria-label="通知へ"
              onClick={() => {
                const el = document.getElementById("notifications");
                if (el instanceof HTMLDetailsElement) {
                  el.open = true;
                }
                el?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              🔔
            </button>
            <button type="button" className="rounded-full p-2 hover:bg-slate-100" aria-label="メニュー">
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-8">
        {!registered && (
          <section
            id="register"
            className="mb-6 scroll-mt-20 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-2xl">
                ✍️
              </span>
              <div>
                <h2 className="text-base font-bold text-blue-900">
                  会員登録（無料・1ステップ）
                </h2>
                <p className="text-xs text-blue-800">
                  登録すると、優待情報の編集ができるようになります。投稿はゲストでもOKです。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-blue-900">表示名（必須）</span>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="例: 優待マニア"
                  className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-blue-900">地域（任意）</span>
                <PrefectureSelect
                  value={registerRegion}
                  onChange={setRegisterRegion}
                  className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-medium text-blue-900">
                メールアドレス（任意・推奨）
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="例: you@example.com"
                className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm"
                disabled={registerSubmitting}
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-blue-800">
                ✨ メールアドレスを登録すると、<strong>PC ↔ スマホなど別端末</strong>
                からも同じキニナル銘柄とプロフィールが使えるようになります。
                パスワードは不要で、メールに届くリンクをクリックするだけです。
                <br />
                空欄のままでも登録できます（あとからプロフィールの「会員登録（任意）」セクションでメール連携も可能）。
              </span>
            </label>

            <label className="mt-4 flex items-start gap-2 text-xs text-blue-900">
              <input
                type="checkbox"
                checked={registerAgreed}
                onChange={(e) => setRegisterAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <Link href="/terms" className="text-blue-700 underline">
                  利用規約
                </Link>
                ・
                <Link href="/disclaimer" className="text-blue-700 underline">
                  免責事項
                </Link>
                を確認し、優待情報を編集する場合は公式IR等で確認した正確な情報のみを登録することに同意します。
              </span>
            </label>

            {registerError && (
              <p className="mt-2 text-xs text-rose-700">{registerError}</p>
            )}
            {registerMessage && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {registerMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleRegister}
              disabled={registerSubmitting}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {registerSubmitting
                ? "登録中..."
                : registerEmail.trim()
                  ? "会員登録して📧確認メールを送信"
                  : "会員登録する"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-blue-700">
              ※ メールなしで登録した場合は、この端末内に情報を保存する簡易登録になります。あとからメール連携を追加することもできます。
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-base"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-slate-900">
                    {profile.displayName} <span className="text-sm font-normal text-slate-500">さん</span>
                  </p>
                  {registered ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      ✓ 会員
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      ゲスト
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={startEditName}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    編集
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500">
                {registered && profile.registeredAt
                  ? `会員登録日: ${formatJapaneseDate(profile.registeredAt)}`
                  : "未登録（ゲスト利用中）"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">地域:</span>
                {isEditingRegion ? (
                  <div className="flex flex-1 items-center gap-2">
                    <PrefectureSelect
                      value={draftRegion}
                      onChange={setDraftRegion}
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={saveRegion}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white"
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-slate-700">
                      {profile.region ? profile.region : "未登録"}
                    </span>
                    <button
                      type="button"
                      onClick={startEditRegion}
                      className="text-blue-600 hover:underline"
                    >
                      編集
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                ※ 地域を登録すると「届いた！」投稿時に初期値として表示されます（任意）
              </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatBlock
              label="保有銘柄"
              value={holdingCount}
              unit="件"
              href={holdingCount > 0 ? "/mypage/holdings" : "#my-holdings"}
            />
            <StatBlock
              label="キニナル"
              value={watchingCount}
              unit="件"
              href="#my-watchlist"
            />
            <StatBlock
              label="投稿件数"
              value={myPostsCount}
              unit="件"
              href="#my-posts"
            />
          </div>
        </section>

        <MyPostsSection profile={profile} onCountChange={setMyPostsCount} />

        <div id="login" className="scroll-mt-20">
          <AuthSection />
        </div>

        <section id="my-holdings" className="mt-6 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="text-lg font-bold text-slate-900">保有銘柄の到着状況</h2>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              {holdingRows.length > HOLDINGS_PREVIEW_LIMIT ? (
                <Link
                  href="/mypage/holdings"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  一覧（全{holdingRows.length}件）›
                </Link>
              ) : null}
              <Link href="/search" className="text-xs text-blue-600 hover:underline">
                銘柄を探す ›
              </Link>
            </div>
          </div>
          {holdingRows.length > HOLDINGS_PREVIEW_LIMIT ? (
            <p className="mt-1 text-[11px] text-slate-500">
              到着投稿の予測日が近い順の先頭{HOLDINGS_PREVIEW_LIMIT}件です。投稿が無い銘柄は企業案内・一般的な目安で並びます。
            </p>
          ) : null}

          {holdingRows.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              まだ保有銘柄がありません。<br />
              詳細ページの <span className="font-semibold text-blue-600">＋ 保有銘柄に追加</span> から株数を登録しましょう。
            </p>
          ) : (
            <>
              <StockRowList
                rows={holdingPreviewRows}
                variant="holding"
                onRemove={removeHolding}
              />
              {holdingRows.length > HOLDINGS_PREVIEW_LIMIT ? (
                <div className="mt-4 text-center">
                  <Link
                    href="/mypage/holdings"
                    className="inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    あと{holdingRows.length - HOLDINGS_PREVIEW_LIMIT}件を含む全{holdingRows.length}
                    件を保有銘柄一覧で見る ›
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section id="my-watchlist" className="mt-8 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              ☆ キニナル銘柄
              <span className="ml-2 text-xs font-normal text-slate-500">
                （まだ持ってないけど気になる株のウォッチリスト）
              </span>
            </h2>
            <Link href="/search" className="text-xs text-blue-600 hover:underline">
              銘柄を探す ›
            </Link>
          </div>

          {watchingRows.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              キニナル銘柄はまだありません。<br />
              気になる銘柄の詳細ページで <span className="font-semibold text-sky-700">☆ キニナルに追加</span> をどうぞ。
            </p>
          ) : (
            <StockRowList
              rows={watchingRows}
              variant="watching"
              onRemove={removeWatching}
            />
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">年間優待カレンダー</h2>
            <span className="text-xs text-slate-500">
              保有銘柄から自動集計: {totalEligibleStocks}件が優待対象
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            権利確定月ではなく、優待が届く目安の月に並べています。届いた報告がある銘柄はその傾向に基づき、無い銘柄は権利確定月末からおよそ3か月後を目安に配置します。
            保有株数は各銘柄の詳細ページの「＋ 保有銘柄に追加」から登録できます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const items = yearCalendar[month];
              return (
                <div
                  key={month}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-bold text-slate-700">{month}月</p>
                  {items.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">予定なし</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {items.map(({ stock, benefit, shares, eligible }) => (
                        <li key={stock.code} className="text-xs">
                          <Link
                            href={`/stock/${stock.code}`}
                            className="block rounded-lg bg-white p-2 hover:bg-blue-50"
                          >
                            <p className="font-medium text-slate-900">
                              {stock.code} {stock.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                              {benefit.content}
                            </p>
                            <p className="mt-0.5 text-[11px]">
                              <span className="text-slate-500">{shares.toLocaleString("ja-JP")}株 保有</span>
                              <span
                                className={`ml-1 ${
                                  eligible ? "text-emerald-600" : "text-slate-500"
                                }`}
                              >
                                {eligible ? "・対象" : "・株数不足"}
                              </span>
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <details
          id="notifications"
          className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="cursor-pointer list-none px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-lg font-bold text-slate-900">通知・バックアップ</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              到着通知やJSONの退避。投稿には不要なので、あとからで大丈夫です。
            </span>
          </summary>
          <div className="space-y-8 border-t border-slate-100 px-5 pb-6 pt-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">データのバックアップ/復元</h3>
              <p className="mt-1 text-xs text-slate-500">
                保有銘柄・キニナル・投稿・優待情報などをまとめて保存できます。
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                >
                  エクスポート（JSON）
                </button>
                <label className="inline-block cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  復元（JSON選択）
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
              {backupMessage && (
                <p className="mt-2 text-xs text-emerald-700">{backupMessage}</p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                ※ 別のPC・ブラウザでも同じ状態を再現したいときに使えます。
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">通知</h3>
              <p className="mt-1 text-xs text-slate-500">
                保有銘柄の届く目安が近づいたときだけ、ブラウザ通知します。
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-600">
                <span>
                  ブラウザ:
                  <span
                    className={`ml-1 font-semibold ${
                      notifPermission === "granted"
                        ? "text-emerald-700"
                        : notifPermission === "denied"
                          ? "text-rose-700"
                          : "text-slate-700"
                    }`}
                  >
                    {notifPermission === "granted"
                      ? "許可済み"
                      : notifPermission === "denied"
                        ? "ブロック中"
                        : notifPermission === "unsupported"
                          ? "非対応"
                          : "未設定"}
                  </span>
                </span>
                {(notifPermission === "default" || notifPermission === "denied") && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                  >
                    許可を求める
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-700">通知を出す</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications.enabled}
                  onClick={() => updateNotifications({ enabled: !notifications.enabled })}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    notifications.enabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition ${
                      notifications.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className="shrink-0">予想到着の</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={NOTIFICATION_THRESHOLD_MIN}
                    max={NOTIFICATION_THRESHOLD_MAX}
                    step={1}
                    value={notifications.threshold}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      updateNotifications({ threshold: clampNotificationThreshold(v) });
                    }}
                    className="w-14 shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-sm tabular-nums"
                  />
                  <span className="text-xs text-slate-600">
                    日前から（{NOTIFICATION_THRESHOLD_MIN}〜{NOTIFICATION_THRESHOLD_MAX}日・1日単位）
                  </span>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                >
                  テスト送信
                </button>
                <span className="text-xs text-slate-500">
                  対象 {upcomingNotifyCount}件（あと{notifications.threshold}日以内の目安）
                </span>
              </div>
              {notifMessage && (
                <p className="mt-2 text-xs text-emerald-700">{notifMessage}</p>
              )}

              <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                ※ 端末の通知設定がオフのときは届きません。同じ銘柄は24時間に1回までです。
              </p>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}

function StatBlock({
  label,
  value,
  unit,
  href,
}: {
  label: string;
  value: number;
  unit: string;
  href?: string;
}) {
  const countText = `${value.toLocaleString("ja-JP")}${unit}`;
  const valueBlock = (
    <p className="text-2xl font-extrabold tabular-nums tracking-tight">
      {value.toLocaleString("ja-JP")}
      <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
    </p>
  );

  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1">
        {href ? (
          <Link
            href={href}
            className="-mx-1 block rounded-lg px-1 py-0.5 text-slate-900 outline-offset-2 transition hover:bg-slate-200/70 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label={`${label}の一覧へ（${countText}）`}
          >
            {valueBlock}
          </Link>
        ) : (
          <div className="text-slate-900">{valueBlock}</div>
        )}
      </div>
    </div>
  );
}
