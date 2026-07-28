import { uid } from "@/lib/store";
import type { Product, Sale, SaleItem, Session, StoreData } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";

export type StockConflict = {
  productId: string;
  name: string;
  needed: number;
  available: number;
};

export type CheckoutResult = {
  error: string | null;
  sale?: Sale;
  store?: StoreData;
};

export type QueuedSaleResult = {
  error: string | null;
  conflicts?: StockConflict[];
  store?: StoreData;
};

/**
 * Aplica una venta al almacén (puro, sin I/O).
 * Usado por POS online/offline y por tests.
 */
export function applyCheckout(
  data: StoreData,
  session: Session | null,
  items: SaleItem[],
): CheckoutResult {
  if (!session) return { error: "Sesión no válida." };
  if (!hasPermission(session, "pos")) {
    return { error: "No tienes permiso para usar el POS." };
  }
  if (!items.length) return { error: "Agrega productos al carrito." };

  const branch = data.branches.find((b) => b.id === session.branchId);
  if (branch?.isWarehouse) {
    return {
      error:
        "No se puede vender desde la Bodega Central. Cambia a una sucursal.",
    };
  }

  const products: Product[] = data.products.map((p) => ({ ...p }));
  for (const item of items) {
    const idx = products.findIndex((p) => p.id === item.productId);
    if (idx < 0) return { error: `Producto no encontrado: ${item.name}` };
    if (products[idx].branchId !== session.branchId) {
      return { error: "Hay productos de otra sucursal." };
    }
    if (item.quantity <= 0) {
      return { error: `Cantidad inválida para ${item.name}.` };
    }
    if (products[idx].quantity < item.quantity) {
      return { error: `Stock insuficiente de ${item.name}.` };
    }
    products[idx] = {
      ...products[idx],
      quantity: products[idx].quantity - item.quantity,
      updatedAt: new Date().toISOString(),
    };
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sale: Sale = {
    id: uid("sale"),
    branchId: session.branchId,
    userId: session.userId,
    userName: session.name,
    items: items.map((i) => ({ ...i })),
    total,
    createdAt: new Date().toISOString(),
  };

  return {
    error: null,
    sale,
    store: {
      ...data,
      products,
      sales: [sale, ...data.sales],
    },
  };
}

/**
 * Reaplica una venta ya creada (offline) sobre el store actual.
 * Conserva id/fecha/total de la venta original.
 */
export function applyQueuedSale(data: StoreData, sale: Sale): QueuedSaleResult {
  if (data.sales.some((s) => s.id === sale.id)) {
    return { error: null, store: data };
  }
  if (!sale.items?.length) {
    return {
      error: "La venta offline no tiene productos para reaplicar.",
      conflicts: [],
    };
  }

  const products: Product[] = data.products.map((p) => ({ ...p }));
  const conflicts: StockConflict[] = [];

  for (const item of sale.items) {
    const idx = products.findIndex((p) => p.id === item.productId);
    if (idx < 0) {
      conflicts.push({
        productId: item.productId,
        name: item.name,
        needed: item.quantity,
        available: 0,
      });
      continue;
    }
    if (products[idx].branchId !== sale.branchId) {
      conflicts.push({
        productId: item.productId,
        name: item.name,
        needed: item.quantity,
        available: 0,
      });
      continue;
    }
    if (products[idx].quantity < item.quantity) {
      conflicts.push({
        productId: item.productId,
        name: item.name,
        needed: item.quantity,
        available: products[idx].quantity,
      });
    }
  }

  if (conflicts.length) {
    return {
      error: "Conflicto de stock al sincronizar la venta offline.",
      conflicts,
    };
  }

  const now = new Date().toISOString();
  for (const item of sale.items) {
    const idx = products.findIndex((p) => p.id === item.productId);
    products[idx] = {
      ...products[idx],
      quantity: products[idx].quantity - item.quantity,
      updatedAt: now,
    };
  }

  return {
    error: null,
    store: {
      ...data,
      products,
      sales: [sale, ...data.sales.filter((s) => s.id !== sale.id)],
    },
  };
}
