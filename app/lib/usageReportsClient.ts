import type { UsageReport } from "@/app/data/usageReports";

const USAGE_REPORTS_STORAGE_PREFIX = "benefit-usage-reports:";

const isUsageReport = (value: unknown): value is UsageReport => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.stockCode === "string" &&
    typeof candidate.usedDate === "string" &&
    typeof candidate.comment === "string"
  );
};

export const usageReportsStorageKey = (stockCode: string) =>
  `${USAGE_REPORTS_STORAGE_PREFIX}${stockCode}`;

export const loadUsageReportsForStock = (stockCode: string): UsageReport[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = localStorage.getItem(usageReportsStorageKey(stockCode));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUsageReport);
  } catch {
    return [];
  }
};

export const saveUsageReportsForStock = (
  stockCode: string,
  reports: UsageReport[]
) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(
    usageReportsStorageKey(stockCode),
    JSON.stringify(reports)
  );
};

/**
 * 新規「使った！」投稿を追加する（ローカル保存のみ）。
 * 将来クラウド連携を入れる場合は、ここに送信処理を追加する。
 */
export const addLocalUsageReport = (stockCode: string, report: UsageReport) => {
  if (typeof window === "undefined") return;
  const current = loadUsageReportsForStock(stockCode);
  const updated = [report, ...current];
  localStorage.setItem(
    usageReportsStorageKey(stockCode),
    JSON.stringify(updated)
  );
};

/** ローカル保存済みの「使った！」を1件削除する。 */
export const deleteLocalUsageReport = (
  stockCode: string,
  reportId: string
) => {
  if (typeof window === "undefined") return;
  const current = loadUsageReportsForStock(stockCode);
  const next = current.filter((r) => r.id !== reportId);
  saveUsageReportsForStock(stockCode, next);
};

/** ローカル保存済みの「使った！」を1件更新する。一致しない場合は何もしない。 */
export const updateLocalUsageReport = (
  stockCode: string,
  reportId: string,
  patch: Partial<UsageReport>
) => {
  if (typeof window === "undefined") return;
  const current = loadUsageReportsForStock(stockCode);
  const next = current.map((r) =>
    r.id === reportId ? { ...r, ...patch, id: r.id, stockCode: r.stockCode } : r
  );
  saveUsageReportsForStock(stockCode, next);
};

export const loadAllUsageReports = (): UsageReport[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const collected: UsageReport[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(USAGE_REPORTS_STORAGE_PREFIX)) {
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
        if (isUsageReport(item)) {
          collected.push(item);
        }
      }
    } catch {
      continue;
    }
  }

  return collected;
};
