import type { StockBenefit } from "@/app/data/stockBenefits";

const isAbolishedEntry = (b: StockBenefit): boolean => {
  if (b.confidence === "abolished") return true;
  if (b.minShares === 0 && b.rightsMonths === "-") return true;
  if (/実施なし|廃止/.test(b.content)) return true;
  return false;
};

const entryScore = (b: StockBenefit): number => {
  let s = 0;
  const abolished = isAbolishedEntry(b);
  if (abolished) {
    s += 50;
    if (b.confidence === "abolished") s += 40;
    if (b.notes && b.notes.length > 20) s += 5;
    return s;
  }
  s += 100;
  if (b.confidence === "verified") s += 30;
  else if (b.confidence === "stable") s += 25;
  else if (b.confidence === "uncertain") s += 8;
  if (b.minShares >= 100) s += 5;
  if (b.irUrl) s += 10;
  if (b.expectedArrival) s += 8;
  if (b.badgeKeys?.length) s += 4;
  if (b.tieredBenefits?.length) s += 6;
  if (b.noticeArrival || b.actualArrival) s += 4;
  if (b.longTermNote) s += 3;
  if (/本ファイル内の重複/.test(b.notes ?? "")) s -= 20;
  return s;
};

const pickHighestScore = (items: StockBenefit[]): StockBenefit =>
  items.reduce((best, b) => (entryScore(b) > entryScore(best) ? b : best), items[0]);

/**
 * 同一 stockCode のシード条を1件に統合する。
 * - 実施なし（abolished）と現役が混在する場合は、確度・内容の充実度で採用側を決める
 * - 現役のみ複数ある場合はスコア最高の1件
 */
export const pickSeedBenefitForCode = (items: StockBenefit[]): StockBenefit => {
  if (items.length === 1) return items[0];

  const abolished = items.filter(isAbolishedEntry);
  const active = items.filter((b) => !isAbolishedEntry(b));

  if (active.length === 0) return pickHighestScore(abolished);
  if (abolished.length === 0) return pickHighestScore(active);

  const activeLooksLikeStaleDup = active.every((b) =>
    /本ファイル内の重複/.test(b.notes ?? "")
  );

  /** 「廃止」と明示されている条があるときは、検証済みの現役条が無い限り廃止側を優先する（ライオン等の stale 現役片と混在させない） */
  const hasExplicitAbolished = abolished.some((b) => b.confidence === "abolished");
  const activeHasVerified = active.some((b) => b.confidence === "verified");

  if (hasExplicitAbolished && (!activeHasVerified || activeLooksLikeStaleDup)) {
    return pickHighestScore(abolished);
  }

  /** confidence 未設定でも本文が実施終了なら、verified/stable 以外の現役片より優先 */
  const abolishedReadsTerminated = abolished.some((b) =>
    /現在は実施なし|実施していません|をもって廃止/.test(`${b.content}\n${b.notes ?? ""}`)
  );
  const activeStrong = active.some(
    (b) => b.confidence === "stable" || b.confidence === "verified"
  );

  if (abolishedReadsTerminated && (!activeStrong || activeLooksLikeStaleDup)) {
    return pickHighestScore(abolished);
  }

  return pickHighestScore(active);
};

/** シード配列を銘柄コード単位に重複排除（コード昇順で返す） */
export const dedupeSeedStockBenefits = (raw: StockBenefit[]): StockBenefit[] => {
  const groups = new Map<string, StockBenefit[]>();
  for (const b of raw) {
    const xs = groups.get(b.stockCode) ?? [];
    xs.push(b);
    groups.set(b.stockCode, xs);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, xs]) => pickSeedBenefitForCode(xs));
};
