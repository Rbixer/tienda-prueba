import type { Product, Sale } from "@/lib/types";
import { formatDate, formatMoney, getCostPrice } from "@/lib/store";
export async function downloadInventoryPdf(
  products: Product[],
  branchName: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MI BARRIO — Inventario", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Sucursal: ${branchName}`, margin, y);
  y += 6;
  doc.text(`Fecha: ${new Date().toLocaleString("es-GT")}`, margin, y);
  y += 6;
  doc.text(`Total de productos: ${products.length}`, margin, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Producto", margin, y);
  doc.text("Costo", 120, y);
  doc.text("Venta", 155, y);
  doc.text("Cant.", 190, y);
  doc.text("Valor costo", 220, y);
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, 283, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  let stockValue = 0;
  for (const product of products) {
    if (y > 190) {
      doc.addPage();
      y = 18;
    }
    const cost = getCostPrice(product);
    const value = cost * product.quantity;
    stockValue += value;
    const name =
      product.name.length > 52
        ? `${product.name.slice(0, 49)}...`
        : product.name;
    doc.text(name, margin, y);
    doc.text(formatMoney(cost), 120, y);
    doc.text(formatMoney(product.price), 155, y);
    doc.text(String(product.quantity), 190, y);
    doc.text(formatMoney(value), 220, y);
    y += 7;
  }
  y += 4;
  doc.setDrawColor(180);
  doc.line(margin, y, 283, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(
    `Valor total del inventario (costo): ${formatMoney(stockValue)}`,
    margin,
    y,
  );
  doc.save(
    `inventario-${branchName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}
export async function downloadSalesPdf(
  sales: Sale[],
  branchName: string,
  periodLabel: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 18;
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const tickets = sales.length;
  const itemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0),
    0,
  );
  const average = tickets > 0 ? total / tickets : 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MI BARRIO — Reporte de ventas", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Sucursal: ${branchName}`, margin, y);
  y += 6;
  doc.text(`Período: ${periodLabel}`, margin, y);
  y += 6;
  doc.text(`Generado: ${new Date().toLocaleString("es-GT")}`, margin, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total vendido: ${formatMoney(total)}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Tickets: ${tickets}  ·  Artículos: ${itemsSold}  ·  Promedio: ${formatMoney(average)}`,
    margin,
    y,
  );
  y += 10;
  for (const sale of sales) {
    if (y > 265) {
      doc.addPage();
      y = 18;
    }
    doc.setDrawColor(200);
    doc.line(margin, y, 196, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(formatMoney(sale.total), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(formatDate(sale.createdAt), 70, y);
    doc.text(sale.userName, 130, y);
    y += 6;
    doc.setFontSize(9);
    for (const item of sale.items) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      const line = `${item.quantity}× ${item.name}`;
      const name = line.length > 55 ? `${line.slice(0, 52)}...` : line;
      doc.text(name, margin + 2, y);
      doc.text(formatMoney(item.price * item.quantity), 165, y);
      y += 5;
    }
    y += 2;
  }
  if (sales.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("No hay ventas en este período.", margin, y);
  } else {
    y += 4;
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.setDrawColor(180);
    doc.line(margin, y, 196, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total del período: ${formatMoney(total)}`, margin, y);
  }
  const slug = branchName.toLowerCase().replace(/\s+/g, "-");
  const periodSlug = periodLabel.toLowerCase().replace(/\s+/g, "-");
  doc.save(`ventas-${slug}-${periodSlug}.pdf`);
}
