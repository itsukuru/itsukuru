/** 権利確定月末を仮定し、その約3か月後を「優待到着の目安日」として推定する */
function lastDayOfMonth(year: number, month1Based: number): Date {
  return new Date(year, month1Based, 0, 12, 0, 0, 0);
}

export function addCalendarMonths(date: Date, delta: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-index
  const d = date.getDate();
  const nd = new Date(y, m + delta, d, 12, 0, 0, 0);
  /** 末日オーバーした月は月末に丸める（例 1/31 +1月 → 2/28） */
  if (nd.getDate() !== d) nd.setDate(0);
  return nd;
}

/**
 * 「今」を基準に、次に来るサイクルの届く目安日（単一）。
 * crowd 報告が無いときの並べ替え・表示用。
 */
export function approxNextArrivalFromRightsMonth(
  rightsMonth1Based: number,
  from = new Date()
): Date {
  const fromMid = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    12,
    0,
    0,
    0
  );

  for (let ry = fromMid.getFullYear() - 1; ry <= fromMid.getFullYear() + 2; ry += 1) {
    const rightsEnd = lastDayOfMonth(ry, rightsMonth1Based);
    const ship = addCalendarMonths(rightsEnd, 3);
    if (ship.getTime() >= fromMid.getTime()) return ship;
  }

  /** フォールバック（理論上不達） */
  const rightsEnd = lastDayOfMonth(fromMid.getFullYear() + 1, rightsMonth1Based);
  return addCalendarMonths(rightsEnd, 3);
}
