import type {
  PdfStyleSettings,
  PdfTextStyle,
  Invoice,
  Product,
  Sale,
  Supplier,
  SupplierPayment,
} from "@/lib/types";
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
  /** De dónde proviene la información (período, módulo, etc.) */
  sourceLines: string[];
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  contentRight: 196,
};

const COLORS = {
  navy: [11, 61, 50] as Rgb,
  navySoft: [20, 85, 68] as Rgb,
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
    opts.slogan?.trim() || "Lo del día, cerca de ti";
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
  companyName = "TIENDA",
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
      doc.text(`${companyName} · Inventario`, margin, y);
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
    "inventario.pdf",
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
  companyNameArg = "TIENDA",
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
    periodLabel,
    companyName = "TIENDA",
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
      `ventas-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
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
        `${companyName} · Ventas (${periodLabel})`,
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
    `ventas-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  otro: "Otro",
};

type CompanyPdfMeta = {
  companyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  logoDataUrl?: string;
  pdfStyle?: PdfStyleSettings;
};

/** Comprobante PDF de un solo pago a proveedor. */
export async function downloadSupplierPaymentPdf(opts: {
  payment: SupplierPayment;
  supplier: Supplier;
} & CompanyPdfMeta) {
  const {
    payment,
    supplier,
    companyName = "TIENDA",
    slogan,
    address,
    phone,
    logoDataUrl,
    pdfStyle,
  } = opts;
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
    documentTitle: "Comprobante de pago a proveedor",
    sourceLines: [
      `Proveedor: ${supplier.name}`,
      `Fecha de emisión: ${new Date().toLocaleString("es-GT")}`,
      `Fuente: módulo Proveedores · pago individual`,
    ],
  });
  let y = header.y;
  const accent = header.accent;

  doc.setFillColor(...COLORS.softBg);
  doc.roundedRect(margin, y, contentRight - margin, 42, 2, 2, "F");
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text("MONTO PAGADO", margin + 4, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...accent);
  doc.text(formatMoney(payment.amount), margin + 4, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const rows: [string, string][] = [
    ["Proveedor", supplier.name],
    ["Método", PAYMENT_METHOD_LABEL[payment.method] ?? payment.method],
    ["Fecha de pago", formatDate(payment.paidAt)],
    ["Registrado por", payment.userName],
  ];
  if (payment.note) rows.push(["Nota", payment.note]);
  if (supplier.phone) rows.push(["Tel. proveedor", supplier.phone]);

  for (const [label, value] of rows) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), margin + 4, y);
    doc.setTextColor(...COLORS.ink);
    doc.setFontSize(10);
    doc.text(value, margin + 48, y);
    y += 6;
  }

  y += 8;
  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, contentRight, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Saldo pendiente del proveedor al momento de emisión: ${formatMoney(supplier.balance)}`,
    margin,
    y,
  );

  applyFooters(doc, companyName);
  const slug = supplier.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24);
  doc.save(`pago-proveedor-${slug}-${payment.id.slice(-6)}.pdf`);
}

/**
 * Ticket/comprobante estrecho (80 mm) para imprimir al registrar un pago.
 * Abre el diálogo de impresión del navegador.
 */
export async function printSupplierPaymentTicket(opts: {
  payment: SupplierPayment;
  supplier: Supplier;
  companyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  /** Si true, también descarga el archivo */
  alsoDownload?: boolean;
}) {
  const {
    payment,
    supplier,
    companyName = "TIENDA",
    slogan,
    address,
    phone,
    alsoDownload = true,
  } = opts;

  const { jsPDF } = await import("jspdf");
  // Ancho tipo ticket térmico ~80 mm; alto variable
  const W = 80;
  const margin = 4;
  const right = W - margin;
  let y = 6;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [W, 140],
  });

  const center = (text: string, size: number, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.text(text, W / 2, y, { align: "center" });
  };

  const line = () => {
    doc.setDrawColor(180);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(margin, y, right, y);
    doc.setLineDashPattern([], 0);
    y += 4;
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(label, margin, y);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value, right - margin - 22);
    doc.text(lines, right, y, { align: "right" });
    y += Math.max(4.2, lines.length * 3.6);
  };

  // Encabezado
  doc.setTextColor(11, 37, 69);
  center(companyName, 11, "bold");
  y += 4;
  if (slogan?.trim()) {
    doc.setTextColor(100);
    center(slogan.trim(), 7, "normal");
    y += 3.5;
  }
  if (address?.trim() || phone?.trim()) {
    doc.setTextColor(100);
    const contact = [address?.trim(), phone?.trim() ? `Tel. ${phone.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");
    const contactLines = doc.splitTextToSize(contact, W - margin * 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(contactLines, W / 2, y, { align: "center" });
    y += contactLines.length * 3 + 1;
  }

  line();
  doc.setTextColor(11, 37, 69);
  center("COMPROBANTE DE PAGO", 9, "bold");
  y += 3.5;
  doc.setTextColor(100);
  center("Proveedores", 7, "normal");
  y += 4;
  line();

  row("Folio", payment.id.slice(-8).toUpperCase());
  row("Fecha", formatDate(payment.paidAt));
  row("Proveedor", supplier.name);
  if (supplier.phone) row("Teléfono", supplier.phone);
  row("Método", PAYMENT_METHOD_LABEL[payment.method] ?? payment.method);
  row("Registró", payment.userName);
  if (payment.note) row("Nota", payment.note);

  y += 1;
  line();

  doc.setTextColor(11, 37, 69);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("TOTAL PAGADO", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(formatMoney(payment.amount), right, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("Saldo pendiente", margin, y);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(formatMoney(supplier.balance), right, y, { align: "right" });
  y += 5;

  line();
  doc.setTextColor(100);
  center("Gracias por su registro", 7, "normal");
  y += 3.5;
  center(new Date().toLocaleString("es-GT"), 6, "normal");
  y += 5;
  center("— ticket de pago —", 6, "normal");

  // Ajusta alto real del ticket recortando página (jspdf no recorta fácil;
  // el formato fijo alcanza para el contenido).
  if (alsoDownload) {
    const slug = supplier.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20);
    doc.save(`ticket-pago-${slug}-${payment.id.slice(-6)}.pdf`);
  }

  try {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const win = window.open(url, "_blank");
    if (!win) {
      // Si el navegador bloquea popups, al menos quedó descargado
      return;
    }
  } catch {
    // fallback: solo descarga
  }
}

/** Ticket térmico 50 mm para una venta del POS. */
export async function printSaleTicket(opts: {
  sale: Sale;
  branchName?: string;
  companyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  alsoDownload?: boolean;
}) {
  const {
    sale,
    companyName = "TIENDA",
    slogan,
    address,
    phone,
    alsoDownload = true,
  } = opts;

  const { jsPDF } = await import("jspdf");
  // Ancho ticket térmico 50 mm
  const W = 50;
  const margin = 2.2;
  const right = W - margin;
  const colCant = margin;
  const colName = margin + 7;
  const colPrice = right;
  const nameWidth = right - colName - 13;

  const estimatedH = Math.max(
    120,
    58 + sale.items.length * 11 + 36,
  );

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [W, estimatedH],
  });

  let y = 4;

  const center = (
    text: string,
    size: number,
    style: "normal" | "bold" = "normal",
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.text(text, W / 2, y, { align: "center" });
  };

  const solidRule = () => {
    doc.setDrawColor(40);
    doc.setLineWidth(0.25);
    doc.line(margin, y, right, y);
    y += 3;
  };

  doc.setTextColor(20);
  center(companyName, 9, "bold");
  y += 3.2;
  if (slogan?.trim()) {
    doc.setTextColor(70);
    center(slogan.trim(), 5.5, "normal");
    y += 2.8;
  }
  if (address?.trim() || phone?.trim()) {
    doc.setTextColor(70);
    const contact = [address?.trim(), phone?.trim() ? `Tel. ${phone.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");
    const contactLines = doc.splitTextToSize(contact, W - margin * 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(contactLines, W / 2, y, { align: "center" });
    y += contactLines.length * 2.4 + 0.8;
  }

  y += 0.5;
  solidRule();
  doc.setTextColor(20);
  center("TICKET DE VENTA", 7.5, "bold");
  y += 2.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(70);
  doc.text(`Folio: ${sale.id.slice(-8).toUpperCase()}`, margin, y);
  y += 2.6;
  doc.text(`Fecha: ${formatDate(sale.createdAt)}`, margin, y);
  y += 2.6;
  doc.text(`Cajero: ${sale.userName}`, margin, y);
  y += 3;

  solidRule();

  // Encabezado de columnas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(40);
  doc.text("Cant", colCant, y);
  doc.text("Producto", colName, y);
  doc.text("Precio", colPrice, y, { align: "right" });
  y += 2.2;
  doc.setDrawColor(40);
  doc.setLineWidth(0.2);
  doc.line(margin, y, right, y);
  y += 3;

  for (const item of sale.items) {
    const unitPrice = formatMoney(item.price);
    const lineTotal = formatMoney(item.price * item.quantity);

    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(String(item.quantity), colCant + 2.5, y, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    const nameLines = doc.splitTextToSize(item.name, nameWidth);
    doc.text(nameLines, colName, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(unitPrice, colPrice, y, { align: "right" });

    const nameH = Math.max(2.8, nameLines.length * 2.6);
    y += nameH;

    // Importe de la línea (cant × precio)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(70);
    doc.text(`Importe: ${lineTotal}`, colName, y);
    y += 3.4;
  }

  solidRule();

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL", margin, y);
  doc.setFontSize(10);
  doc.text(formatMoney(sale.total), right, y, { align: "right" });
  y += 5;

  if (sale.paymentMethod) {
    const methodLabel =
      sale.paymentMethod === "efectivo"
        ? "Efectivo"
        : sale.paymentMethod === "tarjeta"
          ? "Tarjeta"
          : "Transferencia";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(70);
    doc.text(`Pago: ${methodLabel}`, margin, y);
    y += 3;
    if (sale.paymentMethod === "efectivo" && sale.amountReceived !== undefined) {
      doc.text(`Recibido: ${formatMoney(sale.amountReceived)}`, margin, y);
      y += 3;
      doc.text(`Vuelto: ${formatMoney(sale.change ?? 0)}`, margin, y);
      y += 3.2;
    }
  }

  doc.setTextColor(70);
  center("Gracias por su preferencia", 5.5, "normal");
  y += 2.6;
  center(new Date().toLocaleString("es-GT"), 4.5, "normal");

  if (alsoDownload) {
    doc.save(`ticket-venta-${sale.id.slice(-6)}.pdf`);
  }

  try {
    doc.autoPrint();
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } catch {
    // fallback: solo descarga
  }
}

/** Historial completo de pagos a proveedores. */
export async function downloadSupplierPaymentsHistoryPdf(opts: {
  payments: SupplierPayment[];
  suppliers: Supplier[];
  /** Si se indica, filtra solo ese proveedor */
  supplierId?: string;
} & CompanyPdfMeta) {
  const {
    payments,
    suppliers,
    supplierId,
    companyName = "TIENDA",
    slogan,
    address,
    phone,
    logoDataUrl,
    pdfStyle,
  } = opts;
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const list = [...payments]
    .filter((p) => (supplierId ? p.supplierId === supplierId : true))
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  const total = list.reduce((n, p) => n + p.amount, 0);
  const focus = supplierId ? byId.get(supplierId) : null;

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
    documentTitle: focus
      ? `Historial de pagos · ${focus.name}`
      : "Historial de pagos a proveedores",
    sourceLines: [
      focus ? `Proveedor: ${focus.name}` : "Alcance: todos los proveedores",
      `Fecha de emisión: ${new Date().toLocaleString("es-GT")}`,
      `Pagos listados: ${list.length} · Total: ${formatMoney(total)}`,
      `Fuente: módulo Proveedores · historial de pagos`,
    ],
  });
  let y = header.y;
  const accent = header.accent;

  function drawHead(atY: number) {
    doc.setFillColor(...accent);
    doc.roundedRect(margin, atY - 4.5, contentRight - margin, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Fecha", margin + 2, atY);
    doc.text("Proveedor", margin + 38, atY);
    doc.text("Método", 128, atY);
    doc.text("Monto", contentRight - 2, atY, { align: "right" });
    doc.setTextColor(...COLORS.ink);
    return atY + 6;
  }

  y = drawHead(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  if (list.length === 0) {
    doc.setTextColor(...COLORS.muted);
    doc.text("No hay pagos registrados.", margin, y + 4);
  }

  let row = 0;
  for (const p of list) {
    if (y > 270) {
      doc.addPage();
      y = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accent);
      doc.text(`${companyName} · Historial de pagos`, margin, y);
      y += 6;
      y = drawHead(y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }
    const supplierName = byId.get(p.supplierId)?.name ?? "Proveedor";
    const name =
      supplierName.length > 28
        ? `${supplierName.slice(0, 25)}...`
        : supplierName;
    if (row % 2 === 0) {
      doc.setFillColor(...COLORS.softBg);
      doc.rect(margin, y - 4, contentRight - margin, 7, "F");
    }
    doc.setTextColor(...COLORS.ink);
    doc.text(formatDate(p.paidAt), margin + 2, y);
    doc.text(name, margin + 38, y);
    doc.text(PAYMENT_METHOD_LABEL[p.method] ?? p.method, 128, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatMoney(p.amount), contentRight - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7;
    row += 1;
  }

  y += 4;
  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, contentRight, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text(`Total pagado: ${formatMoney(total)}`, margin, y);

  applyFooters(doc, companyName);
  const file = focus
    ? `historial-pagos-${focus.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}.pdf`
    : "historial-pagos-proveedores.pdf";
  doc.save(file);
}

export async function downloadInvoicePdf(opts: {
  invoice: Invoice;
  sale: Sale;
  companyName?: string;
  address?: string;
  phone?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const company = opts.companyName?.trim() || "TIENDA";
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(company, 12, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Comprobante interno de factura", 12, y);
  y += 5;
  if (opts.address) {
    doc.text(opts.address, 12, y);
    y += 4;
  }
  if (opts.phone) {
    doc.text(opts.phone, 12, y);
    y += 4;
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text(
    `Serie ${opts.invoice.series}  No. ${String(opts.invoice.number).padStart(6, "0")}`,
    12,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`NIT emisor: ${opts.invoice.nitEmitter || "—"}`, 12, y);
  y += 5;
  doc.text(`NIT receptor: ${opts.invoice.nitReceiver}`, 12, y);
  y += 5;
  doc.text(`Nombre: ${opts.invoice.receiverName}`, 12, y);
  y += 5;
  doc.text(formatDate(opts.invoice.createdAt), 12, y);
  y += 8;
  for (const item of opts.sale.items) {
    const unit =
      item.saleUnit === "unidad"
        ? "und"
        : item.saleUnit === "blister"
          ? "blister"
          : "caja";
    doc.text(
      `${item.quantity} ${unit}  ${item.name}`.slice(0, 42),
      12,
      y,
    );
    doc.text(formatMoney(item.price * item.quantity), 130, y, { align: "right" });
    y += 5;
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text(`Total ${formatMoney(opts.invoice.total)}`, 12, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const note = doc.splitTextToSize(
    "Este documento es un comprobante del sistema. No es una factura electrónica certificada por la SAT ni tiene número de autorización. La certificación FEL se habilita al contratar un certificador.",
    120,
  );
  doc.text(note, 12, y);
  doc.save(
    `factura-${opts.invoice.series}-${opts.invoice.number}.pdf`,
  );
}

export async function downloadControlledLogPdf(opts: {
  sales: Sale[];
  companyName?: string;
  branchName?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.companyName?.trim() || "TIENDA", 14, y);
  y += 6;
  doc.setFontSize(11);
  doc.text("Libro de salida de medicamentos controlados", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.branchName ?? "", 14, y);
  y += 8;
  const rows = opts.sales.filter((sale) => sale.prescription);
  if (!rows.length) {
    doc.text("No hay dispensaciones con receta en este período.", 14, y);
  }
  for (const sale of rows) {
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    const rx = sale.prescription!;
    doc.setFont("helvetica", "bold");
    doc.text(
      `${formatDate(sale.createdAt)} · Receta ${rx.number}`,
      14,
      y,
    );
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Médico: ${rx.doctor} · Paciente: ${rx.patient} · Fecha receta: ${rx.date}`, 14, y);
    y += 5;
    for (const item of sale.items) {
      doc.text(`· ${item.quantity} ${item.name}`, 18, y);
      y += 4;
    }
    y += 3;
  }
  doc.save("libro-controlados.pdf");
}
