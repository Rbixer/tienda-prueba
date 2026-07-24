import type { Branch, Product, Sale } from "@/lib/types";

/** Resumen de ganancia y pérdida del inventario frente a las ventas. */
export type ProfitSummary = {
  /** Ingreso total por ventas del período */
  revenue: number;
  /** Costo de la mercadería vendida */
  cost: number;
  /** Ganancia real ya cobrada (ingreso − costo) */
  profit: number;
  /** Margen % sobre las ventas */
  marginPct: number;
  /** Capital inmovilizado en inventario (a precio de costo) */
  stockCost: number;
  /** Valor del inventario a precio de venta */
  stockRetail: number;
  /** Ganancia potencial si se vende todo el inventario */
  potentialProfit: number;
  /** Capital en productos sin ninguna venta en el período (riesgo de pérdida) */
  deadStockCost: number;
  /** Cantidad de productos sin ventas */
  deadStockCount: number;
  /** Productos vendidos por debajo del costo (pérdida directa) */
  lossFromUnderpriced: number;
  /** Unidades vendidas en el período */
  unitsSold: number;
};

export type BranchBucket = {
  branchId: string;
  name: string;
  isWarehouse: boolean;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  tickets: number;
  unitsSold: number;
  avgTicket: number;
  products: number;
  stockCost: number;
  /** Participación % sobre el total vendido */
  share: number;
};

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

export type SellerBucket = {
  userId: string;
  userName: string;
  total: number;
  tickets: number;
};

export type HourBucket = {
  hour: number;
  label: string;
  total: number;
  tickets: number;
};

export type MarginPoint = {
  key: string;
  shortLabel: string;
  revenue: number;
  cost: number;
  profit: number;
};

export type ProductInsight = {
  productId: string;
  name: string;
  barcode?: string;
  quantitySold: number;
  revenue: number;
  stock: number;
  stockValue: number;
  status: "strong" | "ok" | "weak" | "dead";
  advice: string;
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

/**
 * Analiza productos por volumen de ventas vs inventario
 * para sugerir cuáles considerar descartar o reponer menos.
 */
export function analyzeProducts(
  products: Product[],
  sales: Sale[],
  getCost: (p: Product) => number,
): ProductInsight[] {
  const sold = new Map<string, { quantity: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const prev = sold.get(item.productId) ?? { quantity: 0, revenue: 0 };
      prev.quantity += item.quantity;
      prev.revenue += item.price * item.quantity;
      sold.set(item.productId, prev);
    }
  }

  const volumes = products.map((p) => sold.get(p.id)?.quantity ?? 0);
  const maxSold = Math.max(...volumes, 1);

  return products
    .map((p) => {
      const stats = sold.get(p.id) ?? { quantity: 0, revenue: 0 };
      const stockValue = getCost(p) * p.quantity;
      let status: ProductInsight["status"] = "ok";
      let advice = "Rendimiento normal.";

      if (stats.quantity === 0) {
        status = "dead";
        advice =
          stockValue > 0
            ? "Sin ventas: considera descartar o liquidar stock."
            : "Sin movimiento en el período.";
      } else if (stats.quantity / maxSold <= 0.15) {
        status = "weak";
        advice =
          p.quantity > 10
            ? "Bajo volumen con mucho stock: reduce pedido o descarta."
            : "Bajo volumen: evalúa si conviene mantenerlo.";
      } else if (stats.quantity / maxSold >= 0.6) {
        status = "strong";
        advice = "Alto volumen: prioriza reposición.";
      }

      return {
        productId: p.id,
        name: p.name,
        barcode: p.barcode,
        quantitySold: stats.quantity,
        revenue: stats.revenue,
        stock: p.quantity,
        stockValue,
        status,
        advice,
        image: p.image,
      };
    })
    .sort((a, b) => a.quantitySold - b.quantitySold || b.stockValue - a.stockValue);
}

/** Variación % respecto a un valor base. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

/** Ventas por vendedor en el período. */
export function salesBySeller(sales: Sale[]): SellerBucket[] {
  const map = new Map<string, SellerBucket>();
  for (const sale of sales) {
    const prev = map.get(sale.userId);
    if (prev) {
      prev.total += sale.total;
      prev.tickets += 1;
    } else {
      map.set(sale.userId, {
        userId: sale.userId,
        userName: sale.userName,
        total: sale.total,
        tickets: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Ventas por hora del día (0-23) filtradas a un día concreto o a un set de ventas. */
export function salesByHour(sales: Sale[]): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    total: 0,
    tickets: 0,
  }));
  for (const sale of sales) {
    const h = new Date(sale.createdAt).getHours();
    buckets[h].total += sale.total;
    buckets[h].tickets += 1;
  }
  // Solo franja comercial típica 7–21 para el gráfico
  return buckets.filter((b) => b.hour >= 7 && b.hour <= 21);
}

/**
 * Margen estimado por día: ingreso − costo de ítems vendidos
 * (usa costPrice del catálogo cuando existe).
 */
export function marginByDay(
  sales: Sale[],
  products: Product[],
  days = 7,
  getCost: (p: Product) => number,
): MarginPoint[] {
  const costMap = new Map(products.map((p) => [p.id, getCost(p)]));
  const dayBuckets = salesByDay(sales, days);
  const points = dayBuckets.map((d) => ({
    key: d.key,
    shortLabel: d.shortLabel,
    revenue: 0,
    cost: 0,
    profit: 0,
    date: d.date,
  }));
  const map = new Map(points.map((p) => [p.key, p]));

  for (const sale of sales) {
    const key = dayKey(startOfDay(new Date(sale.createdAt)));
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.revenue += sale.total;
    for (const item of sale.items) {
      const unitCost = costMap.get(item.productId) ?? item.price * 0.7;
      bucket.cost += unitCost * item.quantity;
    }
  }

  return points.map(({ key, shortLabel, revenue, cost }) => ({
    key,
    shortLabel,
    revenue,
    cost,
    profit: revenue - cost,
  }));
}

/**
 * Ganancia y pérdida del inventario frente a las ventas del período.
 * Compara lo cobrado contra el costo de lo vendido y evalúa el capital
 * que sigue inmovilizado en bodega/sucursal.
 */
export function profitAndLoss(
  sales: Sale[],
  products: Product[],
  getCost: (p: Product) => number,
): ProfitSummary {
  const costMap = new Map(products.map((p) => [p.id, getCost(p)]));

  let revenue = 0;
  let cost = 0;
  let unitsSold = 0;
  let lossFromUnderpriced = 0;
  const soldQty = new Map<string, number>();

  for (const sale of sales) {
    revenue += sale.total;
    for (const item of sale.items) {
      // Si el producto ya no existe en el catálogo, estimamos 70% del precio
      const unitCost = costMap.get(item.productId) ?? item.price * 0.7;
      const lineCost = unitCost * item.quantity;
      cost += lineCost;
      unitsSold += item.quantity;
      if (item.price < unitCost) {
        lossFromUnderpriced += (unitCost - item.price) * item.quantity;
      }
      soldQty.set(
        item.productId,
        (soldQty.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  let stockCost = 0;
  let stockRetail = 0;
  let deadStockCost = 0;
  let deadStockCount = 0;

  for (const p of products) {
    const unitCost = getCost(p);
    stockCost += unitCost * p.quantity;
    stockRetail += p.price * p.quantity;
    if (!soldQty.get(p.id)) {
      deadStockCost += unitCost * p.quantity;
      deadStockCount += 1;
    }
  }

  const profit = revenue - cost;

  return {
    revenue,
    cost,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    stockCost,
    stockRetail,
    potentialProfit: stockRetail - stockCost,
    deadStockCost,
    deadStockCount,
    lossFromUnderpriced,
    unitsSold,
  };
}

/** Ventas, margen e inventario agrupados por sucursal. */
export function salesByBranch(
  sales: Sale[],
  branches: Branch[],
  products: Product[],
  getCost: (p: Product) => number,
): BranchBucket[] {
  const costMap = new Map(products.map((p) => [p.id, getCost(p)]));

  const buckets = new Map<string, BranchBucket>(
    branches.map((b) => [
      b.id,
      {
        branchId: b.id,
        name: b.name,
        isWarehouse: Boolean(b.isWarehouse),
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPct: 0,
        tickets: 0,
        unitsSold: 0,
        avgTicket: 0,
        products: 0,
        stockCost: 0,
        share: 0,
      },
    ]),
  );

  for (const p of products) {
    const bucket = buckets.get(p.branchId);
    if (!bucket) continue;
    bucket.products += 1;
    bucket.stockCost += getCost(p) * p.quantity;
  }

  for (const sale of sales) {
    const bucket = buckets.get(sale.branchId);
    if (!bucket) continue;
    bucket.revenue += sale.total;
    bucket.tickets += 1;
    for (const item of sale.items) {
      const unitCost = costMap.get(item.productId) ?? item.price * 0.7;
      bucket.cost += unitCost * item.quantity;
      bucket.unitsSold += item.quantity;
    }
  }

  const list = [...buckets.values()];
  const totalRevenue = list.reduce((s, b) => s + b.revenue, 0);

  for (const b of list) {
    b.profit = b.revenue - b.cost;
    b.marginPct = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
    b.avgTicket = b.tickets > 0 ? b.revenue / b.tickets : 0;
    b.share = totalRevenue > 0 ? (b.revenue / totalRevenue) * 100 : 0;
  }

  return list.sort((a, b) => b.revenue - a.revenue);
}
