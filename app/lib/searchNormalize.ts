/**
 * 検索用の文字列正規化（銘柄マスタ・優待カテゴリ等で共有）。
 * stocksClient と循環参照にならないよう独立モジュールに置く。
 */
export const normalizeSearchText = (input: string): string => {
  const stripInvisible = (s: string) =>
    s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");

  const mapHiraganaToKatakana = (cp: number): string | null => {
    if (cp >= 0x3041 && cp <= 0x3096) {
      return String.fromCodePoint(cp + 0x60);
    }
    switch (cp) {
      case 0x3097:
        return "\u30f5";
      case 0x3098:
        return "\u30f6";
      case 0x309d:
        return "\u30fd";
      case 0x309e:
        return "\u30fe";
      case 0x309f:
        return "\u30ff";
      default:
        return null;
    }
  };

  const cleaned = stripInvisible(input);

  try {
    const folded = cleaned.toLowerCase().normalize("NFKC").replace(/\s+/g, "");

    const katakana = folded.replace(/[\u3041-\u309f]/gu, (ch) => {
      const cp = ch.codePointAt(0)!;
      if (cp === 0x3099 || cp === 0x309a) {
        return ch;
      }
      const mapped = mapHiraganaToKatakana(cp);
      return mapped ?? ch;
    });

    return katakana.normalize("NFC");
  } catch {
    return stripInvisible(cleaned.toLowerCase().replace(/\s+/g, ""));
  }
};
