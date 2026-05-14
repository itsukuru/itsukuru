"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { UsageReport } from "@/app/data/usageReports";
import { formatRelativeTime, formatCalendarDateJa, getTodayIsoDate } from "@/app/lib/reportsClient";
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
  reports: UsageReport[];
  onAddReport: (report: UsageReport) => void;
  onUpdateReport?: (reportId: string, patch: Partial<UsageReport>) => void;
  onDeleteReport?: (reportId: string) => void;
};

type SortKey = "date" | "helpful";

export default function StockUsageSection({
  stockCode,
  reports,
  onAddReport,
  onUpdateReport,
  onDeleteReport,
}: Props) {
  const [reporterName, setReporterName] = useState("");
  const [region, setRegion] = useState("");
  const [usedDate, setUsedDate] = useState(getTodayIsoDate);
  const [comment, setComment] = useState("");
  const [wantsComment, setWantsComment] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

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
    setUsedDate(getTodayIsoDate());
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

  const sortedReports = useMemo(() => {
    const copy = [...reports];
    if (sortKey === "helpful") {
      copy.sort((a, b) => {
        const ah = a.helpfulCount ?? 0;
        const bh = b.helpfulCount ?? 0;
        if (bh !== ah) return bh - ah;
        return b.usedDate.localeCompare(a.usedDate);
      });
    } else {
      copy.sort((a, b) => b.usedDate.localeCompare(a.usedDate));
    }
    return copy;
  }, [reports, sortKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!usedDate) return;
    if (cooldownRemainingMs() > 0) {
      setCooldownMs(cooldownRemainingMs());
      return;
    }

    const newReport: UsageReport = {
      id: crypto.randomUUID(),
      stockCode,
      usedDate,
      reporterName: reporterName.trim() || "匿名",
      region: region.trim() || undefined,
      comment: wantsComment ? comment.trim() : "",
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };

    onAddReport(newReport);
    markOwnPost("usage", newReport.id);
    setCooldownMs(POST_COOLDOWN_MS);

    const profile = loadProfile();
    setReporterName(isUserRegistered(profile) ? profile.displayName : "");
    setComment("");
    setWantsComment(false);
    setUsedDate(getTodayIsoDate());
  };

  const handleDelete = (reportId: string) => {
    if (!onDeleteReport) return;
    if (!confirm("この投稿を削除しますか？取り消しできません。")) return;
    onDeleteReport(reportId);
  };

  const handleSaveEdit = (
    reportId: string,
    patch: Partial<UsageReport>
  ) => {
    if (!onUpdateReport) return;
    onUpdateReport(reportId, patch);
    setEditingId(null);
  };

  return (
    <section
      id="post-usage"
      className="mt-6 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">いつ使った？</h2>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          {sortedReports.length}件
        </span>
      </div>

      <form className="mt-4 space-y-4 rounded-xl bg-sky-50/60 p-4" onSubmit={handleSubmit}>
        <h3 className="text-sm font-semibold text-slate-900">使ったことを投稿</h3>
        <DateYyyymmddField
          id="usage-date-main"
          label="使用日"
          valueIso={usedDate}
          onChangeIso={setUsedDate}
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
              "使った優待の感想やメモ（例: 食事券をランチで使いました）"
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
              : "bg-sky-500 hover:bg-sky-600"
          }`}
        >
          {cooldownMs > 0
            ? `連続投稿防止中... あと${Math.ceil(cooldownMs / 1000)}秒`
            : "「使った！」を投稿する"}
        </button>

        <details className="rounded-lg border border-sky-200/80 bg-white/80 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
            表示名・地域（なくても投稿できます）
          </summary>
          <div className="mt-3 grid gap-4 border-t border-sky-100 pt-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="usage-reporter-name"
                className="mb-1 block text-xs font-medium text-slate-800"
              >
                投稿者名
              </label>
              <input
                id="usage-reporter-name"
                type="text"
                autoComplete="nickname"
                placeholder="例: たろう、ニックネーム"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={reporterName}
                onChange={(event) => setReporterName(event.target.value)}
                aria-describedby="usage-reporter-hint"
              />
              <p id="usage-reporter-hint" className="mt-1 text-[11px] text-slate-500">
                空欄のときは「匿名」として表示されます。
              </p>
            </div>
            <div>
              <label
                htmlFor="usage-region"
                className="mb-1 block text-xs font-medium text-slate-800"
              >
                お住まいの地域（任意）
              </label>
              <PrefectureSelect
                id="usage-region"
                value={region}
                onChange={setRegion}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                未選択のときは投稿に地域は表示されません。
              </p>
            </div>
          </div>
        </details>
      </form>

      {sortedReports.length > 0 && (
        <div className="mt-4 flex items-center justify-end">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
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
            まだ使用報告がありません。優待を使ったら最初の「使った！」を投稿してみましょう。
          </p>
        )}
        {sortedReports.map((report) => {
          const own = isOwnPost("usage", report.id);
          if (editingId === report.id) {
            return (
              <UsageEditForm
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
              id={`usage-report-${report.id}`}
              className="scroll-mt-24 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                    🎫 使った
                  </span>
                  {report.reporterName === "匿名" ? (
                    <span className="font-medium text-slate-900">匿名</span>
                  ) : (
                    <Link
                      href={`/u/${encodeURIComponent(report.reporterName)}`}
                      className="font-medium text-slate-900 hover:text-sky-700 hover:underline"
                    >
                      {report.reporterName}
                    </Link>
                  )}
                  {report.region && (
                    <span className="text-slate-500">{report.region}</span>
                  )}
                  <span className="text-slate-500">・{formatCalendarDateJa(report.usedDate)} 使用</span>
                </div>
                <span className="text-slate-400">
                  {formatRelativeTime(report.createdAt)}
                </span>
              </div>
              {report.comment.trim() && (
                <p className="mt-1.5 text-sm text-slate-700">{report.comment}</p>
              )}
              {report.imageUrl && (
                <PostImage src={report.imageUrl} alt="使ったシーンの写真" />
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
                  targetType="usage"
                  targetId={report.id}
                  initialCount={report.helpfulCount ?? 0}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function UsageEditForm({
  report,
  onCancel,
  onSave,
}: {
  report: UsageReport;
  onCancel: () => void;
  onSave: (patch: Partial<UsageReport>) => void;
}) {
  const [usedDate, setUsedDate] = useState(report.usedDate);
  const [comment, setComment] = useState(report.comment);

  return (
    <form
      className="rounded-xl border border-sky-300 bg-sky-50/50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ usedDate, comment: comment.trim() });
      }}
    >
      <p className="text-xs font-semibold text-sky-900">投稿を編集</p>
      <div className="mt-2 grid gap-2">
        <DateYyyymmddField
          id="usage-date-edit"
          label="使用日"
          valueIso={usedDate}
          onChangeIso={setUsedDate}
          fallbackIso={getTodayIsoDate()}
          required
          labelClassName="text-xs font-medium text-slate-600"
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
          className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600"
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
