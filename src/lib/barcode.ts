import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  type Result,
} from "@zxing/library";
function createReader() {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ]);
  return new BrowserMultiFormatReader(hints);
}
function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}
async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    image.src = url;
  });
}
function drawScaled(
  img: HTMLImageElement,
  maxSize: number,
  invert = false,
) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (invert) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = 255 - data.data[i];
      data.data[i + 1] = 255 - data.data[i + 1];
      data.data[i + 2] = 255 - data.data[i + 2];
    }
    ctx.putImageData(data, 0, 0);
  }
  return canvas;
}
function tryDecode(reader: BrowserMultiFormatReader, canvas: HTMLCanvasElement) {
  try {
    return reader.decodeFromCanvas(canvas);
  } catch {
    return null;
  }
}
/** Lee un código de barras desde una foto (funciona en HTTP / PWA). */
export async function decodeBarcodeFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }
  const url = URL.createObjectURL(file);
  const reader = createReader();
  try {
    try {
      const direct = await reader.decodeFromImageUrl(url);
      const code = normalizeCode(direct.getText());
      if (code) return code;
    } catch {
      // continúa con canvas
    }
    const img = await loadImage(url);
    const sizes = [2200, 1600, 1200, 900, 640];
    for (const size of sizes) {
      for (const invert of [false, true]) {
        const canvas = drawScaled(img, size, invert);
        const result = tryDecode(reader, canvas) as Result | null;
        if (result) {
          const code = normalizeCode(result.getText());
          if (code) return code;
        }
      }
    }
    throw new Error("No se detectó código de barras en la foto.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function normalizeBarcode(value: string) {
  return normalizeCode(value);
}
export function barcodesMatch(a?: string | null, b?: string | null) {
  const left = normalizeBarcode(a ?? "");
  const right = normalizeBarcode(b ?? "");
  if (!left || !right) return false;
  if (left === right) return true;
  // algunos lectores omiten ceros a la izquierda
  return left.replace(/^0+/, "") === right.replace(/^0+/, "");
}
