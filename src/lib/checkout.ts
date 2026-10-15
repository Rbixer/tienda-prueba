import { uid } from "@/lib/store";
import type {
  PaymentMethod,
  Prescription,
  Product,
  Sale,
  SaleItem,
  Session,
  StoreData,
} from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { commitSaleItem, restoreSaleItem } from "@/lib/stock";

export type StockConflict = {
  productId: string;
  name: string;
  needed: number;
  available: number;
};

export type CheckoutPayment = {
  method: PaymentMethod;
  amountReceived?: number;
};

export type CheckoutMeta = {
  customerName?: string;
  customerPhone?: string;
  customerNit?: string;
  prescription?: Prescription;
  issueInvoice?: boolean;
  shiftId?: string;
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function prescriptionReady(value?: Prescription): boolean {
  return Boolean(
    value?.number.trim() &&
      value.doctor.trim() &&
      value.patient.trim() &&
      value.date,
  );
}

/**
 * Aplica una venta al almacén (puro, sin I/O).
 * Usado por POS online/offline y por tests.
 */
export function applyCheckout(
  data: StoreData,
  session: Session | null,
  items: SaleItem[],
  payment?: CheckoutPayment,
  meta?: CheckoutMeta,
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
        "No se puede vender desde la bodega. El cobro es en mostrador.",
    };
  }

  const needsRx = items.some((item) => {
    const product = data.products.find((p) => p.id === item.productId);
    return product?.controlled;
  });
  if (needsRx && !prescriptionReady(meta?.prescription)) {
    return {
      error:
        "Los medicamentos controlados exigen receta: número, médico, paciente y fecha.",
    };
  }

  const products: Product[] = data.products.map((p) => ({ ...p }));
  const sold: SaleItem[] = [];
  for (const item of items) {
    const idx = products.findIndex((p) => p.id === item.productId);
    if (idx < 0) return { error: `Producto no encontrado: ${item.name}` };
    if (products[idx].branchId !== session.branchId) {
      return { error: "Hay productos que no están en el mostrador." };
    }
    if (item.quantity <= 0) {
      return { error: `Cantidad inválida para ${item.name}.` };
    }
    const result = commitSaleItem(products[idx], item);
    if (result.error) return { error: result.error };
    products[idx] = { ...result.product, updatedAt: new Date().toISOString() };
    sold.push(result.item);
  }

  const total = roundMoney(
    sold.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  let amountReceived: number | undefined;
  let change: number | undefined;
  if (payment?.method === "efectivo") {
    const received = payment.amountReceived;
    if (received === undefined || !Number.isFinite(received)) {
      return { error: "Indica el monto recibido en efectivo." };
    }
    amountReceived = roundMoney(received);
    if (amountReceived + 0.001 < total) {
      return { error: "El efectivo recibido no cubre el total." };
    }
    change = roundMoney(amountReceived - total);
  }

  const saleId = uid("sale");
  let invoiceId: string | undefined;
  let invoices = data.invoices ?? [];
  let settings = data.settings;
  if (meta?.issueInvoice) {
    const nit = meta.customerNit?.trim();
    const name = meta.customerName?.trim();
    if (!nit || !name) {
      return { error: "La factura necesita NIT y nombre del receptor." };
    }
    const number = settings.nextInvoiceNumber ?? 1;
    invoiceId = uid("inv");
    invoices = [
      {
        id: invoiceId,
        saleId,
        series: settings.invoiceSeries?.trim() || "A",
        number,
        nitEmitter: settings.nit?.trim() || "",
        nitReceiver: nit,
        receiverName: name,
        total,
        createdAt: new Date().toISOString(),
      },
      ...invoices,
    ];
    settings = { ...settings, nextInvoiceNumber: number + 1 };
  }

  const sale: Sale = {
    id: saleId,
    branchId: session.branchId,
    userId: session.userId,
    userName: session.name,
    items: sold,
    total,
    paymentMethod: payment?.method,
    amountReceived,
    change,
    status: "completada",
    customerName: meta?.customerName?.trim() || undefined,
    customerPhone: meta?.customerPhone?.trim() || undefined,
    customerNit: meta?.customerNit?.trim() || undefined,
    prescription: prescriptionReady(meta?.prescription)
      ? {
          number: meta!.prescription!.number.trim(),
          doctor: meta!.prescription!.doctor.trim(),
          patient: meta!.prescription!.patient.trim(),
          date: meta!.prescription!.date,
        }
      : undefined,
    invoiceId,
    shiftId: meta?.shiftId,
    createdAt: new Date().toISOString(),
  };

  return {
    error: null,
    sale,
    store: {
      ...data,
      products,
      sales: [sale, ...data.sales],
      invoices,
      settings,
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
  const now = new Date().toISOString();

  for (const item of sale.items) {
    const idx = products.findIndex((p) => p.id === item.productId);
    if (idx < 0 || products[idx].branchId !== sale.branchId) {
      conflicts.push({
        productId: item.productId,
        name: item.name,
        needed: item.quantity,
        available: 0,
      });
      continue;
    }
    const result = commitSaleItem(products[idx], item);
    if (result.error) {
      conflicts.push({
        productId: item.productId,
        name: item.name,
        needed: item.quantity,
        available: products[idx].quantity,
      });
      continue;
    }
    products[idx] = { ...result.product, updatedAt: now };
  }

  if (conflicts.length) {
    return {
      error: "Conflicto de stock al sincronizar la venta offline.",
      conflicts,
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

export function voidSale(
  data: StoreData,
  saleId: string,
): { error: string | null; store?: StoreData } {
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) return { error: "Venta no encontrada." };
  if (sale.status === "anulada") return { error: "La venta ya está anulada." };
  const products = data.products.map((product) => ({ ...product }));
  const now = new Date().toISOString();
  for (const item of sale.items) {
    const idx = products.findIndex((product) => product.id === item.productId);
    if (idx < 0) return { error: `No está ${item.name} para devolver el stock.` };
    const restored = restoreSaleItem(products[idx], item);
    if (restored.error) return { error: restored.error };
    products[idx] = { ...restored.product, updatedAt: now };
  }
  return {
    error: null,
    store: {
      ...data,
      products,
      sales: data.sales.map((item) =>
        item.id === saleId ? { ...item, status: "anulada" as const, voidedAt: now } : item,
      ),
    },
  };
}

export function returnSaleLine(
  data: StoreData,
  saleId: string,
  lineIndex: number,
): { error: string | null; store?: StoreData } {
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) return { error: "Venta no encontrada." };
  if (sale.status === "anulada") return { error: "La venta ya está anulada." };
  const line = sale.items[lineIndex];
  if (!line) return { error: "Línea no encontrada." };
  const idx = data.products.findIndex((product) => product.id === line.productId);
  if (idx < 0) return { error: `No está ${line.name} para devolver el stock.` };
  const restored = restoreSaleItem(data.products[idx], line);
  if (restored.error) return { error: restored.error };
  const now = new Date().toISOString();
  const items = sale.items.filter((_, index) => index !== lineIndex);
  const total = roundMoney(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const nextSale: Sale =
    items.length === 0
      ? { ...sale, items, total: 0, status: "anulada", voidedAt: now }
      : { ...sale, items, total };
  return {
    error: null,
    store: {
      ...data,
      products: data.products.map((product, index) =>
        index === idx ? { ...restored.product, updatedAt: now } : product,
      ),
      sales: data.sales.map((item) => (item.id === saleId ? nextSale : item)),
    },
  };
}
