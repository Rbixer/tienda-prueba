import type { Sale, SaleItem, StoreData } from "@/lib/types";
import { applyQueuedSale, type StockConflict } from "@/lib/checkout";

/** Cola offline fina: una entrada por venta, con reintentos y conflictos. */

export const PENDING_SYNC_KEY = "tienda-barrio-pending-sync-v2";
export const OFFLINE_QUEUE_KEY = "tienda-barrio-offline-queue-v2";
/** Clave legada (solo migración). */
const LEGACY_OFFLINE_SALES_KEY = "tienda-barrio-offline-sales-v1";
const LEGACY_PENDING_KEY = "tienda-barrio-pending-sync-v1";

export const MAX_OFFLINE_ATTEMPTS = 8;

export type { StockConflict };

export type OfflineQueueStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "conflict"
  | "failed";

export type OfflineQueueItem = {
  saleId: string;
  sale: Sale;
  status: OfflineQueueStatus;
  attempts: number;
  enqueuedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
  conflicts?: StockConflict[];
};

export type FlushReport = {
  synced: number;
  conflicts: number;
  failed: number;
  remaining: number;
  messages: string[];
};

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function persistQueue(items: OfflineQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
    const open = items.filter(
      (i) =>
        i.status === "pending" ||
        i.status === "conflict" ||
        i.status === "failed",
    );
    if (open.length > 0) localStorage.setItem(PENDING_SYNC_KEY, "1");
    else localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // ignore
  }
}

function migrateLegacy(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const legacyPending =
      localStorage.getItem(LEGACY_PENDING_KEY) === "1" ||
      localStorage.getItem(PENDING_SYNC_KEY) === "1";
    const raw = localStorage.getItem(LEGACY_OFFLINE_SALES_KEY);
    if (!raw) {
      if (legacyPending) {
        localStorage.setItem(PENDING_SYNC_KEY, "1");
      }
      return [];
    }
    const parsed = JSON.parse(raw) as Array<{
      saleId?: string;
      createdAt?: string;
      total?: number;
      branchId?: string;
      sale?: Sale;
    }>;
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .map((row): OfflineQueueItem | null => {
        if (row.sale && row.sale.id) {
          return {
            saleId: row.sale.id,
            sale: row.sale,
            status: "pending",
            attempts: 0,
            enqueuedAt: row.createdAt ?? row.sale.createdAt,
          };
        }
        if (!row.saleId) return null;
        const placeholder: Sale = {
          id: row.saleId,
          branchId: row.branchId ?? "",
          userId: "",
          userName: "Offline",
          items: [],
          total: row.total ?? 0,
          createdAt: row.createdAt ?? new Date().toISOString(),
        };
        return {
          saleId: row.saleId,
          sale: placeholder,
          status: "failed",
          attempts: MAX_OFFLINE_ATTEMPTS,
          enqueuedAt: placeholder.createdAt,
          lastError:
            "Venta offline antigua sin detalle de productos. Descártala o regístrala de nuevo.",
        };
      })
      .filter((x): x is OfflineQueueItem => !!x);

    localStorage.removeItem(LEGACY_OFFLINE_SALES_KEY);
    localStorage.removeItem(LEGACY_PENDING_KEY);
    persistQueue(items);
    return items;
  } catch {
    return [];
  }
}

export function readOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return migrateLegacy();
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    if (!Array.isArray(parsed)) return migrateLegacy();
    return parsed.map((item) => ({
      ...item,
      attempts: item.attempts ?? 0,
      status: item.status ?? "pending",
      sale: item.sale,
    }));
  } catch {
    return migrateLegacy();
  }
}

export function writeOfflineQueue(items: OfflineQueueItem[]): OfflineQueueItem[] {
  persistQueue(items);
  return items;
}

export function readPendingSync(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(PENDING_SYNC_KEY) === "1") return true;
    return readOfflineQueue().some(
      (i) =>
        i.status === "pending" ||
        i.status === "conflict" ||
        i.status === "failed",
    );
  } catch {
    return false;
  }
}

export function writePendingSync(pending: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (pending) localStorage.setItem(PENDING_SYNC_KEY, "1");
    else localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // ignore
  }
}

export type OfflineSaleMeta = {
  saleId: string;
  createdAt: string;
  total: number;
  branchId: string;
};

export function readOfflineSales(): OfflineSaleMeta[] {
  return readOfflineQueue().map((i) => ({
    saleId: i.saleId,
    createdAt: i.sale.createdAt,
    total: i.sale.total,
    branchId: i.sale.branchId,
  }));
}

export function enqueueOfflineSale(sale: Sale): OfflineQueueItem[] {
  const queue = readOfflineQueue().filter((i) => i.saleId !== sale.id);
  const item: OfflineQueueItem = {
    saleId: sale.id,
    sale: {
      ...sale,
      items: sale.items.map((it: SaleItem) => ({ ...it })),
    },
    status: "pending",
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  };
  return writeOfflineQueue([item, ...queue]);
}

export function updateOfflineQueueItem(
  saleId: string,
  patch: Partial<OfflineQueueItem>,
): OfflineQueueItem[] {
  const next = readOfflineQueue().map((i) =>
    i.saleId === saleId ? { ...i, ...patch, saleId: i.saleId } : i,
  );
  return writeOfflineQueue(next);
}

export function removeOfflineQueueItems(saleIds: string[]): OfflineQueueItem[] {
  const drop = new Set(saleIds);
  return writeOfflineQueue(readOfflineQueue().filter((i) => !drop.has(i.saleId)));
}

export function clearOfflineSales(): void {
  writeOfflineQueue([]);
}

export function clearPendingAfterSync(): void {
  const kept = readOfflineQueue().filter(
    (i) => i.status === "conflict" || i.status === "failed",
  );
  writeOfflineQueue(kept);
  if (kept.length === 0) writePendingSync(false);
}

export function discardOfflineSale(saleId: string): OfflineQueueItem[] {
  return removeOfflineQueueItems([saleId]);
}

export function resetOfflineSaleForRetry(saleId: string): OfflineQueueItem[] {
  return updateOfflineQueueItem(saleId, {
    status: "pending",
    attempts: 0,
    lastError: undefined,
    conflicts: undefined,
    lastAttemptAt: undefined,
  });
}

export function openOfflineCount(items?: OfflineQueueItem[]): number {
  const list = items ?? readOfflineQueue();
  return list.filter(
    (i) =>
      i.status === "pending" ||
      i.status === "conflict" ||
      i.status === "failed" ||
      i.status === "syncing",
  ).length;
}

export function conflictOfflineCount(items?: OfflineQueueItem[]): number {
  const list = items ?? readOfflineQueue();
  return list.filter((i) => i.status === "conflict" || i.status === "failed")
    .length;
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(-8) : id;
}

/**
 * Reaplica ventas offline sobre un store (puro).
 * Orden: createdAt ascendente.
 */
export function replayOfflineQueue(
  base: StoreData,
  queue: OfflineQueueItem[],
): {
  store: StoreData;
  queue: OfflineQueueItem[];
  report: FlushReport;
} {
  let store = base;
  const nextQueue: OfflineQueueItem[] = [];
  let synced = 0;
  let conflicts = 0;
  let failed = 0;
  const messages: string[] = [];

  const ordered = [...queue].sort(
    (a, b) =>
      new Date(a.sale.createdAt).getTime() -
      new Date(b.sale.createdAt).getTime(),
  );

  for (const item of ordered) {
    if (item.status === "synced") continue;

    if (store.sales.some((s) => s.id === item.saleId)) {
      synced += 1;
      messages.push(`Venta ${shortId(item.saleId)} ya estaba en el servidor.`);
      continue;
    }

    if (item.status === "failed" && item.attempts >= MAX_OFFLINE_ATTEMPTS) {
      // Reintento manual puede bajar attempts; si está en tope, no auto-reaplica
      nextQueue.push(item);
      failed += 1;
      continue;
    }

    if (
      item.status !== "pending" &&
      item.status !== "conflict" &&
      item.status !== "failed" &&
      item.status !== "syncing"
    ) {
      nextQueue.push(item);
      continue;
    }

    // failed bajo el tope o conflict: sí reintentar
    const attempts = (item.attempts ?? 0) + 1;
    const result = applyQueuedSale(store, item.sale);

    if (!result.error && result.store) {
      store = result.store;
      synced += 1;
      messages.push(
        `Venta ${shortId(item.saleId)} sincronizada (intento ${attempts}).`,
      );
      continue;
    }

    const stockConflicts = result.conflicts ?? [];
    const status: OfflineQueueStatus =
      attempts >= MAX_OFFLINE_ATTEMPTS
        ? "failed"
        : stockConflicts.length
          ? "conflict"
          : "pending";

    const updated: OfflineQueueItem = {
      ...item,
      attempts,
      lastAttemptAt: new Date().toISOString(),
      lastError: result.error ?? "No se pudo sincronizar la venta.",
      conflicts: stockConflicts.length ? stockConflicts : undefined,
      status,
    };
    nextQueue.push(updated);

    if (status === "failed") {
      failed += 1;
      messages.push(
        `Venta ${shortId(item.saleId)} falló tras ${attempts} intentos: ${updated.lastError}`,
      );
    } else if (status === "conflict") {
      conflicts += 1;
      const detail = stockConflicts
        .map((c) => `${c.name} (pide ${c.needed}, hay ${c.available})`)
        .join("; ");
      messages.push(
        `Conflicto de stock en ${shortId(item.saleId)}: ${detail || updated.lastError}`,
      );
    } else {
      messages.push(
        `Venta ${shortId(item.saleId)} pendiente (intento ${attempts}): ${updated.lastError}`,
      );
    }
  }

  return {
    store,
    queue: nextQueue,
    report: {
      synced,
      conflicts,
      failed,
      remaining: nextQueue.length,
      messages,
    },
  };
}
