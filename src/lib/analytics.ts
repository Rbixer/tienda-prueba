import type { Product, Sale } from "@/lib/types";
export type DayBucket = {
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  tickets: number;
  date: Date;
};
export type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  image?: string;
};
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
const weekdayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
/** Ventas agrupadas por día para los últimos `days` días (incluye hoy). */
export function salesByDay(sales: Sale[], days = 7): DayBucket[] {
  const today = startOfDay(new Date());
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    buckets.push({
      key: dayKey(date),
      label: date.toLocaleDateString("es-GT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      shortLabel: weekdayShort[date.getDay()],
      total: 0,
      tickets: 0,
      date,
    });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  for (const sale of sales) {
    const d = startOfDay(new Date(sale.createdAt));
    const bucket = map.get(dayKey(d));
    if (!bucket) continue;
    bucket.total += sale.total;
    bucket.tickets += 1;
  }
  return buckets;
}
export function salesOnDay(sales: Sale[], day: Date) {
  const target = dayKey(startOfDay(day));
  return sales.filter((s) => dayKey(startOfDay(new Date(s.createdAt))) === target);
}
export function sumSales(sales: Sale[]) {
  return sales.reduce((sum, s) => sum + s.total, 0);
}
/** Productos más vendidos por cantidad en el período. */
export function topProducts(sales: Sale[], limit = 5): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const prev = map.get(item.productId);
      if (prev) {
        prev.quantity += item.quantity;
        prev.revenue += item.price * item.quantity;
      } else {
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
          image: item.image,
        });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}
export function lowStockProducts(products: Product[], threshold = 5) {
  return products
    .filter((p) => p.quantity <= threshold)
    .sort((a, b) => a.quantity - b.quantity);
}
/** Variación % respecto a un valor base. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}
