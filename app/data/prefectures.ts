/**
 * 日本の47都道府県（北→南の伝統的な順序）。
 *
 * 地域選択 UI で使用する。空文字 "" は「選択しない（未指定）」を表す。
 * これにより匿名性を保ちたいユーザーは region を未指定のまま投稿できる。
 */
export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

export type Prefecture = (typeof PREFECTURES)[number];

/** 47都道府県以外（海外居住など）を選びたいユーザー向け */
export const OVERSEAS_LABEL = "海外・その他";

/**
 * region 文字列が47都道府県 + 海外オプションに合致するか。
 * 過去にフリーテキストで入っているデータとの互換のため、合致しなくても許容する。
 */
export const isKnownRegion = (value: string | undefined | null): boolean => {
  if (!value) return false;
  if (value === OVERSEAS_LABEL) return true;
  return (PREFECTURES as readonly string[]).includes(value);
};
