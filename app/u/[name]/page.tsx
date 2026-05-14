"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadAllReports, formatRelativeTime, formatCalendarDateJa } from "@/app/lib/reportsClient";
import { loadAllUsageReports } from "@/app/lib/usageReportsClient";
import { PHASE_META, getEffectivePhase, type ReportPhase } from "@/app/data/benefitReports";

type UnifiedPost = {
  key: string;
  kind: "arrival" | "usage";
  stockCode: string;
  date: string;
  reporterName: string;
  region?: string;
  comment: string;
  createdAt: string;
  phase?: ReportPhase;
};

export default function UserPostsPage() {
  const params = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(params.name ?? "").trim();
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!decodedName) return;
    const reports = loadAllReports();
    const usage = loadAllUsageReports();
    const unified: UnifiedPost[] = [];
    for (const r of reports) {
      if ((r.reporterName ?? "").trim() === decodedName) {
        unified.push({
          key: `r-${r.id}`,
          kind: "arrival",
          stockCode: r.stockCode,
          date: r.arrivalDate,
          reporterName: r.reporterName,
          region: r.region,
          comment: r.comment,
          createdAt: r.createdAt,
          phase: getEffectivePhase(r),
        });
      }
    }
    for (const u of usage) {
      if ((u.reporterName ?? "").trim() === decodedName) {
        unified.push({
          key: `u-${u.id}`,
          kind: "usage",
          stockCode: u.stockCode,
          date: u.usedDate,
          reporterName: u.reporterName,
          region: u.region,
          comment: u.comment,
          createdAt: u.createdAt,
        });
      }
    }
    unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setPosts(unified);
    setLoaded(true);
  }, [decodedName]);

  const stats = useMemo(() => {
    let arrival = 0;
    let usage = 0;
    let notice = 0;
    let actual = 0;
    let pending = 0;
    const stockCodes = new Set<string>();
    const regions = new Set<string>();
    for (const p of posts) {
      if (p.kind === "arrival") {
        arrival += 1;
        if (p.phase === "notice") notice += 1;
        else if (p.phase === "pending") pending += 1;
        else actual += 1;
      } else {
        usage += 1;
      }
      stockCodes.add(p.stockCode);
      if (p.region) regions.add(p.region);
    }
    return {
      arrival,
      usage,
      notice,
      actual,
      pending,
      stocks: stockCodes.size,
      regions: Array.from(regions),
    };
  }, [posts]);

  if (!decodedName) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-sm text-slate-600">投稿者が指定されていません。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <span className="truncate text-xs font-medium text-slate-500">
            投稿者プロフィール
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white">
              {decodedName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-900">
                {decodedName}
              </h1>
              <p className="text-xs text-slate-500">
                {stats.arrival + stats.usage}件の投稿 ・ {stats.stocks}銘柄
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="🎁 届いた" value={stats.actual} />
            <Stat label="✉️ 案内" value={stats.notice} />
            <Stat label="⏳ 未着" value={stats.pending} />
            <Stat label="🎫 使った" value={stats.usage} />
          </div>
          {stats.regions.length > 0 && (
            <p className="mt-3 text-[11px] text-slate-500">
              地域: {stats.regions.join(" / ")}
            </p>
          )}
        </section>

        <h2 className="mt-6 mb-2 text-sm font-bold text-slate-900">投稿一覧</h2>
        {!loaded ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            読み込み中...
          </p>
        ) : posts.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            この投稿者の公開投稿は見つかりませんでした。
          </p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.key}>
                <Link
                  href={`/stock/${p.stockCode}`}
                  className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.kind === "arrival" && p.phase ? (
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PHASE_META[p.phase].colorClass}`}
                        >
                          {PHASE_META[p.phase].emoji}
                        </span>
                      ) : (
                        <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                          🎫
                        </span>
                      )}
                      <span className="font-medium text-slate-700">
                        {p.stockCode}
                      </span>
                      <span className="text-slate-500">
                        {p.kind === "usage"
                          ? `・${formatCalendarDateJa(p.date)} 使用`
                          : p.phase === "pending"
                            ? `・${formatCalendarDateJa(p.date)} 時点（未着）`
                            : `・${formatCalendarDateJa(p.date)} 到着`}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {formatRelativeTime(p.createdAt)}
                    </span>
                  </div>
                  {p.comment.trim() && (
                    <p className="mt-1 truncate text-sm text-slate-700">
                      {p.comment}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-[10px] text-slate-400">
          ※ このプロフィールはローカル投稿とサンプル投稿から集計しています
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
