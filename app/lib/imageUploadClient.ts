/**
 * 投稿画像のローカル処理（リサイズ → data URL）。
 *
 * 現状はオンライン同期を行わず、すべてブラウザ内に data URL として保存する。
 * 将来クラウド連携を入れる場合は、ここで画像をサーバーに送る処理を追加する。
 *
 * 設計:
 *   - 元画像は Canvas でリサイズ＆JPEG 化（最大 1280px / quality 0.82）
 *   - 結果は data: URL として返し、BenefitReport.imageUrl / UsageReport.imageUrl に
 *     そのまま入れる
 */

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;
/** 5MB を超える元画像は拒否する（DoS / バグの簡易ガード） */
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

/** 受け付ける MIME / 拡張子のホワイトリスト */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

/**
 * ファイル先頭バイトを読み「本当に画像か」を判定する。
 * 拡張子や Content-Type だけだと偽装可能なため、マジックナンバーを直接確認する。
 *
 * 対応シグネチャ:
 *   JPEG: FF D8 FF
 *   PNG : 89 50 4E 47 0D 0A 1A 0A
 *   WebP: 52 49 46 46 .. .. .. .. 57 45 42 50  (RIFF....WEBP)
 *   HEIF/HEIC: 00 00 00 .. 66 74 79 70 (ftyp)
 *   GIF (許可しないが識別のみ): 47 49 46 38
 */
const readMagicBytes = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      if (buffer instanceof ArrayBuffer) {
        resolve(new Uint8Array(buffer.slice(0, 16)));
      } else {
        reject(new Error("ファイル先頭の読み込みに失敗しました"));
      }
    };
    reader.onerror = () => reject(new Error("ファイル読込エラー"));
    reader.readAsArrayBuffer(file.slice(0, 16));
  });

const isImageBySignature = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;
  // WebP (RIFF....WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true;
  // HEIF / HEIC ("ftyp" at offset 4)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  )
    return true;
  return false;
};

const getExtension = (filename: string): string => {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx + 1).toLowerCase();
};

export type ImageUploadResult = {
  /** UI と localStorage に保存する URL（data: 形式） */
  url: string;
  /** 互換のため残す。現状は常に false（クラウド未連携） */
  uploaded: boolean;
  /** 圧縮後の画像サイズ（バイト） */
  byteSize: number;
};

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(blob);
  });

const loadHTMLImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像のデコードに失敗しました"));
    img.src = src;
  });

/**
 * File を Canvas で縮小し JPEG Blob として返す。
 */
const compressImage = async (file: File): Promise<Blob> => {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadHTMLImage(dataUrl);

  const { width: w0, height: h0 } = img;
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(w0, h0));
  const w = Math.round(w0 * ratio);
  const h = Math.round(h0 * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas を取得できませんでした");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Blob 変換に失敗しました"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
  return blob;
};

/**
 * 画像ファイルをリサイズして data URL として返す。
 *
 * @param file <input type="file"> から得た File
 * @param _folder 互換のため受け取るが、現状未使用（将来のサーバー保存用）
 */
export const uploadReportImage = async (
  file: File,
  _folder: "arrival" | "usage"
): Promise<ImageUploadResult> => {
  void _folder;
  // 1. MIME タイプ検証（クライアント申告ベース、偽装可能）
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "JPEG / PNG / WebP / HEIC 形式の画像ファイルを選択してください"
    );
  }

  // 2. 拡張子検証（ホワイトリスト）
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("対応拡張子: .jpg .jpeg .png .webp .heic .heif");
  }

  // 3. サイズ検証（DoS / ストレージ枯渇対策）
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("画像は 5MB 以下にしてください");
  }
  if (file.size < 64) {
    throw new Error("ファイルが小さすぎます（破損または不正ファイル）");
  }

  // 4. マジックバイト検証（真の画像かを確認、最重要）
  // 拡張子と Content-Type は偽装可能だが、先頭バイトは画像でないと
  // ブラウザがデコードできないため、ここで弾く。
  const magic = await readMagicBytes(file);
  if (!isImageBySignature(magic)) {
    throw new Error(
      "画像形式として認識できませんでした。別のファイルをお試しください。"
    );
  }

  // 5. Canvas デコード経由でリサイズ（任意の埋め込みデータ・EXIF・スクリプトを除去）
  const compressed = await compressImage(file);
  const dataUrl = await readAsDataUrl(compressed);
  return {
    url: dataUrl,
    uploaded: false,
    byteSize: compressed.size,
  };
};
