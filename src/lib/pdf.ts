import type { PdfStyleSettings, PdfTextStyle, Product, Sale } from "@/lib/types";
import {
  formatDate,
  formatMoney,
  getCostPrice,
  normalizePdfStyle,
} from "@/lib/store";
import type { jsPDF } from "jspdf";

type Rgb = [number, number, number];

type DocHeaderOpts = {
  companyName: string;
  slogan?: string;
  address?: string;
  phone?: string;
  logoDataUrl?: string;
  pdfStyle?: PdfStyleSettings;
  documentTitle: string;
  /** De dónde proviene la información (sucursal, período, etc.) */
  sourceLines: string[];
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  contentRight: 196,
};

const COLORS = {
  navy: [11, 37, 69] as Rgb,
  navySoft: [20, 53, 95] as Rgb,
  muted: [100, 116, 139] as Rgb,
  line: [226, 232, 240] as Rgb,
  ink: [30, 41, 59] as Rgb,
  softBg: [248, 250, 252] as Rgb,
};

function hexToRgb(hex?: string, fallback: Rgb = COLORS.navy): Rgb {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function applyTextStyle(doc: jsPDF, style: PdfTextStyle | undefined, size: number) {
  const bold = style?.bold ?? false;
  const italic = style?.italic ?? false;
  const fontStyle =
    bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(size);
  doc.setTextColor(...hexToRgb(style?.color, COLORS.ink));
}

async function loadImageSize(dataUrl: string): Promise<{
  w: number;
  h: number;
} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Encabezado institucional: logo + nombre + slogan + contacto + origen. */
async function drawDocumentHeader(
  doc: jsPDF,
  opts: DocHeaderOpts,
): Promise<{ y: number; accent: Rgb }> {
  const style = normalizePdfStyle(opts.pdfStyle);
  const accent = hexToRgb(style.accentColor, COLORS.navy);
  const { margin, contentRight, width } = PAGE;
  let y = 12;

  // Barra superior con color de acento
  doc.setFillColor(...accent);
  doc.rect(0, 0, width, 3.2, "F");

  // Logo
  let logoW = 0;
  let logoH = 0;
  if (opts.logoDataUrl) {
    try {
      const size = await loadImageSize(opts.logoDataUrl);
      const maxH = 18;
      const maxW = 32;
      logoW = maxW;
      logoH = maxH;
      if (size) {
        const ratio = size.w / size.h;
        if (ratio > maxW / maxH) {
          logoW = maxW;
          logoH = maxW / ratio;
        } else {
          logoH = maxH;
          logoW = maxH * ratio;
        }
      }
      const format = opts.logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(opts.logoDataUrl, format, margin, y, logoW, logoH);
    } catch {
      logoW = 0;
      logoH = 0;
    }
  }

  const textX = margin + (logoW > 0 ? logoW + 5 : 0);
  let textY = y + 6;

  // Nombre del negocio
  applyTextStyle(doc, style.companyName, 16);
  doc.text(opts.companyName, textX, textY);
  textY += 6;

  // Slogan
  const slogan =
    opts.slogan?.trim() || "Tu tienda de confianza en el barrio";
  applyTextStyle(doc, style.slogan, 9);
  doc.text(slogan, textX, textY);
  textY += 5;

  // Dirección y teléfono
  const contactParts = [
    opts.address?.trim(),
    opts.phone?.trim() ? `Tel. ${opts.phone.trim()}` : "",
  ].filter(Boolean) as string[];
  if (contactParts.length) {
    applyTextStyle(doc, style.contact, 8);
    doc.text(contactParts.join("  ·  "), textX, textY);
    textY += 4;
  }

  y = Math.max(y + logoH, textY) + 4;

  // Línea divisoria
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.4);
  doc.line(margin, y, contentRight, y);
  y += 6;

  // Título del documento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...accent);
  doc.text(opts.documentTitle, margin, y);
  y += 6;

  // Bloque: de dónde proviene la información
  const lines = opts.sourceLines.map((l) => l.trim()).filter(Boolean);
  doc.setFillColor(...COLORS.softBg);
  const metaH = 4 + lines.length * 4.6 + 3;
  doc.roundedRect(margin, y, contentRight - margin, metaH, 1.5, 1.5, "F");

  let metaY = y + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("ORIGEN DE LA INFORMACIÓN", margin + 3, metaY);
  metaY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  for (const line of lines) {
    doc.text(line, margin + 3, metaY);
    metaY += 4.6;
  }

  y += metaH + 6;
  doc.setTextColor(...COLORS.ink);
  return { y, accent };
}

function drawFooter(doc: jsPDF, page: number, total: number, companyName: string) {
  const { margin, contentRight, height } = PAGE;
  const y = height - 10;
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 4, contentRight, y - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `${companyName} · Documento generado automáticamente`,
    margin,
    y,
  );
  doc.text(`Pág. ${page} / ${total}`, contentRight, y, { align: "right" });
}

function applyFooters(doc: jsPDF, companyName: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, companyName);
  }
}

type InventoryExportOpts = {
  products: Product[];
  branchName: string;
  companyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  logoDataUrl?: string;
  pdfStyle?: PdfStyleSettings;
};

export async function downloadInventoryPdf({
  products,
  branchName,
  companyName = "MI BARRIO",
  slogan,
  address,
  phone,
  logoDataUrl,
  pdfStyle,
}: InventoryExportOpts) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { margin, contentRight } = PAGE;

  const header = await drawDocumentHeader(doc, {
    companyName,
    slogan,
    address,
    phone,
    logoDataUrl,
    pdfStyle,
    documentTitle: "Inventario de productos",
    sourceLines: [
      `Ubicación / sucursal: ${branchName}`,
      `Fecha de emisión: ${new Date().toLocaleString("es-GT")}`,
      `Productos listados: ${products.length}`,
      `Fuente: módulo Inventario · stock vigente al momento de la descarga`,
      `Uso: marca la casilla al completar el conteo físico de cada producto`,
    ],
  });
  let y = header.y;
  const accent = header.accent;

  // Nombre | Cantidad | Costo | Venta | Casilla (conteo)
  const cols = {
    name: margin + 1,
    qty: 112,
    cost: 138,
    price: 166,
    check: contentRight - 8,
  };
  const checkSize = 3.6;

  function drawCheckbox(atX: number, atY: number) {
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.rect(atX, atY - checkSize + 0.6, checkSize, checkSize, "FD");
  }

  function drawTableHead(atY: number) {
    doc.setFillColor(...accent);
    doc.roundedRect(margin, atY - 4.5, contentRight - margin, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Nombre producto", cols.name + 1, atY);
    doc.text("Cantidad", cols.qty, atY);
    doc.text("Precio costo", cols.cost, atY);
    doc.text("Precio venta", cols.price, atY);
    doc.text("✓", cols.check + 0.4, atY);
    doc.setTextColor(...COLORS.ink);
    return atY + 6;
  }

  y = drawTableHead(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let stockValue = 0;
  let row = 0;
  for (const product of products) {
    if (y > 268) {
      doc.addPage();
      y = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accent);
      doc.text(`${companyName} · Inventario — ${branchName}`, margin, y);
      y += 6;
      y = drawTableHead(y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
    }

    const cost = getCostPrice(product);
    stockValue += cost * product.quantity;
    const name =
      product.name.length > 44
        ? `${product.name.slice(0, 41)}...`
        : product.name;

    if (row % 2 === 0) {
      doc.setFillColor(...COLORS.softBg);
      doc.rect(margin, y - 4, contentRight - margin, 7, "F");
    }
    doc.setTextColor(...COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(name, cols.name + 1, y);
    doc.text(String(product.quantity), cols.qty, y);
    doc.text(formatMoney(cost), cols.cost, y);
    doc.text(formatMoney(product.price), cols.price, y);
    drawCheckbox(cols.check, y);
    y += 7;
    row += 1;
  }

  y += 3;
  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, contentRight, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text(
    `Valor total del inventario (a costo): ${formatMoney(stockValue)}`,
    margin,
    y,
  );

  applyFooters(doc, companyName);
  doc.save(
    `inventario-${branchName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}

type SalesExportOpts = {
  sales: Sale[];
  branchName: string;
  periodLabel: string;
  companyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  logoDataUrl?: string;
  pdfStyle?: PdfStyleSettings;
};

export async function downloadSalesPdf(
  salesOrOpts: Sale[] | SalesExportOpts,
  branchNameArg?: string,
  periodLabelArg?: string,
  companyNameArg = "MI BARRIO",
) {
  // Compatibilidad con llamada posicional antigua y nueva por objeto
  const opts: SalesExportOpts = Array.isArray(salesOrOpts)
    ? {
        sales: salesOrOpts,
        branchName: branchNameArg ?? "",
        periodLabel: periodLabelArg ?? "",
        companyName: companyNameArg,
      }
    : salesOrOpts;

  const {
    sales,
    branchName,
    periodLabel,
    companyName = "MI BARRIO",
    slogan,
    address,
    phone,
    logoDataUrl,
    pdfStyle,
  } = opts;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { margin, contentRight } = PAGE;

  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const tickets = sales.length;
  const itemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0),
    0,
  );

  const header = await drawDocumentHeader(doc, {
    companyName,
    slogan,
    address,
    phone,
    logoDataUrl,
    pdfStyle,
    documentTitle: "Reporte de ventas",
    sourceLines: [
      `Sucursal: ${branchName}`,
      `Período consultado: ${periodLabel}`,
      `Fecha de emisión: ${new Date().toLocaleString("es-GT")}`,
      `Fuente: módulo Reportes · ventas registradas en el sistema`,
      `Resumen: ${tickets} ticket(s) · ${itemsSold} artículo(s) · Total ${formatMoney(total)}`,
    ],
  });
  let y = header.y;
  const accent = header.accent;

  if (sales.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text("No hay ventas en este período.", margin, y);
    applyFooters(doc, companyName);
    doc.save(
      `ventas-${branchName.toLowerCase().replace(/\s+/g, "-")}-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    );
    return;
  }

  for (const sale of sales) {
    if (y > 255) {
      doc.addPage();
      y = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accent);
      doc.text(
        `${companyName} · Ventas — ${branchName} (${periodLabel})`,
        margin,
        y,
      );
      y += 8;
    }

    // Cabecera de ticket
    doc.setFillColor(...COLORS.softBg);
    doc.roundedRect(margin, y - 4, contentRight - margin, 10, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text(formatMoney(sale.total), margin + 2, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `${formatDate(sale.createdAt)} · ${sale.userName}`,
      contentRight - 2,
      y + 2,
      { align: "right" },
    );
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    for (const item of sale.items) {
      if (y > 275) {
        doc.addPage();
        y = 16;
      }
      doc.text(`  ${item.quantity}× ${item.name}`, margin + 1, y);
      doc.text(formatMoney(item.price * item.quantity), contentRight, y, {
        align: "right",
      });
      y += 4.5;
    }
    y += 5;
  }

  applyFooters(doc, companyName);
  doc.save(
    `ventas-${branchName.toLowerCase().replace(/\s+/g, "-")}-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}
