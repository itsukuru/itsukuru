export const FAVORITES_STORAGE_KEY = "favorite-stock-codes:v1";

export const loadFavoriteCodes = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
};

export const saveFavoriteCodes = (codes: string[]) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(codes));
};

/**
 * キニナル銘柄を1件追加する。
 *   - 常にローカル保存（オフラインでも UI 即時更新）
 *   - ログイン中なら fire-and-forget でサーバーへも反映
 */
export const addFavoriteCode = (code: string) => {
  if (typeof window === "undefined") return;
  const current = loadFavoriteCodes();
  if (current.includes(code)) return;
  const updated = [...current, code];
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));

  void (async () => {
    try {
      const { addCloudFavorite } = await import("./cloudFavorites");
      await addCloudFavorite(code);
    } catch (err) {
      console.warn("[favoritesClient] cloud add failed:", err);
    }
  })();
};

/**
 * キニナル銘柄を1件削除する。
 *   - 常にローカル保存
 *   - ログイン中なら fire-and-forget でサーバーからも削除
 */
export const removeFavoriteCode = (code: string) => {
  if (typeof window === "undefined") return;
  const current = loadFavoriteCodes();
  if (!current.includes(code)) return;
  const updated = current.filter((c) => c !== code);
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));

  void (async () => {
    try {
      const { removeCloudFavorite } = await import("./cloudFavorites");
      await removeCloudFavorite(code);
    } catch (err) {
      console.warn("[favoritesClient] cloud remove failed:", err);
    }
  })();
};
