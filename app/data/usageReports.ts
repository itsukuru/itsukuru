export type UsageReport = {
  id: string;
  stockCode: string;
  usedDate: string;
  reporterName: string;
  region?: string;
  comment: string;
  createdAt: string;
  /**
   * 添付画像のURL（Supabase Storage の公開URLか、オフライン時の data URL）。
   * 優待を使ったシーンの写真などをイメージしている。
   */
  imageUrl?: string;
  /**
   * 「いいね」を押した人数（denormalized）。
   */
  helpfulCount?: number;
};
