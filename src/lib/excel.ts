import type { Product } from "@/lib/types";
import { getCostPrice } from "@/lib/store";
import {
  categoryFromLabel,
  categoryLabel,
  parseExpiryDate,
  type PharmacyDetails,
} from "@/lib/pharmacy";

export type InventoryExcelRow = {
  name: string;
  quantity: number;
  costPrice: number;
  price: number;
  barcode?: string;
} & PharmacyDetails;

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
const GENERIC_KEYS = ["marca", "principio activo", "generico", "genérico", "droga"];
const PRESENTATION_KEYS = ["presentacion", "presentación"];
const CONCENTRATION_KEYS = ["contenido", "concentracion", "concentración", "dosis"];
const LAB_KEYS = ["proveedor", "laboratorio", "lab"];
const LOT_KEYS = ["lote", "lot", "batch"];
const EXPIRY_KEYS = ["vencimiento", "vence", "caducidad", "expira"];
const CATEGORY_KEYS = ["categoria", "categoría"];
const RX_KEYS = ["receta", "requiere receta"];

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
    const found = headers.find((h) => h === c);
    if (found) return found;
  }
  for (const c of candidates) {
    const found = headers.find((h) => {
      if (!h.includes(c)) return false;
      // Evita confundir "precio costo" con "precio" (venta)
      if (c === "precio" && h.includes("costo")) return false;
      if (c === "precio" && h.includes("compra")) return false;
      return true;
    });
    if (found) return found;
  }
  return null;
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

function excelDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return utc.toISOString().slice(0, 10);
  }
  return parseExpiryDate(cellText(value)) ?? undefined;
}

function excelBool(value: unknown): boolean {
  const text = cellText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return ["si", "1", "true", "x", "yes"].includes(text);
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
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!matrix.length) {
    throw new Error("La hoja de inventario está vacía.");
  }

  // Busca la fila de encabezados (puede haber título arriba)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const cells = (matrix[i] ?? []).map((c) => normalizeHeader(c));
    const hasName = cells.some((c) =>
      NAME_KEYS.some((k) => c === k || c.includes(k)),
    );
    const hasQty = cells.some((c) =>
      QTY_KEYS.some((k) => c === k || c.includes(k)),
    );
    const hasCost = cells.some((c) =>
      COST_KEYS.some((k) => c === k || c.includes(k)),
    );
    const hasPrice = cells.some((c) =>
      PRICE_KEYS.some((k) => c === k || c.includes(k)),
    );
    if (hasName && hasQty && hasCost && hasPrice) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    throw new Error(
      "No se encontró la tabla. Columnas requeridas: Nombre producto, Cantidad, Precio costo, Precio venta.",
    );
  }

  const headerCells = (matrix[headerIdx] ?? []).map((c) => String(c ?? ""));
  const headers = headerCells.map(normalizeHeader);

  const nameCol = pickKey(headers, NAME_KEYS);
  const qtyCol = pickKey(headers, QTY_KEYS);
  const costCol = pickKey(headers, COST_KEYS);
  const priceCol = pickKey(headers, PRICE_KEYS);
  const barcodeCol = pickKey(headers, BARCODE_KEYS);
  const genericCol = pickKey(headers, GENERIC_KEYS);
  const presentationCol = pickKey(headers, PRESENTATION_KEYS);
  const concentrationCol = pickKey(headers, CONCENTRATION_KEYS);
  const labCol = pickKey(headers, LAB_KEYS);
  const lotCol = pickKey(headers, LOT_KEYS);
  const expiryCol = pickKey(headers, EXPIRY_KEYS);
  const categoryCol = pickKey(headers, CATEGORY_KEYS);
  const rxCol = pickKey(headers, RX_KEYS);

  if (!nameCol || !qtyCol || !costCol || !priceCol) {
    throw new Error(
      "Columnas requeridas: Nombre producto, Cantidad, Precio costo, Precio venta.",
    );
  }

  const nameI = headers.indexOf(nameCol);
  const qtyI = headers.indexOf(qtyCol);
  const costI = headers.indexOf(costCol);
  const priceI = headers.indexOf(priceCol);
  const barcodeI = barcodeCol ? headers.indexOf(barcodeCol) : -1;
  const genericI = genericCol ? headers.indexOf(genericCol) : -1;
  const presentationI = presentationCol ? headers.indexOf(presentationCol) : -1;
  const concentrationI = concentrationCol
    ? headers.indexOf(concentrationCol)
    : -1;
  const labI = labCol ? headers.indexOf(labCol) : -1;
  const lotI = lotCol ? headers.indexOf(lotCol) : -1;
  const expiryI = expiryCol ? headers.indexOf(expiryCol) : -1;
  const categoryI = categoryCol ? headers.indexOf(categoryCol) : -1;
  const rxI = rxCol ? headers.indexOf(rxCol) : -1;

  const rows: InventoryExcelRow[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const name = String(line[nameI] ?? "").trim();
    if (!name) continue;

    const quantity = toNumber(line[qtyI]);
    const costPrice = toNumber(line[costI]);
    const price = toNumber(line[priceI]);

    if (quantity === null || costPrice === null || price === null) {
      throw new Error(
        `Fila ${i + 1}: cantidad, costo o precio inválidos (${name}).`,
      );
    }
    if (quantity < 0 || costPrice < 0 || price < 0) {
      throw new Error(
        `Fila ${i + 1}: no se permiten valores negativos (${name}).`,
      );
    }

    const barcode =
      barcodeI >= 0
        ? String(line[barcodeI] ?? "").trim() || undefined
        : undefined;
    const expiresRaw = expiryI >= 0 ? line[expiryI] : "";
    if (expiryI >= 0 && cellText(expiresRaw) && !excelDate(expiresRaw)) {
      throw new Error(
        `Fila ${i + 1}: vencimiento inválido (${name}). Usa AAAA-MM-DD.`,
      );
    }
    const category =
      categoryI >= 0 ? categoryFromLabel(cellText(line[categoryI])) : undefined;

    rows.push({
      name,
      quantity: Math.floor(quantity),
      costPrice,
      price,
      barcode,
      genericName: genericI >= 0 ? cellText(line[genericI]) || undefined : undefined,
      presentation:
        presentationI >= 0 ? cellText(line[presentationI]) || undefined : undefined,
      concentration:
        concentrationI >= 0
          ? cellText(line[concentrationI]) || undefined
          : undefined,
      laboratory: labI >= 0 ? cellText(line[labI]) || undefined : undefined,
      lot: lotI >= 0 ? cellText(line[lotI]) || undefined : undefined,
      expiresAt: expiryI >= 0 ? excelDate(expiresRaw) : undefined,
      category,
      requiresPrescription: rxI >= 0 ? excelBool(line[rxI]) : undefined,
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
  opts?: {
    companyName?: string;
    slogan?: string;
    address?: string;
    phone?: string;
  },
) {
  const XLSX = await import("xlsx-js-style");
  const companyName = opts?.companyName?.trim() || "TIENDA";
  const slogan = opts?.slogan?.trim();
  const address = opts?.address?.trim();
  const phone = opts?.phone?.trim();

  const sorted = [...products].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );

  const headers = [
    "#",
    "Nombre producto",
    "Cantidad",
    "Precio costo",
    "Precio venta",
    "Código de barras",
    "Marca",
    "Presentación",
    "Contenido",
    "Proveedor",
    "Lote",
    "Vencimiento",
    "Categoría",
    "Receta",
    "Conteo físico",
  ];

  const dataRows: (string | number)[][] = sorted.map((p, index) => [
    index + 1,
    p.name,
    p.quantity,
    Number(getCostPrice(p).toFixed(2)),
    Number(p.price.toFixed(2)),
    p.barcode ?? "",
    p.genericName ?? "",
    p.presentation ?? "",
    p.concentration ?? "",
    p.laboratory ?? "",
    p.lot ?? "",
    p.expiresAt ?? "",
    categoryLabel(p.category),
    p.requiresPrescription ? "Sí" : "",
    "",
  ]);

  // Encabezado institucional (mismo criterio que el PDF) + tabla editable
  const headerBlock: (string | number)[][] = [[companyName]];
  if (slogan) headerBlock.push([slogan]);
  if (address || phone) {
    headerBlock.push([
      [address, phone ? `Tel. ${phone}` : ""].filter(Boolean).join(" · "),
    ]);
  }
  headerBlock.push(["Inventario de productos"]);
  const titleExcelRow = headerBlock.length;
  headerBlock.push(
    [`Fecha de emisión: ${new Date().toLocaleString("es-GT")}`],
    [`Productos listados: ${sorted.length}`],
    ["Fuente: módulo Inventario · stock vigente al momento de la descarga"],
    [],
  );

  const aoa: (string | number)[][] = [
    ...headerBlock,
    headers,
    ...dataRows,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const headerRowExcel = headerBlock.length + 1; // fila 1-based del encabezado de columnas
  const firstDataRow = headerRowExcel + 1;
  const lastDataRow = Math.max(firstDataRow, headerRowExcel + dataRows.length);
  const lastColumn = headers.length;
  const accent = "0B3D32";
  const accentSoft = "E7F5EE";
  const stripe = "F3F6F4";
  const borderColor = "C5D6CC";

  sheet["!cols"] = [
    { wch: 5 },
    { wch: 32 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
  ];
  sheet["!rows"] = aoa.map((_, index) => ({
    hpt:
      index === 0
        ? 27
        : index === titleExcelRow - 1
          ? 23
          : index === headerRowExcel - 1
            ? 25
            : index >= firstDataRow - 1
              ? 21
              : 17,
  }));
  sheet["!merges"] = Array.from(
    { length: headerBlock.length - 1 },
    (_, index) => ({
      s: { r: index, c: 0 },
      e: { r: index, c: lastColumn - 1 },
    }),
  );
  sheet["!autofilter"] = {
    ref: `A${headerRowExcel}:O${lastDataRow}`,
  };

  (sheet as { ["!freeze"]?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: headerRowExcel,
    topLeftCell: `A${headerRowExcel + 1}`,
    activeCell: `A${headerRowExcel + 1}`,
  };

  // Encabezado institucional centrado y visualmente separado.
  for (let row = 1; row <= headerBlock.length - 1; row++) {
    const cell = sheet[`A${row}`];
    if (!cell) continue;
    const isCompany = row === 1;
    const isTitle = row === titleExcelRow;
    cell.s = {
      font: {
        bold: isCompany || isTitle,
        sz: isCompany ? 17 : isTitle ? 13 : 10,
        color: { rgb: isCompany ? "FFFFFF" : accent },
      },
      fill: {
        patternType: "solid",
        fgColor: { rgb: isCompany ? accent : isTitle ? accentSoft : "FFFFFF" },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };
  }

  const thinBorder = {
    top: { style: "thin", color: { rgb: borderColor } },
    bottom: { style: "thin", color: { rgb: borderColor } },
    left: { style: "thin", color: { rgb: borderColor } },
    right: { style: "thin", color: { rgb: borderColor } },
  };

  // Barra de títulos de la tabla.
  for (let col = 0; col < lastColumn; col++) {
    const addr = XLSX.utils.encode_cell({
      r: headerRowExcel - 1,
      c: col,
    });
    const cell = sheet[addr];
    if (!cell) continue;
    cell.s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill: { patternType: "solid", fgColor: { rgb: accent } },
      alignment: {
        horizontal: col === 1 ? "left" : "center",
        vertical: "center",
        wrapText: true,
      },
      border: thinBorder,
    };
  }

  for (let r = 0; r < dataRows.length; r++) {
    const excelRow = headerRowExcel + 1 + r;
    const fillColor = r % 2 === 0 ? "FFFFFF" : stripe;

    // Bordes horizontales y verticales, alineación y filas alternadas.
    for (let col = 0; col < lastColumn; col++) {
      const addr = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
      const cell = sheet[addr] ?? {
        t: "s",
        v: "",
      };
      sheet[addr] = cell;
      cell.s = {
        font: { color: { rgb: "1E293B" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: fillColor } },
        alignment: {
          horizontal: col === 1 || col === 5 ? "left" : "center",
          vertical: "center",
          wrapText: col === 1,
        },
        border: thinBorder,
      };
    }

    for (const col of ["C", "D", "E"] as const) {
      const addr = `${col}${excelRow}`;
      const cell = sheet[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        if (col === "C") cell.z = "0";
        else cell.z = "0.00";
      }
    }
    const numAddr = `A${excelRow}`;
    if (sheet[numAddr] && typeof sheet[numAddr].v === "number") {
      sheet[numAddr].t = "n";
      sheet[numAddr].z = "0";
    }
  }

  // Formatos monetarios y campo de conteo resaltado para edición manual.
  for (let row = firstDataRow; row <= lastDataRow; row++) {
    for (const col of ["D", "E"]) {
      const cell = sheet[`${col}${row}`];
      if (cell) cell.z = '"Q" #,##0.00';
    }
    const countCell = sheet[`O${row}`];
    if (countCell) {
      countCell.s = {
        ...countCell.s,
        fill: { patternType: "solid", fgColor: { rgb: "FFF4CC" } },
        font: { bold: true, color: { rgb: "7A4E00" }, sz: 10 },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      };
    }
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Inventario");
  XLSX.writeFile(
    book,
    "inventario.xlsx",
    { cellStyles: true },
  );
}
