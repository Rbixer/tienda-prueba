import type { Product } from "@/lib/types";
import { getCostPrice } from "@/lib/store";

export type InventoryExcelRow = {
  name: string;
  quantity: number;
  costPrice: number;
  price: number;
  barcode?: string;
};

const NAME_KEYS = [
  "nombre producto",
  "nombre",
  "producto",
  "name",
  "product",
];
const QTY_KEYS = ["cantidad", "stock", "qty", "quantity", "cant"];
const COST_KEYS = [
  "precio costo",
  "costo",
  "cost price",
  "cost",
  "precio de costo",
];
const PRICE_KEYS = [
  "precio venta",
  "precio",
  "venta",
  "price",
  "sale price",
  "precio de venta",
];
const BARCODE_KEYS = [
  "codigo de barras",
  "código de barras",
  "codigo",
  "código",
  "barcode",
  "barra",
  "ean",
];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function pickKey(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const found = headers.find((h) => h === c || h.includes(c));
    if (found) return found;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value
      .trim()
      .replace(/Q\.?\s*/gi, "")
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Lee un .xlsx/.xls/.csv y devuelve filas de inventario. */
export async function parseInventoryExcel(
  file: File,
): Promise<{ rows: InventoryExcelRow[]; sheetName: string }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });

  const preferred =
    book.SheetNames.find((n) => normalizeHeader(n).includes("inventario")) ??
    book.SheetNames.find((n) => !normalizeHeader(n).includes("resumen")) ??
    book.SheetNames[0];

  if (!preferred) {
    throw new Error("El archivo Excel no tiene hojas.");
  }

  const sheet = book.Sheets[preferred];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (!raw.length) {
    throw new Error("La hoja de inventario está vacía.");
  }

  const headers = Object.keys(raw[0]).map(normalizeHeader);
  const originalKeys = Object.keys(raw[0]);
  const keyMap = new Map(
    originalKeys.map((k) => [normalizeHeader(k), k] as const),
  );

  const nameH = pickKey(headers, NAME_KEYS);
  const qtyH = pickKey(headers, QTY_KEYS);
  const costH = pickKey(headers, COST_KEYS);
  const priceH = pickKey(headers, PRICE_KEYS);
  const barcodeH = pickKey(headers, BARCODE_KEYS);

  if (!nameH || !qtyH || !costH || !priceH) {
    throw new Error(
      "Columnas requeridas: Nombre producto, Cantidad, Precio costo, Precio venta.",
    );
  }

  const nameKey = keyMap.get(nameH)!;
  const qtyKey = keyMap.get(qtyH)!;
  const costKey = keyMap.get(costH)!;
  const priceKey = keyMap.get(priceH)!;
  const barcodeKey = barcodeH ? keyMap.get(barcodeH) : undefined;

  const rows: InventoryExcelRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    const name = String(line[nameKey] ?? "").trim();
    if (!name) continue;

    const quantity = toNumber(line[qtyKey]);
    const costPrice = toNumber(line[costKey]);
    const price = toNumber(line[priceKey]);

    if (quantity === null || costPrice === null || price === null) {
      throw new Error(
        `Fila ${i + 2}: cantidad, costo o precio inválidos (${name}).`,
      );
    }
    if (quantity < 0 || costPrice < 0 || price < 0) {
      throw new Error(
        `Fila ${i + 2}: no se permiten valores negativos (${name}).`,
      );
    }

    const barcode = barcodeKey
      ? String(line[barcodeKey] ?? "").trim() || undefined
      : undefined;

    rows.push({
      name,
      quantity: Math.floor(quantity),
      costPrice,
      price,
      barcode,
    });
  }

  if (!rows.length) {
    throw new Error("No se encontraron productos válidos en el archivo.");
  }

  return { rows, sheetName: preferred };
}

export async function downloadInventoryExcel(
  products: Product[],
  branchName: string,
  companyName = "MI BARRIO",
) {
  const XLSX = await import("xlsx");
  const rows = products.map((p) => ({
    "Nombre producto": p.name,
    Cantidad: p.quantity,
    "Precio costo": getCostPrice(p),
    "Precio venta": p.price,
    "Código de barras": p.barcode ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(
    rows.length
      ? rows
      : [
          {
            "Nombre producto": "",
            Cantidad: "",
            "Precio costo": "",
            "Precio venta": "",
            "Código de barras": "",
          },
        ],
  );
  sheet["!cols"] = [
    { wch: 36 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
  ];

  const meta = XLSX.utils.aoa_to_sheet([
    [companyName],
    ["Inventario"],
    [`Sucursal / ubicación: ${branchName}`],
    [`Fecha: ${new Date().toLocaleString("es-GT")}`],
    [`Total productos: ${products.length}`],
    [],
    ["Columnas para importar:"],
    [
      "Nombre producto | Cantidad | Precio costo | Precio venta | Código de barras (opcional)",
    ],
  ]);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, meta, "Resumen");
  XLSX.utils.book_append_sheet(book, sheet, "Inventario");
  XLSX.writeFile(
    book,
    `inventario-${branchName.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
  );
}
