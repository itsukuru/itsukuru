/**
 * 投稿への「いいね」状態をローカルで管理する。
 *
 * 設計:
 *   - 自分が押した投稿は localStorage に保存（オフラインでも UI を維持）
 *   - 表示用のカウントは BenefitReport.helpfulCount / UsageReport.helpfulCount に
 *     denormalized 値を保存
 *   - 将来クラウド連携を入れる場合は、toggleLike からサーバー送信処理を呼び出す
 */

const STORAGE_KEY = "post-likes:v1";

export type LikeTargetType = "arrival" | "usage";

type LikeRecord = {
  /** "arrival:<reportId>" もしくは "usage:<reportId>" */
  key: string;
  /** いいね追加時刻 ISO 8601 */
  likedAt: string;
};

const buildKey = (type: LikeTargetType, id: string): string => `${type}:${id}`;

const loadLikes = (): LikeRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is LikeRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as LikeRecord).key === "string" &&
        typeof (r as LikeRecord).likedAt === "string"
    );
  } catch {
    return [];
  }
};

const persistLikes = (records: LikeRecord[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const isLiked = (type: LikeTargetType, id: string): boolean => {
  return loadLikes().some((r) => r.key === buildKey(type, id));
};

export const loadLikedKeys = (): Set<string> => {
  return new Set(loadLikes().map((r) => r.key));
};

/**
 * 「いいね」を切り替える。
 * @returns 切り替え後の状態（true=いいね中 / false=未いいね）
 */
export const toggleLike = (type: LikeTargetType, id: string): boolean => {
  if (typeof window === "undefined") return false;
  const key = buildKey(type, id);
  const records = loadLikes();
  const idx = records.findIndex((r) => r.key === key);

  let nextLiked: boolean;
  if (idx >= 0) {
    records.splice(idx, 1);
    nextLiked = false;
  } else {
    records.push({ key, likedAt: new Date().toISOString() });
    nextLiked = true;
  }
  persistLikes(records);
  return nextLiked;
};
