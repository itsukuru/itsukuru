const PROFILE_STORAGE_KEY = "user-profile:v1";
const NOTIFICATION_STORAGE_KEY = "notification-settings:v1";

export type UserProfile = {
  displayName: string;
  joinedAt: string;
  region?: string;
  /**
   * 会員登録が完了したタイムスタンプ。
   * 未登録ユーザーは undefined。
   * 優待情報の編集など、悪質な編集を防ぎたい箇所のゲート判定に使う。
   */
  registeredAt?: string;
  /**
   * 編集ガイドラインに同意した時刻。会員登録時にチェック必須。
   */
  agreedToPolicyAt?: string;
};

export type NotificationSettings = {
  enabled: boolean;
  threshold: number;
};

/** 通知「何日前から」設定の下限（日） */
export const NOTIFICATION_THRESHOLD_MIN = 1;
/** 通知「何日前から」設定の上限（日）。これ以上長いウィンドウは不要のため固定 */
export const NOTIFICATION_THRESHOLD_MAX = 30;

const DEFAULT_PROFILE: UserProfile = {
  displayName: "ゲスト",
  joinedAt: new Date().toISOString(),
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  threshold: 7,
};

export const clampNotificationThreshold = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_NOTIFICATIONS.threshold;
  }
  return Math.min(
    NOTIFICATION_THRESHOLD_MAX,
    Math.max(NOTIFICATION_THRESHOLD_MIN, Math.round(value))
  );
};

export const loadProfile = (): UserProfile => {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PROFILE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      displayName: parsed.displayName || DEFAULT_PROFILE.displayName,
      joinedAt: parsed.joinedAt || DEFAULT_PROFILE.joinedAt,
      region: parsed.region || undefined,
      registeredAt: parsed.registeredAt || undefined,
      agreedToPolicyAt: parsed.agreedToPolicyAt || undefined,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
};

export const saveProfile = (
  profile: UserProfile,
  options?: { skipCloudPush?: boolean }
) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));

  // ログイン中ならサーバーにも反映（未ログインなら no-op）
  // skipCloudPush は「サーバーから引っ張ってきた値をローカルに適用するだけ」の
  // ケース（無限ループ防止）で使う
  if (!options?.skipCloudPush) {
    void (async () => {
      try {
        const { pushCloudProfile } = await import("./cloudProfile");
        await pushCloudProfile(profile);
      } catch (err) {
        console.warn("[profileClient] cloud push failed:", err);
      }
    })();
  }
};

/**
 * 会員登録済みかどうかを判定する。
 * 現在は localStorage ベースの簡易登録だが、将来的に本格認証へ差し替えやすいよう
 * 必ずこのヘルパーを通すこと。
 */
export const isUserRegistered = (profile?: UserProfile | null): boolean => {
  const p = profile ?? (typeof window !== "undefined" ? loadProfile() : null);
  if (!p) return false;
  return Boolean(p.registeredAt && p.agreedToPolicyAt && p.displayName?.trim());
};

/**
 * 簡易会員登録を完了する。
 * 表示名と編集ガイドライン同意が必須。
 */
export const registerUser = (input: {
  displayName: string;
  region?: string;
}): UserProfile => {
  const current = loadProfile();
  const now = new Date().toISOString();
  const next: UserProfile = {
    ...current,
    displayName: input.displayName.trim() || current.displayName || "メンバー",
    region: input.region?.trim() || current.region,
    registeredAt: current.registeredAt ?? now,
    agreedToPolicyAt: now,
  };
  saveProfile(next);
  return next;
};

export const loadNotificationSettings = (): NotificationSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATIONS;
  }
  const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATIONS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATIONS.enabled,
      threshold: clampNotificationThreshold(parsed.threshold),
    };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
  if (typeof window === "undefined") {
    return;
  }
  const normalized: NotificationSettings = {
    enabled: Boolean(settings.enabled),
    threshold: clampNotificationThreshold(settings.threshold),
  };
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(normalized));
};
