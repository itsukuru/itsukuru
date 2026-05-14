/**
 * 「自分が投稿したもの」のID集合をlocalStorage上で管理する軽量ユーティリティ。
 *
 * 編集・削除ボタンの表示制御 / 連続投稿クールダウン に使用される。
 * シード（公式に用意された）投稿のIDはここに含まれないため、シード投稿は
 * UI上で「自分の投稿」として扱われず、編集・削除ボタンも表示されない。
 */

const OWN_REPORTS_KEY = "own-post-ids:reports";
const OWN_USAGE_KEY = "own-post-ids:usage";
const LAST_POST_AT_KEY = "own-post-ids:lastPostAt";

/** 連続投稿のクールダウン期間（ms） */
export const POST_COOLDOWN_MS = 30_000;

type PostType = "report" | "usage";

const keyFor = (type: PostType) =>
  type === "report" ? OWN_REPORTS_KEY : OWN_USAGE_KEY;

const readSet = (type: PostType): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(keyFor(type));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v) => typeof v === "string"));
  } catch {
    return new Set();
  }
};

const writeSet = (type: PostType, set: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(type), JSON.stringify(Array.from(set)));
  } catch {
    // ignore quota errors
  }
};

export const isOwnPost = (type: PostType, id: string): boolean => {
  return readSet(type).has(id);
};

export const markOwnPost = (type: PostType, id: string): void => {
  const set = readSet(type);
  set.add(id);
  writeSet(type, set);
  try {
    localStorage.setItem(LAST_POST_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

export const unmarkOwnPost = (type: PostType, id: string): void => {
  const set = readSet(type);
  set.delete(id);
  writeSet(type, set);
};

/**
 * クールダウン残り秒数を返す。0以下ならクールダウン終了。
 */
export const cooldownRemainingMs = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(LAST_POST_AT_KEY);
    if (!raw) return 0;
    const last = Number(raw);
    if (!Number.isFinite(last)) return 0;
    const elapsed = Date.now() - last;
    return Math.max(0, POST_COOLDOWN_MS - elapsed);
  } catch {
    return 0;
  }
};

export const loadOwnReportIds = (): Set<string> => readSet("report");
export const loadOwnUsageIds = (): Set<string> => readSet("usage");
