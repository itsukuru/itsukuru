"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  PHASE_META,
  getEffectivePhase,
  type BenefitReport,
  type ReportPhase,
} from "@/app/data/benefitReports";
import {
  formatRelativeTime,
  formatCalendarDateJa,
  getTodayIsoDate,
} from "@/app/lib/reportsClient";
import { isUserRegistered, loadProfile } from "@/app/lib/profileClient";
import {
  cooldownRemainingMs,
  isOwnPost,
  markOwnPost,
  POST_COOLDOWN_MS,
} from "@/app/lib/ownPostsClient";
import HelpfulButton from "@/app/components/HelpfulButton";
import PostImage from "@/app/components/PostImage";
import DateYyyymmddField from "@/app/components/DateYyyymmddField";
import PrefectureSelect from "@/app/components/PrefectureSelect";

type Props = {
  stockCode: string;
  reports: BenefitReport[];
  onAddReport: (report: BenefitReport) => void;
  onUpdateReport?: (reportId: string, patch: Partial<BenefitReport>) => void;
  onDeleteReport?: (reportId: string) => void;
};

type SortKey = "date" | "helpful";
type PhaseFilter = "all" | ReportPhase;

export default function StockReportSection({
  stockCode,
  reports,
  onAddReport,
  onUpdateReport,
  onDeleteReport,
}: Props) {
  const [reporterName, setReporterName] = useState("");
  const [region, setRegion] = useState("");
  const [arrivalDate, setArrivalDate] = useState(getTodayIsoDate);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<ReportPhase>("actual");
  const [wantsComment, setWantsComment] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const pendingDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const profile = loadProfile();
    const registered = isUserRegistered(profile);
    if (registered && profile.displayName) {
      setReporterName(profile.displayName);
    }
    if (profile.region) {
      setRegion(profile.region);
    }
    setCooldownMs(cooldownRemainingMs());
  }, []);

  useEffect(() => {
    setArrivalDate(getTodayIsoDate());
  }, [stockCode]);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const t = setInterval(() => {
      const remaining = cooldownRemainingMs();
      setCooldownMs(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownMs]);

  const filteredReports = useMemo(() => {
    if (phaseFilter === "all") return reports;
    return reports.filter((r) => getEffectivePhase(r) === phaseFilter);
  }, [reports, phaseFilter]);

  const sortedReports = useMemo(() => {
    const copy = [...filteredReports];
    if (sortKey === "helpful") {
      copy.sort((a, b) => {
        const ah = a.helpfulCount ?? 0;
        const bh = b.helpfulCount ?? 0;
        if (bh !== ah) return bh - ah;
        return b.arrivalDate.localeCompare(a.arrivalDate);
      });
    } else {
      copy.sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
    }
    return copy;
  }, [filteredReports, sortKey]);

  const phaseCounts = useMemo(() => {
    let notice = 0;
    let actual = 0;
    let pending = 0;
    for (const r of reports) {
      const p = getEffectivePhase(r);
      if (p === "notice") notice += 1;
      else if (p === "pending") pending += 1;
      else actual += 1;
    }
    return { notice, actual, pending, total: reports.length };
  }, [reports]);

  const postPending = () => {
    if (cooldownRemainingMs() > 0) {
      setCooldownMs(cooldownRemainingMs());
      return;
    }
    const newReport: BenefitReport = {
      id: crypto.randomUUID(),
      stockCode,
      arrivalDate: getTodayIsoDate(),
      reporterName: reporterName.trim() || "匿名",
      region: region.trim() || undefined,
      comment: "",
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      phase: "pending",
    };
    onAddReport(newReport);
    markOwnPost("report", newReport.id);
    setCooldownMs(POST_COOLDOWN_MS);
    const profile = loadProfile();
    setReporterName(isUserRegistered(profile) ? profile.displayName : "");
  };

  const requestPostPending = () => {
    if (cooldownRemainingMs() > 0) {
      setCooldownMs(cooldownRemainingMs());
      return;
    }
    pendingDialogRef.current?.showModal();
  };

  const cancelPostPending = () => {
    pendingDialogRef.current?.close();
  };

  const confirmPostPending = () => {
    pendingDialogRef.current?.close();
    postPending();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!arrivalDate) {
      return;
    }
    if (cooldownRemainingMs() > 0) {
      setCooldownMs(cooldownRemainingMs());
      return;
    }

    const newReport: BenefitReport = {
      id: crypto.randomUUID(),
      stockCode,
      arrivalDate,
      reporterName: reporterName.trim() || "匿名",
      region: region.trim() || undefined,
      comment: wantsComment ? comment.trim() : "",
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      phase,
    };

    onAddReport(newReport);
    markOwnPost("report", newReport.id);
    setCooldownMs(POST_COOLDOWN_MS);

    const profile = loadProfile();
    setReporterName(isUserRegistered(profile) ? profile.displayName : "");
    setComment("");
    setWantsComment(false);
    setArrivalDate(getTodayIsoDate());
    setPhase("actual");
  };

  const handleDelete = (reportId: string) => {
    if (!onDeleteReport) return;
    if (!confirm("この投稿を削除しますか？取り消しできません。")) return;
    onDeleteReport(reportId);
  };

  const handleSaveEdit = (
    reportId: string,
    patch: Partial<BenefitReport>
  ) => {
    if (!onUpdateReport) return;
    onUpdateReport(reportId, patch);
    setEditingId(null);
  };

  return (
    <section
      id="post-arrival"
      className="mt-6 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">みんなの投稿</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {sortedReports.length}件
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div
          id="post-not-yet"
          className="scroll-mt-20 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-800">まだ届いていない</h3>
            <button
              type="button"
              onClick={requestPostPending}
              disabled={cooldownMs > 0}
              className={`shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition ${
                cooldownMs > 0
                  ? "cursor-not-allowed opacity-50"
                  : "hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              記録する
            </button>
          </div>
        </div>

        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={handleSubmit}
        >
          <h3 className="text-sm font-semibold text-slate-900">届いたことを投稿</h3>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">
              何が届きましたか？
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPhase("actual")}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  phase === "actual"
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                🎁 優待品
                <span className="block text-[10px] font-normal opacity-75">
                  商品・チケット・QUOカード等
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPhase("notice")}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  phase === "notice"
                    ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                ✉️ 案内・申込書
                <span className="block text-[10px] font-normal opacity-75">
                  カタログ・申込書・通知のみ
                </span>
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-slate-500">
              ※ カタログギフトのように「先に案内、後で品物」と2回届く優待は、それぞれを別々に投稿してください
            </p>
          </div>
          <DateYyyymmddField
            id="arrival-date-main"
            label="到着日"
            valueIso={arrivalDate}
            onChangeIso={setArrivalDate}
            fallbackIso={getTodayIsoDate()}
            required
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={wantsComment}
              onChange={(e) => setWantsComment(e.target.checked)}
            />
            コメントを付ける（任意）
          </label>
          {wantsComment && (
            <textarea
              placeholder={
                phase === "notice"
                  ? "案内・申込書の内容やメモ（例: カタログギフトの案内状が届きました）"
                  : "到着した優待内容やメモ（例: 食事優待券が3,000円分届きました）"
              }
              className="h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={cooldownMs > 0}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              cooldownMs > 0
                ? "cursor-not-allowed bg-slate-400"
                : phase === "notice"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {cooldownMs > 0
              ? `連続投稿防止中... あと${Math.ceil(cooldownMs / 1000)}秒`
              : phase === "notice"
                ? "「✉️ 案内が届いた」を投稿する"
                : "「🎁 優待品が届いた」を投稿する"}
          </button>
        </form>

        <details className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
            表示名・地域（なくても投稿できます）
          </summary>
          <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="arrival-reporter-name"
                className="mb-1 block text-xs font-medium text-slate-800"
              >
                投稿者名
              </label>
              <input
                id="arrival-reporter-name"
                type="text"
                autoComplete="nickname"
                placeholder="例: たろう、ニックネーム"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={reporterName}
                onChange={(event) => setReporterName(event.target.value)}
                aria-describedby="arrival-reporter-hint"
              />
              <p id="arrival-reporter-hint" className="mt-1 text-[11px] text-slate-500">
                空欄のときは「匿名」として表示されます。
              </p>
            </div>
            <div>
              <label
                htmlFor="arrival-region"
                className="mb-1 block text-xs font-medium text-slate-800"
              >
                お住まいの地域（任意）
              </label>
              <PrefectureSelect
                id="arrival-region"
                value={region}
                onChange={setRegion}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                都道府県など。未選択のときは投稿に地域は表示されません。
              </p>
            </div>
          </div>
        </details>
      </div>

      {reports.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPhaseFilter("all")}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                phaseFilter === "all"
                  ? "border-blue-500 bg-blue-600 font-semibold text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              全({phaseCounts.total})
            </button>
            <button
              type="button"
              onClick={() => setPhaseFilter("actual")}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                phaseFilter === "actual"
                  ? "border-emerald-500 bg-emerald-600 font-semibold text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              🎁({phaseCounts.actual})
            </button>
            <button
              type="button"
              onClick={() => setPhaseFilter("notice")}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                phaseFilter === "notice"
                  ? "border-indigo-500 bg-indigo-600 font-semibold text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              ✉️({phaseCounts.notice})
            </button>
            <button
              type="button"
              onClick={() => setPhaseFilter("pending")}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                phaseFilter === "pending"
                  ? "border-amber-500 bg-amber-600 font-semibold text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              ⏳({phaseCounts.pending})
            </button>
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
            aria-label="並べ替え"
          >
            <option value="date">新着順</option>
            <option value="helpful">いいね順</option>
          </select>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {sortedReports.length === 0 && (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            {phaseFilter === "all"
              ? "まだ投稿がありません。ワンタップ投稿か、届いた投稿から始めてみましょう。"
              : phaseFilter === "notice"
              ? "「✉️ 案内・申込書」の投稿はまだありません。"
              : phaseFilter === "pending"
              ? "「⏳ まだ届いていない」の投稿はまだありません。"
              : "「🎁 優待品」の投稿はまだありません。"}
          </p>
        )}
        {sortedReports.map((report) => {
          const reportPhase = getEffectivePhase(report);
          const phaseMeta = PHASE_META[reportPhase];
          const own = isOwnPost("report", report.id);
          const isEditing = editingId === report.id;

          if (isEditing) {
            return (
              <ReportEditForm
                key={report.id}
                report={report}
                onCancel={() => setEditingId(null)}
                onSave={(patch) => handleSaveEdit(report.id, patch)}
              />
            );
          }

          return (
            <article
              key={report.id}
              id={`arrival-report-${report.id}`}
              className="scroll-mt-24 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${phaseMeta.colorClass}`}
                    title={
                      reportPhase === "pending"
                        ? "まだ届いていない（記録日）"
                        : `${phaseMeta.label}が届いた`
                    }
                  >
                    {phaseMeta.emoji}
                  </span>
                  {report.reporterName === "匿名" ? (
                    <span className="font-medium text-slate-900">匿名</span>
                  ) : (
                    <Link
                      href={`/u/${encodeURIComponent(report.reporterName)}`}
                      className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {report.reporterName}
                    </Link>
                  )}
                  {report.region && (
                    <span className="text-slate-500">{report.region}</span>
                  )}
                  <span className="text-slate-500">
                    {reportPhase === "pending" ? (
                      <>・{formatCalendarDateJa(report.arrivalDate)} 時点（まだ届いていない）</>
                    ) : (
                      <>・{formatCalendarDateJa(report.arrivalDate)} 到着</>
                    )}
                  </span>
                </div>
                <span className="text-slate-400">
                  {formatRelativeTime(report.createdAt)}
                </span>
              </div>
              {report.comment.trim() && (
                <p className="mt-1.5 text-sm text-slate-700">{report.comment}</p>
              )}
              {report.imageUrl && (
                <PostImage src={report.imageUrl} alt="優待写真" />
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px]">
                  {own ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(report.id)}
                        className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600 hover:bg-slate-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(report.id)}
                        className="rounded-md border border-rose-200 bg-white px-1.5 py-0.5 text-rose-600 hover:bg-rose-50"
                      >
                        削除
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/contact?type=post&code=${stockCode}&postId=${report.id}`}
                      className="text-slate-300 hover:text-rose-600"
                      title="この投稿を通報する"
                      aria-label="通報"
                    >
                      ⚠
                    </Link>
                  )}
                </div>
                <HelpfulButton
                  targetType="arrival"
                  targetId={report.id}
                  initialCount={report.helpfulCount ?? 0}
                />
              </div>
            </article>
          );
        })}
      </div>

      <dialog
        ref={pendingDialogRef}
        className="max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl [&::backdrop]:bg-slate-900/25"
        onClick={(e) => {
          if (e.target === pendingDialogRef.current) cancelPostPending();
        }}
      >
        <p className="text-sm font-medium text-slate-900">
          まだ届いていないを記録しますか？
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelPostPending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={confirmPostPending}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            投稿する
          </button>
        </div>
      </dialog>
    </section>
  );
}

function ReportEditForm({
  report,
  onCancel,
  onSave,
}: {
  report: BenefitReport;
  onCancel: () => void;
  onSave: (patch: Partial<BenefitReport>) => void;
}) {
  const [arrivalDate, setArrivalDate] = useState(report.arrivalDate);
  const [comment, setComment] = useState(report.comment);
  const [phase, setPhase] = useState<ReportPhase>(getEffectivePhase(report));

  return (
    <form
      className="rounded-xl border border-blue-300 bg-blue-50/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          arrivalDate,
          comment: comment.trim(),
          phase,
        });
      }}
    >
      <p className="text-xs font-semibold text-blue-900">投稿を編集</p>
      <div className="mt-2 grid gap-2">
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setPhase("actual")}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              phase === "actual"
                ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            🎁 優待品
          </button>
          <button
            type="button"
            onClick={() => setPhase("notice")}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              phase === "notice"
                ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            ✉️ 案内
          </button>
          <button
            type="button"
            onClick={() => setPhase("pending")}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              phase === "pending"
                ? "border-amber-500 bg-amber-50 font-semibold text-amber-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            ⏳ 未着
          </button>
        </div>
        <DateYyyymmddField
          id="arrival-date-edit"
          label={phase === "pending" ? "記録日" : "到着日"}
          valueIso={arrivalDate}
          onChangeIso={setArrivalDate}
          fallbackIso={getTodayIsoDate()}
          required
          labelClassName="block text-[10px] font-medium text-slate-600"
          inputClassName="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
        <textarea
          className="h-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
