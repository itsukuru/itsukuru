import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

type ImportedStock = {
  code: string;
  name: string;
  market: string;
  industry: string;
};

const JPX_PAGE_URL = "https://www.jpx.co.jp/markets/statistics-equities/misc/01.html";
const JPX_BASE_URL = "https://www.jpx.co.jp";

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const NON_BENEFIT_MARKET_PATTERN =
  /(ETF|ETN|REIT|インフラファンド|ベンチャーファンド|カントリーファンド|外国株式|PRO\s*Market)/i;

const stripMarketSuffix = (market: string): string =>
  market
    .replace(/[（(]\s*内国株式\s*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isBenefitEligible = (market: string): boolean =>
  !!market && !NON_BENEFIT_MARKET_PATTERN.test(market);

const findColumnIndex = (headers: string[], candidates: string[]) =>
  headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));

const toAbsoluteUrl = (raw: string): string => {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `${JPX_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const extractDownloadUrls = (html: string): string[] => {
  const rawMatches = [...html.matchAll(/href="([^"]+\.(?:xlsx|xls))"/gi)].map((m) => m[1]);
  if (rawMatches.length === 0) {
    return [];
  }

  // JPXページには複数Excelリンクが含まれるため、上場銘柄一覧らしいものを優先
  const sorted = rawMatches.sort((a, b) => {
    const score = (value: string) => {
      let s = 0;
      const v = value.toLowerCase();
      if (v.includes("data_j")) s += 100;
      if (v.includes("meigara")) s += 80;
      if (v.includes("stock")) s += 60;
      if (v.includes("topix")) s -= 50;
      return s;
    };
    return score(b) - score(a);
  });

  return Array.from(new Set(sorted.map(toAbsoluteUrl)));
};

const parseStocksFromSheet = (rows: unknown[][]): ImportedStock[] => {
  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeText(cell);
      return text.includes("コード") && (text.includes("銘柄名") || text.includes("銘柄"));
    })
  );

  if (headerRowIndex < 0) {
    return [];
  }

  const headers = rows[headerRowIndex].map((cell) => normalizeText(cell));
  const codeIdx = findColumnIndex(headers, ["コード"]);
  const nameIdx = findColumnIndex(headers, ["銘柄名", "銘柄"]);
  const marketIdx = findColumnIndex(headers, ["市場", "市場・商品区分"]);
  const industryIdx = findColumnIndex(headers, ["33業種", "17業種", "業種"]);

  if (codeIdx < 0 || nameIdx < 0) {
    return [];
  }

  const parsed: ImportedStock[] = [];
  for (const row of rows.slice(headerRowIndex + 1)) {
    const code = normalizeText(row[codeIdx]);
    const name = normalizeText(row[nameIdx]);
    if (!/^\d{4}$/.test(code) || !name || name.includes("合計")) {
      continue;
    }
    const rawMarket =
      marketIdx >= 0 ? normalizeText(row[marketIdx]) : "";
    if (rawMarket && !isBenefitEligible(rawMarket)) {
      continue;
    }
    parsed.push({
      code,
      name,
      market: stripMarketSuffix(rawMarket) || "未設定",
      industry: industryIdx >= 0 ? normalizeText(row[industryIdx]) || "未設定" : "未設定",
    });
  }

  return parsed;
};

const parseStocksHeuristic = (rows: unknown[][]): ImportedStock[] => {
  const parsed: ImportedStock[] = [];

  for (const row of rows) {
    const cells = row.map((cell) => normalizeText(cell));
    const codeIdx = cells.findIndex((cell) => /^\d{4}$/.test(cell));
    if (codeIdx < 0) {
      continue;
    }

    const code = cells[codeIdx];
    const name = cells[codeIdx + 1] ?? "";
    if (!name || name.includes("合計") || name.includes("銘柄")) {
      continue;
    }

    const rawMarket = cells[codeIdx + 2] ?? "";
    if (rawMarket && !isBenefitEligible(rawMarket)) {
      continue;
    }
    const industry = cells[codeIdx + 3] || "未設定";
    parsed.push({
      code,
      name,
      market: stripMarketSuffix(rawMarket) || "未設定",
      industry,
    });
  }

  return parsed;
};

const parseStocksFromWorkbook = (workbook: XLSX.WorkBook): ImportedStock[] => {
  const merged = new Map<string, ImportedStock>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as unknown[][];
    const stocks = parseStocksFromSheet(rows);
    const fallbackStocks = stocks.length > 0 ? stocks : parseStocksHeuristic(rows);
    for (const stock of fallbackStocks) {
      merged.set(stock.code, stock);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.code.localeCompare(b.code));
};

export async function GET() {
  try {
    const pageRes = await fetch(JPX_PAGE_URL, {
      headers: { "user-agent": "stock-benefits-arrival/1.0" },
      cache: "no-store",
    });
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `JPXページ取得に失敗しました: ${pageRes.status}` },
        { status: 502 }
      );
    }
    const html = await pageRes.text();
    const downloadUrls = extractDownloadUrls(html);
    if (downloadUrls.length === 0) {
      return NextResponse.json(
        { error: "JPXファイルURLが見つかりませんでした。" },
        { status: 502 }
      );
    }
    let bestResult:
      | {
          sourceUrl: string;
          stocks: ImportedStock[];
          sheetCount: number;
        }
      | null = null;
    const trialErrors: string[] = [];

    for (const downloadUrl of downloadUrls.slice(0, 10)) {
      try {
        const fileRes = await fetch(downloadUrl, {
          headers: { "user-agent": "stock-benefits-arrival/1.0" },
          cache: "no-store",
        });
        if (!fileRes.ok) {
          trialErrors.push(`${downloadUrl} => HTTP ${fileRes.status}`);
          continue;
        }

        const buffer = await fileRes.arrayBuffer();
        const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
        const stocks = parseStocksFromWorkbook(workbook);

        if (!bestResult || stocks.length > bestResult.stocks.length) {
          bestResult = {
            sourceUrl: downloadUrl,
            stocks,
            sheetCount: workbook.SheetNames.length,
          };
        }
      } catch (error) {
        trialErrors.push(
          `${downloadUrl} => ${error instanceof Error ? error.message : "読み込み失敗"}`
        );
      }
    }

    if (!bestResult || bestResult.stocks.length === 0) {
      return NextResponse.json(
        {
          error:
            "銘柄データを解析できませんでした。JPXファイル形式が変わった可能性があります。",
          details: trialErrors.slice(0, 3),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sourceUrl: bestResult.sourceUrl,
      count: bestResult.stocks.length,
      sheetCount: bestResult.sheetCount,
      stocks: bestResult.stocks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "不明なエラーが発生しました。" },
      { status: 500 }
    );
  }
}
