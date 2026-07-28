import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyQueuedSale } from "@/lib/checkout";
import type { Sale, StoreData } from "@/lib/types";

const memory = new Map<string, string>();

vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
  },
});

vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
});

import {
  enqueueOfflineSale,
  readOfflineQueue,
  readPendingSync,
  replayOfflineQueue,
  clearPendingAfterSync,
  MAX_OFFLINE_ATTEMPTS,
} from "@/lib/offline";

function baseStore(qty = 10): StoreData {
  return {
    version: 3,
    branches: [{ id: "suc-1", name: "Centro", address: "x" }],
    users: [],
    products: [
      {
        id: "prod-1",
        name: "Agua",
        price: 5,
        costPrice: 2,
        quantity: qty,
        branchId: "suc-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    sales: [],
    transfers: [],
    suppliers: [],
    supplierPayments: [],
    settings: { companyName: "MI BARRIO" },
  };
}

function sale(qty: number, id = "sale-offline-1"): Sale {
  return {
    id,
    branchId: "suc-1",
    userId: "u1",
    userName: "Cajero",
    items: [
      { productId: "prod-1", name: "Agua", price: 5, quantity: qty },
    ],
    total: 5 * qty,
    createdAt: "2026-01-02T00:00:00.000Z",
  };
}

describe("applyQueuedSale", () => {
  it("reaplica venta y descuenta stock del servidor", () => {
    const result = applyQueuedSale(baseStore(10), sale(3));
    expect(result.error).toBeNull();
    expect(result.store?.products[0].quantity).toBe(7);
    expect(result.store?.sales[0].id).toBe("sale-offline-1");
  });

  it("reporta conflicto de stock con detalle", () => {
    const result = applyQueuedSale(baseStore(2), sale(5));
    expect(result.error).toMatch(/Conflicto de stock/);
    expect(result.conflicts).toEqual([
      {
        productId: "prod-1",
        name: "Agua",
        needed: 5,
        available: 2,
      },
    ]);
  });

  it("es idempotente si la venta ya existe", () => {
    const first = applyQueuedSale(baseStore(10), sale(2));
    const second = applyQueuedSale(first.store!, sale(2));
    expect(second.error).toBeNull();
    expect(second.store?.products[0].quantity).toBe(8);
    expect(second.store?.sales).toHaveLength(1);
  });
});

describe("replayOfflineQueue", () => {
  beforeEach(() => memory.clear());

  it("sincroniza ventas con stock suficiente", () => {
    const queue = [
      {
        saleId: "sale-a",
        sale: sale(2, "sale-a"),
        status: "pending" as const,
        attempts: 0,
        enqueuedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const { store, queue: next, report } = replayOfflineQueue(
      baseStore(10),
      queue,
    );
    expect(report.synced).toBe(1);
    expect(report.conflicts).toBe(0);
    expect(next).toHaveLength(0);
    expect(store.products[0].quantity).toBe(8);
  });

  it("marca conflicto y suma intentos", () => {
    const queue = [
      {
        saleId: "sale-b",
        sale: sale(9, "sale-b"),
        status: "pending" as const,
        attempts: 0,
        enqueuedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const { queue: next, report } = replayOfflineQueue(baseStore(3), queue);
    expect(report.synced).toBe(0);
    expect(report.conflicts).toBe(1);
    expect(next[0].status).toBe("conflict");
    expect(next[0].attempts).toBe(1);
    expect(next[0].conflicts?.[0].available).toBe(3);
  });

  it("falla tras MAX_OFFLINE_ATTEMPTS", () => {
    const queue = [
      {
        saleId: "sale-c",
        sale: sale(9, "sale-c"),
        status: "conflict" as const,
        attempts: MAX_OFFLINE_ATTEMPTS - 1,
        enqueuedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const { queue: next, report } = replayOfflineQueue(baseStore(1), queue);
    expect(report.failed).toBe(1);
    expect(next[0].status).toBe("failed");
    expect(next[0].attempts).toBe(MAX_OFFLINE_ATTEMPTS);
  });
});

describe("offline queue storage", () => {
  beforeEach(() => memory.clear());

  it("encola venta completa y limpia tras sync sin conflictos", () => {
    enqueueOfflineSale(sale(1, "sale-z"));
    expect(readPendingSync()).toBe(true);
    expect(readOfflineQueue()[0].sale.items).toHaveLength(1);
    // simular cola vacía post-sync exitoso
    clearPendingAfterSync();
    // clearPendingAfterSync conserva conflict/failed; pending vacío → limpia
    expect(readOfflineQueue()).toHaveLength(0);
  });
});
