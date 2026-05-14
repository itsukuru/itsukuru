import type { StockBenefit } from "@/app/data/stockBenefits";
import { normalizeSearchText } from "./searchNormalize";

export type BenefitCategoryKey =
  | "food"
  | "quo"
  | "catalog"
  | "points"
  | "voucher"
  | "cosmetics"
  | "travel"
  | "themepark"
  | "discount"
  | "product"
  | "leisure"
  | "other";

export type BenefitCategoryInfo = {
  key: BenefitCategoryKey;
  label: string;
  emoji: string;
  colorClass: string;
  keywords: string[];
};

export const BENEFIT_CATEGORIES: BenefitCategoryInfo[] = [
  {
    key: "food",
    label: "グルメ・食事券",
    emoji: "🍽",
    colorClass: "bg-cyan-100 text-cyan-700",
    keywords: [
      "食事券",
      "食事優待券",
      "食事優待",
      "お食事",
      "飲食",
      "飲食割引",
      "飲食代",
      "レストラン",
      "ファミレス",
      "ファーストフード",
      "ファストフード",
      "カフェ",
      "コーヒー",
      "珈琲",
      "喫茶",
      "ランチ",
      "ディナー",
      "定食",
      "弁当",
      "バーガー",
      "ハンバーガー",
      "牛丼",
      "丼",
      "ラーメン",
      "麺",
      "うどん",
      "そば",
      "蕎麦",
      "寿司",
      "回転寿司",
      "鮨",
      "焼肉",
      "焼鳥",
      "焼き鳥",
      "居酒屋",
      "中華",
      "和食",
      "洋食",
      "ピザ",
      "パスタ",
      "餃子",
      "とんかつ",
      "しゃぶしゃぶ",
      "すき焼き",
      "スイーツ",
      "ドーナツ",
      "アイス",
      "ベーカリー",
      "パン屋",
      "ステーキ",
      "グルメ",
      "KOMECA",
      "マクドナルド",
      "モスバーガー",
      "ロッテリア",
      "ケンタッキー",
      "KFC",
      "スターバックス",
      "スタバ",
      "ドトール",
      "コメダ",
      "タリーズ",
      "ガスト",
      "バーミヤン",
      "ジョナサン",
      "サイゼリヤ",
      "ロイヤルホスト",
      "デニーズ",
      "ジョイフル",
      "ジョリーパスタ",
      "ステーキガスト",
      "吉野家",
      "すき家",
      "松屋",
      "はなまる",
      "スシロー",
      "くら寿司",
      "はま寿司",
      "かっぱ寿司",
      "がってん寿司",
      "牛角",
      "鳥貴族",
      "ワタミ",
      "日高屋",
      "山岡家",
      "一風堂",
      "一蘭",
      "丸源",
      "焼肉きんぐ",
      "ゆず庵",
      "餃子の王将",
      "大阪王将",
      "天下一品",
      "サブウェイ",
      "ミスタードーナツ",
      "ミスド",
      "サーティワン",
      "シェイクシャック",
      "コメダ珈琲",
      "壱番屋",
      "ココイチ",
      "CoCo壱",
      "食べログ",
      "オリジン",
      "リンガーハット",
      "サガミ",
      "木曽路",
      "梅の花",
      "がんこ寿司",
      "金のとりから",
      "ハイデイ",
      "コロワイド",
      "クリエイト・レストラン",
      "クリエイトレストラン",
      "すかいらーく",
      "物語コーポレーション",
      "物語コーポ",
    ],
  },
  {
    key: "quo",
    label: "QUOカード",
    emoji: "💳",
    colorClass: "bg-blue-50 text-blue-700",
    keywords: ["クオカード", "QUOカード", "ＱＵＯカード", "クオ・カード", "クオカ"],
  },
  {
    key: "catalog",
    label: "カタログギフト",
    emoji: "📦",
    colorClass: "bg-emerald-50 text-emerald-700",
    keywords: ["カタログ", "カタログギフト", "ギフトカタログ", "選べる", "選択型"],
  },
  {
    key: "points",
    label: "ポイント",
    emoji: "🅿",
    colorClass: "bg-indigo-50 text-indigo-700",
    keywords: [
      "ポイント",
      "ｄポイント",
      "dポイント",
      "PayPay",
      "ペイペイ",
      "ponta",
      "Ponta",
      "ポンタ",
      "楽天ポイント",
      "Tポイント",
      "Pontaポイント",
      "WAONポイント",
      "Vポイント",
    ],
  },
  {
    key: "voucher",
    label: "商品券・金券",
    emoji: "💴",
    colorClass: "bg-blue-50 text-blue-800",
    keywords: [
      "商品券",
      "金券",
      "ギフト券",
      "ギフトカード",
      "図書カード",
      "図書券",
      "おこめ券",
      "お米券",
      "JCBギフト",
      "VJA",
      "VJAギフト",
      "VISAギフト",
      "プリペイドカード",
      "電子マネー",
    ],
  },
  {
    key: "cosmetics",
    label: "化粧品・日用品",
    emoji: "🧴",
    colorClass: "bg-violet-50 text-violet-700",
    keywords: [
      "化粧品",
      "コスメ",
      "スキンケア",
      "ヘアケア",
      "シャンプー",
      "洗剤",
      "日用品",
      "美容",
    ],
  },
  {
    key: "travel",
    label: "旅行・宿泊",
    emoji: "🏨",
    colorClass: "bg-sky-100 text-sky-700",
    keywords: [
      "宿泊",
      "ホテル",
      "旅館",
      "温泉",
      "旅行",
      "航空券",
      "国内線",
      "国際線",
      "宿泊券",
      "宿泊割引",
      "リゾート",
      "ツアー",
      "宿",
      "鉄道優待",
      "乗車券",
      "優待乗車証",
      "乗車証",
      "鉄道",
      "JR",
      "新幹線",
    ],
  },
  {
    key: "themepark",
    label: "エンタメ",
    emoji: "🎬",
    colorClass: "bg-purple-50 text-purple-700",
    keywords: [
      "パスポート",
      "1day",
      "1デー",
      "入場券",
      "テーマパーク",
      "USJ",
      "ディズニー",
      "遊園地",
      "映画",
      "鑑賞券",
      "招待券",
      "ライブ",
      "コンサート",
      "演劇",
      "ゲーム",
      "オンラインゲーム",
      "ゲームアプリ",
      "アニメ",
      "キャラクターグッズ",
    ],
  },
  {
    key: "discount",
    label: "買物・割引",
    emoji: "🛍",
    colorClass: "bg-fuchsia-50 text-fuchsia-700",
    keywords: [
      "割引券",
      "割引",
      "オフ",
      "OFF",
      "優待割引",
      "値引",
      "キャッシュバック",
      "%OFF",
      "％OFF",
      "買物優待券",
      "買物割引",
      "買物カード",
      "ショッピングカード",
      "オーナーズカード",
      "オンラインショップ割引",
      "店舗割引",
    ],
  },
  {
    key: "product",
    label: "食品・自社製品",
    emoji: "🥫",
    colorClass: "bg-teal-50 text-teal-700",
    keywords: [
      "自社製品",
      "自社商品",
      "自社グループ商品",
      "詰め合わせ",
      "詰合せ",
      "セット",
      "贈呈",
      "ビール",
      "飲料",
      "食品",
      "ジュース",
      "ハム",
      "ベーコン",
      "チーズ",
      "バター",
      "オイル",
      "オリーブオイル",
      "砂糖",
      "お米",
      "米券",
      "おこめ",
      "カルピス",
      "お菓子",
      "菓子",
      "せんべい",
      "クッキー",
      "おかき",
      "贈答品",
    ],
  },
  {
    key: "leisure",
    label: "スポーツ・レジャー",
    emoji: "⚽",
    colorClass: "bg-lime-100 text-lime-700",
    keywords: [
      "スポーツクラブ",
      "フィットネス",
      "ジム",
      "ゴルフ",
      "テニス",
      "ボウリング",
      "プール",
      "ヨガ",
      "スキー",
      "スノーボード",
      "キャンプ",
      "キャンプ場",
      "アウトドア",
    ],
  },
];

const CATEGORY_BY_KEY = new Map(BENEFIT_CATEGORIES.map((c) => [c.key, c]));

const matchKeywords = (haystack: string, keywords: string[]): boolean =>
  keywords.some((kw) => haystack.includes(normalizeSearchText(kw)));

export const detectCategories = (benefit: StockBenefit | null): BenefitCategoryInfo[] => {
  if (!benefit) return [];
  const byKey = new Map<BenefitCategoryKey, BenefitCategoryInfo>();

  for (const key of benefit.badgeKeys ?? []) {
    const info = CATEGORY_BY_KEY.get(key);
    if (info) {
      byKey.set(key, info);
    }
  }

  const tierText = (benefit.tieredBenefits ?? []).map((t) => t.content).join(" ");
  const haystack = normalizeSearchText(
    [benefit.content, benefit.notes ?? "", benefit.longTermNote ?? "", tierText].join(" ")
  );
  for (const cat of BENEFIT_CATEGORIES) {
    if (matchKeywords(haystack, cat.keywords)) {
      byKey.set(cat.key, cat);
    }
  }
  return BENEFIT_CATEGORIES.filter((c) => byKey.has(c.key));
};

export const primaryCategory = (benefit: StockBenefit | null): BenefitCategoryInfo | null => {
  const cats = detectCategories(benefit);
  if (cats.length > 0) return cats[0];
  return CATEGORY_BY_KEY.get("other") ?? null;
};

export const FALLBACK_CATEGORY: BenefitCategoryInfo = {
  key: "other",
  label: "その他",
  emoji: "🎀",
  colorClass: "bg-slate-100 text-slate-700",
  keywords: [],
};
