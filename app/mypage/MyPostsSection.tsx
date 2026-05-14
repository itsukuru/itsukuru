"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BenefitReport } from "@/app/data/benefitReports";
import { getEffectivePhase, PHASE_META } from "@/app/data/benefitReports";
import type { UsageReport } from "@/app/data/usageReports";
import {
  deleteLocalReport,
  formatCalendarDateJa,
  formatRelativeTime,
  loadAllLocalReports,
} from "@/app/lib/reportsClient";
import {
  deleteLocalUsageReport,
  loadAllUsageReports,
} from "@/app/lib/usageReportsClient";
import { isUserRegistered, type UserProfile } from "@/app/lib/profileClient";
import { isOwnPost, unmarkOwnPost } from "@/app/lib/ownPostsClient";
import {
  getDefaultStocks,
  loadCustomStocks,
  mergeStocks,
  type StockRecord,
} from "@/app/lib/stocksClient";

type Row =
  | { kind: "arrival"; post: BenefitReport }
  | { kind: "usage"; post: UsageReport };

function collectMine(profile: UserProfile): Row[] {
  const registered = isUserRegistered(profile);
  const name = (profile.displayName ?? "").trim();

  const arrivals = loadAllLocalReports().filter((r) => {
    if (isOwnPost("report", r.id)) return true;
    if (registered && name && (r.reporterName ?? "").trim() === name) return true;
    return false;
  });
  const usages = loadAllUsageReports().filter((u) => {
    if (isOwnPost("usage", u.id)) return true;
    if (registered && name && (u.reporterName ?? "").trim() === name) return true;
    return false;
  });

  const rows: Row[] = [
    ...arrivals.map((post) => ({ kind: "arrival" as const, post })),
    ...usages.map((post) => ({ kind: "usage" as const, post })),
  ];
  rows.sort((a, b) => b.post.createdAt.localeCompare(a.post.createdAt));
  return rows;
}

export default function MyPostsSection({
  profile,
  onCountChange,
}: {
  profile: UserProfile;
  onCountChange?: (count: number) => void;
}) {
  const pathname = usePathname();
  const [rows, setRows] = useState<Row[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>(getDefaultStocks());

  const refresh = useCallback(() => {
    setStocks(mergeStocks(getDefaultStocks(), loadCustomStocks()));
    const next = collectMine(profile);
    setRows(next);
    onCountChange?.(next.length);
  }, [profile, onCountChange]);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key.startsWith("benefit-reports:") ||
        e.key.startsWith("benefit-usage-reports:") ||
        e.key.startsWith("own-post-ids:")
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const stockName = (code: string) =>
    stocks.find((s) => s.code === code)?.name ?? code;

  const handleDelete = (row: Row) => {
    if (!confirm("この投稿を削除しますか？取り消しできません。")) return;
    if (row.kind === "arrival") {
      deleteLocalReport(row.post.stockCode, row.post.id);
      unmarkOwnPost("report", row.post.id);
    } else {
      deleteLocalUsageReport(row.post.stockCode, row.post.id);
      unmarkOwnPost("usage", row.post.id);
    }
    refresh();
  };

  const editHref = (row: Row) =>
    row.kind === "arrival"
      ? `/stock/${row.post.stockCode}#arrival-report-${row.post.id}`
      : `/stock/${row.post.stockCode}#usage-report-${row.post.id}`;

  return (
    <section
      id="my-posts"
      className="mt-6 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold text-slate-900">マイ投稿</h2>
      <p className="mt-1 text-xs text-slate-500">
        この端末に保存した「届いた」「使った」の一覧です。編集は銘柄ページで行えます。
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          まだ投稿がありません。
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {rows.map((row) => {
            const code = row.post.stockCode;
            const name = stockName(code);
            if (row.kind === "arrival") {
              const r = row.post;
              const ph = getEffectivePhase(r);
              const meta = PHASE_META[ph];
              return (
                <li key={`a-${r.id}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.colorClass}`}
                      >
                        {meta.emoji} {meta.shortLabel}
                      </span>
                      <Link
                        href={`/stock/${code}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {code} {name}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatCalendarDateJa(r.arrivalDate)}
                      {ph === "pending" ? " ・未着記録" : " ・到着"}
                      {r.region && ` ・${r.region}`}
                    </p>
                    {r.comment.trim() ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-700">{r.comment}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatRelativeTime(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={editHref(row)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      編集
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            }
            const u = row.post;
            return (
              <li key={`u-${u.id}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                      使った
                    </span>
                    <Link
                      href={`/stock/${code}`}
                      className="font-semibold text-slate-900 hover:text-sky-700 hover:underline"
                    >
                      {code} {name}
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatCalendarDateJa(u.usedDate)} ・使用
                    {u.region && ` ・${u.region}`}
                  </p>
                  {u.comment.trim() ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">{u.comment}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatRelativeTime(u.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={editHref(row)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
