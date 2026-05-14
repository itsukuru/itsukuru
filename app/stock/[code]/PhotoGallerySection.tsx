"use client";

import { useEffect, useMemo, useState } from "react";
import type { BenefitReport } from "@/app/data/benefitReports";
import type { UsageReport } from "@/app/data/usageReports";
import { formatCalendarDateJa } from "@/app/lib/reportsClient";

type Props = {
  reports: BenefitReport[];
  usageReports: UsageReport[];
};

type Photo = {
  id: string;
  url: string;
  date: string;
  reporter: string;
  kind: "arrival" | "usage";
};

const INITIAL_VISIBLE = 6;

export default function PhotoGallerySection({ reports, usageReports }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ライトボックスが開いている間は body スクロール禁止 + ESC で閉じる
  useEffect(() => {
    if (!lightboxUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxUrl]);

  const photos = useMemo<Photo[]>(() => {
    const list: Photo[] = [];
    for (const r of reports) {
      if (r.imageUrl) {
        list.push({
          id: r.id,
          url: r.imageUrl,
          date: r.arrivalDate,
          reporter: r.reporterName,
          kind: "arrival",
        });
      }
    }
    for (const u of usageReports) {
      if (u.imageUrl) {
        list.push({
          id: u.id,
          url: u.imageUrl,
          date: u.usedDate,
          reporter: u.reporterName,
          kind: "usage",
        });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, usageReports]);

  if (photos.length === 0) return null;

  const visible = showAll ? photos : photos.slice(0, INITIAL_VISIBLE);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          📸 みんなの写真
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {photos.length}枚
          </span>
        </h2>
        {photos.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[11px] text-blue-600 hover:underline"
          >
            {showAll ? "閉じる" : "すべて表示"}
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {visible.map((photo) => (
          <button
            key={`${photo.kind}-${photo.id}`}
            type="button"
            onClick={() => setLightboxUrl(photo.url)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
            aria-label={`${photo.reporter}さんの写真（${formatCalendarDateJa(photo.date)}）`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`${photo.reporter}さんが${formatCalendarDateJa(photo.date)}に${photo.kind === "arrival" ? "受取" : "使用"}した株主優待`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <span
              className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                photo.kind === "arrival"
                  ? "bg-blue-100/90 text-blue-800"
                  : "bg-sky-100/90 text-sky-800"
              }`}
            >
              {photo.kind === "arrival" ? "🎁" : "🎫"}
            </span>
          </button>
        ))}
      </div>

      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal
          aria-label="株主優待の写真を拡大表示"
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="株主優待の写真"
            decoding="async"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-slate-700"
            aria-label="画像を閉じる"
          >
            ✕ 閉じる
          </button>
        </div>
      )}
    </section>
  );
}
