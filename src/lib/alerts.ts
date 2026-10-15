import { daysUntilExpiry, formatExpiry } from "@/lib/pharmacy";
import { sellableBoxes } from "@/lib/stock";
import type { Product, PurchaseOrder } from "@/lib/types";

export type PharmacyAlert = {
  id: string;
  tone: "danger" | "warn" | "info";
  title: string;
  detail: string;
  href: string;
};

export function buildAlerts(
  products: Product[],
  orders: PurchaseOrder[],
): PharmacyAlert[] {
  const alerts: PharmacyAlert[] = [];
  for (const product of products) {
    const lots = product.lots ?? [];
    for (const lot of lots) {
      if (lot.quantity <= 0 && (lot.looseUnits ?? 0) <= 0) continue;
      const days = daysUntilExpiry(lot.expiresAt);
      if (days === null) continue;
      const when = formatExpiry(lot.expiresAt);
      if (days < 0) {
        alerts.push({
          id: `exp-${lot.id}`,
          tone: "danger",
          title: `${product.name} vencido`,
          detail: `Lote ${lot.lot} · ${when}`,
          href: "/app/inventario",
        });
      } else if (days <= 30) {
        alerts.push({
          id: `d30-${lot.id}`,
          tone: "danger",
          title: `${product.name} vence en ${days} días`,
          detail: `Lote ${lot.lot} · ${when}`,
          href: "/app/inventario",
        });
      } else if (days <= 60) {
        alerts.push({
          id: `d60-${lot.id}`,
          tone: "warn",
          title: `${product.name} vence en ${days} días`,
          detail: `Lote ${lot.lot} · ${when}`,
          href: "/app/inventario",
        });
      } else if (days <= 90) {
        alerts.push({
          id: `d90-${lot.id}`,
          tone: "info",
          title: `${product.name} vence en ${days} días`,
          detail: `Lote ${lot.lot} · ${when}`,
          href: "/app/inventario",
        });
      }
    }
    const floor = product.minStock ?? 5;
    const boxes = sellableBoxes(product);
    if (boxes <= floor) {
      alerts.push({
        id: `min-${product.id}`,
        tone: boxes === 0 ? "danger" : "warn",
        title:
          boxes === 0
            ? `${product.name} sin stock vendible`
            : `${product.name} bajo mínimo`,
        detail: `${boxes} caja${boxes === 1 ? "" : "s"} · mínimo ${floor}`,
        href: "/app/inventario",
      });
    }
  }
  for (const order of orders) {
    if (order.status !== "pedido") continue;
    alerts.push({
      id: `po-${order.id}`,
      tone: "info",
      title: "Pedido pendiente de recibir",
      detail: `${order.items.length} línea${order.items.length === 1 ? "" : "s"}`,
      href: "/app/proveedores",
    });
  }
  const rank = { danger: 0, warn: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
