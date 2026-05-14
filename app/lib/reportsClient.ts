import type { BenefitReport } from "@/app/data/benefitReports";
import { seedBenefitReports } from "@/app/data/benefitReports";

const REPORTS_STORAGE_PREFIX = "benefit-reports:";

const isBenefitReport = (value: unknown): value is BenefitReport => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.stockCode === "string" &&
    typeof candidate.arrivalDate === "string" &&
    typeof candidate.comment === "string"
  );
};

export const reportsStorageKey = (stockCode: string) =>
  `${REPORTS_STORAGE_PREFIX}${stockCode}`;

export const loadLocalReportsForStock = (stockCode: string): BenefitReport[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = localStorage.getItem(reportsStorageKey(stockCode));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isBenefitReport);
  } catch {
    return [];
  }
};

export const saveLocalReportsForStock = (
  stockCode: string,
  reports: BenefitReport[]
) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(reportsStorageKey(stockCode), JSON.stringify(reports));
};

/**
 * 新規「届いた！」投稿を追加する（ローカル保存のみ）。
 * 将来クラウド連携を入れる場合は、ここに送信処理を追加する。
 */
export const addLocalReport = (stockCode: string, report: BenefitReport) => {
  if (typeof window === "undefined") return;
  const current = loadLocalReportsForStock(stockCode);
  const updated = [report, ...current];
  localStorage.setItem(reportsStorageKey(stockCode), JSON.stringify(updated));
};

/** ローカル保存済みの「届いた！」を1件削除する。 */
export const deleteLocalReport = (stockCode: string, reportId: string) => {
  if (typeof window === "undefined") return;
  const current = loadLocalReportsForStock(stockCode);
  const next = current.filter((r) => r.id !== reportId);
  saveLocalReportsForStock(stockCode, next);
};

/** ローカル保存済みの「届いた！」を1件更新する。一致しない場合は何もしない。 */
export const updateLocalReport = (
  stockCode: string,
  reportId: string,
  patch: Partial<BenefitReport>
) => {
  if (typeof window === "undefined") return;
  const current = loadLocalReportsForStock(stockCode);
  const next = current.map((r) =>
    r.id === reportId ? { ...r, ...patch, id: r.id, stockCode: r.stockCode } : r
  );
  saveLocalReportsForStock(stockCode, next);
};

export const loadReportsForStock = (stockCode: string): BenefitReport[] => {
  const local = loadLocalReportsForStock(stockCode);
  const seed = seedBenefitReports.filter((r) => r.stockCode === stockCode);
  return [...local, ...seed];
};

export const loadAllLocalReports = (): BenefitReport[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const collected: BenefitReport[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(REPORTS_STORAGE_PREFIX)) {
      continue;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }
      for (const item of parsed) {
        if (isBenefitReport(item)) {
          collected.push(item);
        }
      }
    } catch {
      continue;
    }
  }

  return collected;
};

export const loadAllReports = (): BenefitReport[] => {
  return [...loadAllLocalReports(), ...seedBenefitReports];
};

export const isToday = (isoDateOrDate: string): boolean => {
  const now = new Date();
  const target = new Date(isoDateOrDate);
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
};

/** 保存形式 YYYY-MM-DD を YYYYMMDD（8桁・年→月→日）で表示する */
export const formatCalendarDateJa = (isoYmd: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return isoYmd;
  return `${m[1]}${m[2]}${m[3]}`;
};

/** 8桁の数字のみを YYYY-MM-DD に変換。暦として無効なら null */
export const parseYyyymmddDigitsToIso = (digits: string): string | null => {
  if (!/^\d{8}$/.test(digits)) return null;
  const y = Number(digits.slice(0, 4));
  const mo = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  const dt = new Date(y, mo - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

/** 本日の日付を YYYY-MM-DD で返す */
export const getTodayIsoDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatRelativeTime = (isoString: string): string => {
  const created = new Date(isoString).getTime();
  if (Number.isNaN(created)) {
    return "";
  }
  const diffMs = Date.now() - created;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "たった今";
  }
  if (minutes < 60) {
    return `${minutes}分前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}時間前`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}日前`;
  }
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${mo}${day}`;
};
