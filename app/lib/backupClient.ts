const FIXED_KEYS = [
  "favorite-stock-codes:v1",
  "user-profile:v1",
  "notification-settings:v1",
  "stock-holdings:v1",
  "custom-stocks:v1",
];

const PREFIXED_KEYS = [
  "benefit-reports:",
  "benefit-usage-reports:",
  "stock-benefit:",
];

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};

const collectKeys = (): string[] => {
  const keys = new Set<string>(FIXED_KEYS);
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (PREFIXED_KEYS.some((prefix) => key.startsWith(prefix))) {
      keys.add(key);
    }
  }
  return Array.from(keys);
};

export const exportBackup = (): BackupPayload => {
  const data: Record<string, unknown> = {};
  for (const key of collectKeys()) {
    const value = localStorage.getItem(key);
    if (value === null) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
};

export const importBackup = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") {
    throw new Error("バックアップ形式が不正です。");
  }
  const p = payload as Partial<BackupPayload>;
  if (!p.data || typeof p.data !== "object") {
    throw new Error("バックアップにdataがありません。");
  }
  let count = 0;
  for (const [key, value] of Object.entries(p.data)) {
    const isFixed = FIXED_KEYS.includes(key);
    const hasPrefix = PREFIXED_KEYS.some((prefix) => key.startsWith(prefix));
    if (!isFixed && !hasPrefix) continue;
    localStorage.setItem(key, JSON.stringify(value));
    count += 1;
  }
  return count;
};

export const downloadBackupFile = () => {
  const payload = exportBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `itsukuru-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
