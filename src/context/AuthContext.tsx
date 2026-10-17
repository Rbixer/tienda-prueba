"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SESSION_KEY, createInitialData, uid, getCostPrice, isCashDayClosed, isCashFloatLocked, normalizePdfStyle, normalizeStoreData } from "@/lib/store";
import {
  applyCheckout,
  returnSaleLine,
  voidSale,
  type CheckoutMeta,
  type CheckoutPayment,
} from "@/lib/checkout";
import { addIncomingLot, commitSaleItem, ensureLots, readSalePacks, reflectLots } from "@/lib/stock";
import {
  normalizePharmacy,
  pharmacyFields,
  validatePharmacy,
  type PharmacyDetails,
} from "@/lib/pharmacy";
import {
  clearPendingAfterSync,
  discardOfflineSale as discardOfflineSaleStorage,
  enqueueOfflineSale,
  isBrowserOnline,
  openOfflineCount,
  readOfflineQueue,
  readPendingSync,
  replayOfflineQueue,
  resetOfflineSaleForRetry,
  writeOfflineQueue,
  writePendingSync,
  type FlushReport,
  type OfflineQueueItem,
} from "@/lib/offline";
import {
  canManageUsers,
  hasPermission,
  normalizeAllowedBranchIds,
  normalizePermissions,
  normalizeUser,
  userCanAccessBranch,
} from "@/lib/permissions";
import {
  AuthRequiredError,
  StoreConflictError,
  apiLogin,
  apiLogout,
  apiMe,
  fetchStore,
  mergeStores,
  readLocalStore,
  saveStore,
  writeLocalStore,
} from "@/lib/sync";
import type {
  CashShift,
  CompanySettings,
  Permission,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Sale,
  SaleItem,
  Session,
  StoreData,
  Supplier,
  SupplierPayment,
  SupplierPaymentMethod,
  Transfer,
  TransferItem,
  User,
  Role,
} from "@/lib/types";
type AuthContextValue = {
  ready: boolean;
  syncError: string | null;
  isOnline: boolean;
  pendingSync: boolean;
  pendingOfflineCount: number;
  offlineConflicts: OfflineQueueItem[];
  lastFlushReport: FlushReport | null;
  flushSync: () => Promise<FlushReport | null>;
  retryOfflineSale: (saleId: string) => Promise<void>;
  discardOfflineSale: (saleId: string) => void;
  session: Session | null;
  data: StoreData;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  setActiveBranch: (branchId: string) => void;
  addProduct: (
    input: {
      name: string;
      price: number;
      costPrice: number;
      quantity: number;
      barcode?: string;
      image?: string | null;
      branchId?: string;
      minStock?: number;
      unitsPerBox?: number;
      unitPrice?: number;
      unitsPerBlister?: number;
      blisterPrice?: number;
      controlled?: boolean;
    } & PharmacyDetails,
  ) => string | null;
  addLot: (
    productId: string,
    input: { lot: string; expiresAt?: string; quantity: number; costPrice?: number },
  ) => string | null;
  updateProduct: (
    id: string,
    input: {
      name: string;
      price: number;
      costPrice: number;
      quantity: number;
      barcode?: string;
      image?: string | null;
      minStock?: number;
        unitsPerBox?: number;
        unitPrice?: number;
        unitsPerBlister?: number;
        blisterPrice?: number;
        controlled?: boolean;
      } & PharmacyDetails,
    ) => string | null;
  deleteProduct: (id: string) => void;
  createUser: (input: {
    name: string;
    username: string;
    password: string;
    role: Role;
    branchId: string;
    allowedBranchIds?: string[];
    permissions?: Permission[];
  }) => string | null;
  updateUser: (
    id: string,
    input: {
      name?: string;
      role?: Role;
      branchId?: string;
      allowedBranchIds?: string[];
      password?: string;
      permissions?: Permission[];
    },
  ) => string | null;
  deleteUser: (id: string) => string | null;
  checkout: (
    items: SaleItem[],
    payment?: CheckoutPayment,
    meta?: CheckoutMeta,
  ) => {
    error: string | null;
    sale?: Sale;
    offline?: boolean;
    invoice?: import("@/lib/types").Invoice;
  };
  voidSale: (saleId: string) => string | null;
  returnSaleLine: (saleId: string, lineIndex: number) => string | null;
  openShift: (openingAmount: number) => string | null;
  closeShift: (countedCash?: number, note?: string) => string | null;
  createPurchaseOrder: (input: {
    supplierId: string;
    note?: string;
    items: PurchaseOrderItem[];
  }) => string | null;
  receivePurchaseOrder: (id: string) => string | null;
  cancelPurchaseOrder: (id: string) => string | null;
  transferStock: (input: {
    fromBranchId: string;
    toBranchId: string;
    items: { productId: string; quantity: number }[];
    note?: string;
  }) => string | null;
  updateSettings: (input: {
    companyName?: string;
    slogan?: string;
    address?: string;
    phone?: string;
    logo?: string | null;
    pdfStyle?: import("@/lib/types").PdfStyleSettings;
    nit?: string;
    invoiceSeries?: string;
    cashFloatMode?: "fija" | "libre";
    cashFloat?: number;
  }) => string | null;
  saveSatCredentials: (input: { usuario: string; clave?: string }) => Promise<string | null>;
  importProducts: (
    rows: ({
      name: string;
      quantity: number;
      costPrice: number;
      price: number;
      barcode?: string;
    } & PharmacyDetails)[],
  ) => { error: string | null; created: number; updated: number };
  createSupplier: (input: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    balance?: number;
  }) => string | null;
  updateSupplier: (
    id: string,
    input: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      balance?: number;
    },
  ) => string | null;
  deleteSupplier: (id: string) => string | null;
  addSupplierPayment: (input: {
    supplierId: string;
    amount: number;
    method: SupplierPaymentMethod;
    note?: string;
    paidAt?: string;
  }) => {
    error: string | null;
    payment?: SupplierPayment;
    supplier?: Supplier;
  };
  deleteSupplierPayment: (id: string) => string | null;
  branchProducts: Product[];
  branchSales: Sale[];
  currentBranchName: string;
  storeBranches: StoreData["branches"];
  /** Tiendas que el usuario actual puede ver/operar */
  visibleBranches: StoreData["branches"];
};
const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromUser(user: User, branchId?: string): Session {
  const normalized = normalizeUser(user);
  let active = branchId ?? normalized.branchId;
  if (normalized.role === "administrador") {
    if (
      normalized.allowedBranchIds.length > 0 &&
      !normalized.allowedBranchIds.includes(active)
    ) {
      active = normalized.allowedBranchIds[0] ?? normalized.branchId;
    }
  } else if (!normalized.allowedBranchIds.includes(active)) {
    active = normalized.allowedBranchIds[0] ?? normalized.branchId;
  }
  return {
    userId: normalized.id,
    name: normalized.name,
    username: normalized.username,
    role: normalized.role,
    branchId: active,
    allowedBranchIds: normalized.allowedBranchIds,
    permissions: normalized.permissions,
  };
}

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return {
      ...parsed,
      permissions: normalizePermissions(parsed.role, parsed.permissions),
      allowedBranchIds: normalizeAllowedBranchIds(
        parsed.role,
        parsed.branchId,
        parsed.allowedBranchIds,
      ),
    };
  } catch {
    return null;
  }
}
function withConflictSalesVisible(
  store: StoreData,
  queue: OfflineQueueItem[],
): StoreData {
  let sales = [...store.sales];
  for (const item of queue) {
    if (
      (item.status === "conflict" || item.status === "failed") &&
      !sales.some((s) => s.id === item.saleId)
    ) {
      sales = [item.sale, ...sales];
    }
  }
  return { ...store, sales };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [offlineConflicts, setOfflineConflicts] = useState<OfflineQueueItem[]>(
    [],
  );
  const [lastFlushReport, setLastFlushReport] = useState<FlushReport | null>(
    null,
  );
  const [data, setData] = useState<StoreData>(createInitialData);
  const [session, setSession] = useState<Session | null>(null);
  const dataRef = useRef(data);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    pendingRef.current = pendingSync;
  }, [pendingSync]);

  const refreshQueueState = useCallback((items?: OfflineQueueItem[]) => {
    const queue = items ?? readOfflineQueue();
    const open = openOfflineCount(queue);
    const conflicts = queue.filter(
      (i) => i.status === "conflict" || i.status === "failed",
    );
    setPendingOfflineCount(open);
    setOfflineConflicts(conflicts);
    const pending = open > 0 || readPendingSync();
    setPendingSync(pending);
    pendingRef.current = pending;
  }, []);

  useEffect(() => {
    setIsOnline(isBrowserOnline());
    refreshQueueState();
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshQueueState]);

  const markPending = useCallback(
    (sale?: Sale) => {
      if (sale) {
        const list = enqueueOfflineSale(sale);
        refreshQueueState(list);
      } else {
        writePendingSync(true);
        refreshQueueState();
      }
    },
    [refreshQueueState],
  );

  const clearPending = useCallback(() => {
    clearPendingAfterSync();
    refreshQueueState();
  }, [refreshQueueState]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const me = await apiMe();
        if (cancelled) return;
        if (me) {
          const existing = loadSession();
          let nextSession = me.session;
          if (
            existing?.userId === me.session.userId &&
            existing.role === "administrador" &&
            me.store.branches.some(
              (b) => b.id === existing.branchId && !b.isWarehouse,
            )
          ) {
            nextSession = { ...me.session, branchId: existing.branchId };
          }
          const local = readLocalStore();
          const hadPending = readPendingSync();
          const merged = mergeStores(me.store, local);
          const needsUpload =
            hadPending ||
            (!!local &&
              (merged.sales.length !== me.store.sales.length ||
                merged.products.length !== me.store.products.length ||
                merged.users.length !== me.store.users.length));
          if (needsUpload) {
            try {
              const saved = await saveStore({
                ...merged,
                version: me.store.version,
              });
              if (!cancelled) {
                setData(saved);
                clearPending();
              }
            } catch {
              if (!cancelled) {
                setData(merged);
                writeLocalStore(merged);
                markPending();
                setSyncError(
                  "Hay cambios locales pendientes de sincronizar.",
                );
              }
            }
          } else if (!cancelled) {
            setData(me.store);
            clearPending();
          }
          if (!cancelled) {
            setSession(nextSession);
            localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
            if (!needsUpload) setSyncError(null);
          }
        } else {
          localStorage.removeItem(SESSION_KEY);
          if (!cancelled) {
            setSession(null);
            setData(createInitialData());
            setSyncError(null);
          }
        }
      } catch {
        const local = readLocalStore() ?? createInitialData();
        const existing = loadSession();
        if (!cancelled) {
          setData(local);
          if (existing) {
            setSession(existing);
            markPending();
            setSyncError(
              "Modo offline: puedes vender; se sincronizará al recuperar red.",
            );
          } else {
            setSession(null);
            setSyncError(null);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [clearPending, markPending]);

  const flushSync = useCallback(async (): Promise<FlushReport | null> => {
    if (savingRef.current) return null;
    savingRef.current = true;
    try {
      let server: StoreData;
      try {
        server = await fetchStore();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setSession(null);
          localStorage.removeItem(SESSION_KEY);
          setSyncError("Sesión expirada. Vuelve a iniciar sesión.");
          return null;
        }
        setSyncError(
          "Sin red. Las ventas offline se guardarán al reconectar.",
        );
        return null;
      }

      const queue = readOfflineQueue();
      const replayable = queue.filter(
        (i) =>
          i.status === "pending" ||
          i.status === "conflict" ||
          i.status === "failed" ||
          i.status === "syncing",
      );

      // Base = servidor (stock autoritativo). Reaplicar cola venta a venta.
      const { store: replayed, queue: nextQueue, report } = replayOfflineQueue(
        server,
        replayable.length ? replayable : queue,
      );

      // Conservar otros cambios locales no-venta (usuarios, settings, etc.)
      const local = dataRef.current;
      const queuedIds = new Set(queue.map((q) => q.saleId));
      const mergedMeta = mergeStores(replayed, {
        ...local,
        // no pisar stock/ventas ya resueltos por replay
        products: replayed.products,
        sales: replayed.sales,
      });
      // Reponer ventas locales que no están en cola ni en servidor (edge)
      const extraSales = local.sales.filter(
        (s) =>
          !queuedIds.has(s.id) &&
          !mergedMeta.sales.some((x) => x.id === s.id),
      );
      let toSave: StoreData = {
        ...mergedMeta,
        sales: [...extraSales, ...mergedMeta.sales].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        version: server.version,
      };

      writeOfflineQueue(nextQueue);
      refreshQueueState(nextQueue);
      setLastFlushReport(report);

      if (report.synced > 0 || replayable.length === 0 || nextQueue.length < queue.length) {
        try {
          const saved = await saveStore(toSave);
          const visible = withConflictSalesVisible(saved, nextQueue);
          setData(visible);
          dataRef.current = visible;
          writeLocalStore(visible);
        } catch (err) {
          if (err instanceof StoreConflictError) {
            const again = replayOfflineQueue(err.store, readOfflineQueue());
            writeOfflineQueue(again.queue);
            refreshQueueState(again.queue);
            try {
              const saved = await saveStore({
                ...again.store,
                version: err.store.version,
              });
              const visible = withConflictSalesVisible(saved, again.queue);
              setData(visible);
              dataRef.current = visible;
              setLastFlushReport(again.report);
            } catch {
              setSyncError(
                "No se pudo guardar tras conflicto de versión. Reintenta.",
              );
              return report;
            }
          } else if (err instanceof AuthRequiredError) {
            setSession(null);
            localStorage.removeItem(SESSION_KEY);
            setSyncError("Sesión expirada. Vuelve a iniciar sesión.");
            return null;
          } else {
            setSyncError("No se pudo sincronizar con el servidor.");
            return report;
          }
        }
      } else {
        const visible = withConflictSalesVisible(toSave, nextQueue);
        setData(visible);
        dataRef.current = visible;
        writeLocalStore(visible);
      }

      if (nextQueue.length === 0) {
        writePendingSync(false);
        setSyncError(null);
      } else if (report.conflicts > 0 || report.failed > 0) {
        setSyncError(
          `${report.conflicts + report.failed} venta(s) con conflicto de stock. Revisa el detalle abajo.`,
        );
      } else {
        setSyncError(
          `${report.remaining} venta(s) pendientes de sincronizar.`,
        );
      }
      refreshQueueState(nextQueue);
      return report;
    } finally {
      savingRef.current = false;
    }
  }, [refreshQueueState]);

  const retryOfflineSale = useCallback(
    async (saleId: string) => {
      const next = resetOfflineSaleForRetry(saleId);
      refreshQueueState(next);
      await flushSync();
    },
    [flushSync, refreshQueueState],
  );

  const discardOfflineSale = useCallback(
    (saleId: string) => {
      const next = discardOfflineSaleStorage(saleId);
      // Quitar de historial local si solo estaba por conflicto
      const filtered = {
        ...dataRef.current,
        sales: dataRef.current.sales.filter((s) => s.id !== saleId),
      };
      setData(filtered);
      dataRef.current = filtered;
      writeLocalStore(filtered);
      refreshQueueState(next);
      if (next.length === 0) {
        writePendingSync(false);
        setSyncError(null);
      }
    },
    [refreshQueueState],
  );
  // Sincroniza al volver online
  useEffect(() => {
    if (!ready || !session || !isOnline) return;
    if (pendingSync || readPendingSync()) {
      void flushSync();
    }
  }, [ready, session, isOnline, pendingSync, flushSync]);

  // Pull periódico (no pisa ventas offline pendientes)
  useEffect(() => {
    if (!ready || !session) return;
    async function pull() {
      if (savingRef.current || document.hidden) return;
      if (!isBrowserOnline()) return;
      try {
        const server = await fetchStore();
        const current = dataRef.current;
        if (pendingRef.current) {
          const merged = mergeStores(server, current);
          merged.version = server.version;
          setData(merged);
          dataRef.current = merged;
          writeLocalStore(merged);
          return;
        }
        if ((server.version ?? 0) !== (current.version ?? 0)) {
          setData(server);
          dataRef.current = server;
          setSyncError(null);
          return;
        }
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setSession(null);
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }
    const id = window.setInterval(pull, 12_000);
    window.addEventListener("focus", pull);
    document.addEventListener("visibilitychange", pull);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", pull);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [ready, session]);

  const persist = useCallback(
    (next: StoreData, opts?: { offlineSale?: Sale }) => {
      setData(next);
      dataRef.current = next;
      writeLocalStore(next);
      savingRef.current = true;

      const offlineNow = !isBrowserOnline();
      if (offlineNow) {
        if (opts?.offlineSale) markPending(opts.offlineSale);
        else markPending();
        setSyncError(
          "Sin red: cambios guardados en este dispositivo. Se subirán al reconectar.",
        );
        savingRef.current = false;
        return;
      }

      saveStore(next)
        .then((saved) => {
          setData(saved);
          dataRef.current = saved;
          if (opts?.offlineSale) {
            // venta online ok: sacar de cola si estaba
            const q = discardOfflineSaleStorage(opts.offlineSale.id);
            refreshQueueState(q);
          } else if (!readOfflineQueue().length) {
            clearPending();
          }
          setSyncError(null);
        })
        .catch(async (err) => {
          if (err instanceof StoreConflictError) {
            // Reintentar vía flush fino
            markPending(opts?.offlineSale);
            savingRef.current = false;
            await flushSync();
            return;
          }
          if (err instanceof AuthRequiredError) {
            setSession(null);
            localStorage.removeItem(SESSION_KEY);
            setSyncError("Sesión expirada. Vuelve a iniciar sesión.");
            return;
          }
          markPending(opts?.offlineSale);
          setSyncError(
            "No se pudo sincronizar. Los cambios siguen en este dispositivo.",
          );
        })
        .finally(() => {
          savingRef.current = false;
        });
    },
    [clearPending, flushSync, markPending, refreshQueueState],
  );
  const persistSession = useCallback((next: Session | null) => {
    setSession(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }, []);
  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const { session: nextSession, store } = await apiLogin(
          username,
          password,
        );
        setData(store);
        dataRef.current = store;
        persistSession(nextSession);
        setSyncError(null);
        return null;
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Usuario o contraseña incorrectos.";
      }
    },
    [persistSession],
  );
  const logout = useCallback(() => {
    void apiLogout();
    persistSession(null);
  }, [persistSession]);
  const setActiveBranch = useCallback(
    (branchId: string) => {
      if (!session) return;
      const exists = data.branches.some((b) => b.id === branchId && !b.isWarehouse);
      if (!exists) return;
      if (!userCanAccessBranch(session, branchId)) return;
      persistSession({ ...session, branchId });
    },
    [data.branches, persistSession, session],
  );

  const addProduct = useCallback(
    (input: {
      name: string;
      price: number;
      costPrice: number;
      quantity: number;
      barcode?: string;
      image?: string | null;
      branchId?: string;
      minStock?: number;
      unitsPerBox?: number;
      unitPrice?: number;
      unitsPerBlister?: number;
      blisterPrice?: number;
      controlled?: boolean;
    } & PharmacyDetails) => {
      if (!session) return "Sesión no válida.";
      if (!hasPermission(session, "inventario")) {
        return "No tienes permiso para gestionar inventario.";
      }
      const name = input.name.trim();
      const barcode = input.barcode?.trim() || undefined;
      if (!name) return "El nombre es obligatorio.";
      if (!barcode) return "El código de barras es obligatorio.";
      const clinical = validatePharmacy(input, { strict: true });
      if (clinical) return clinical;
      if (input.price < 0) return "El precio de venta no puede ser negativo.";
      if (input.costPrice < 0)
        return "El precio de costo no puede ser negativo.";
      if (input.quantity < 0) return "La cantidad no puede ser negativa.";
      const packs = readSalePacks(input);
      if (packs.error) return packs.error;
      const details = normalizePharmacy(input);
      const branchId = input.branchId ?? session.branchId;
      if (
        barcode &&
        data.products.some(
          (p) => p.branchId === branchId && p.barcode === barcode,
        )
      ) {
        return "Ese código de barras ya está registrado.";
      }
      const now = new Date().toISOString();
      const product = ensureLots({
        id: uid("prod"),
        name,
        price: Number(input.price),
        costPrice: Number(input.costPrice),
        quantity: Math.floor(input.quantity),
        barcode,
        image: input.image || undefined,
        ...details,
        minStock:
          input.minStock !== undefined ? Math.max(0, Math.floor(input.minStock)) : 5,
        unitsPerBox: packs.unitsPerBox,
        unitPrice: packs.unitPrice,
        unitsPerBlister: packs.unitsPerBlister,
        blisterPrice: packs.blisterPrice,
        controlled: Boolean(input.controlled),
        lots: [
          {
            id: uid("lot"),
            lot: details.lot || "INICIAL",
            expiresAt: details.expiresAt,
            quantity: Math.floor(input.quantity),
            looseUnits: 0,
            costPrice: Number(input.costPrice),
          },
        ],
        branchId,
        createdAt: now,
        updatedAt: now,
      });
      persist({ ...data, products: [product, ...data.products] });
      return null;
    },
    [data, persist, session],
  );
  const updateProduct = useCallback(
    (
      id: string,
      input: {
        name: string;
        price: number;
        costPrice: number;
        quantity: number;
        barcode?: string;
        image?: string | null;
        minStock?: number;
        unitsPerBox?: number;
        unitPrice?: number;
        unitsPerBlister?: number;
        blisterPrice?: number;
        controlled?: boolean;
      } & PharmacyDetails,
    ) => {
      if (!session || !hasPermission(session, "inventario")) {
        return "No tienes permiso para gestionar inventario.";
      }
      const name = input.name.trim();
      const barcode = input.barcode?.trim() || undefined;
      if (!name) return "El nombre es obligatorio.";
      if (input.price < 0) return "El precio de venta no puede ser negativo.";
      if (input.costPrice < 0)
        return "El precio de costo no puede ser negativo.";
      if (input.quantity < 0) return "La cantidad no puede ser negativa.";
      const current = data.products.find((p) => p.id === id);
      if (!current) return "Producto no encontrado.";
      const image =
        input.image === null
          ? undefined
          : input.image !== undefined
            ? input.image || undefined
            : current.image;
      if (!barcode) return "El código de barras es obligatorio.";
      const clinical = validatePharmacy(input, { strict: true });
      if (clinical) return clinical;
      const packs = readSalePacks(input);
      if (packs.error) return packs.error;
      const details = normalizePharmacy(input);
      if (
        barcode &&
        data.products.some(
          (p) =>
            p.id !== id &&
            p.branchId === current.branchId &&
            p.barcode === barcode,
        )
      ) {
        return "Ese código de barras ya está registrado.";
      }
      const qty = Math.floor(input.quantity);
      const lots = ensureLots(current).lots ?? [];
      const extras = {
        minStock:
          input.minStock !== undefined
            ? Math.max(0, Math.floor(input.minStock))
            : current.minStock,
        unitsPerBox: packs.unitsPerBox,
        unitPrice: packs.unitPrice,
        unitsPerBlister: packs.unitsPerBlister,
        blisterPrice: packs.blisterPrice,
        controlled: Boolean(input.controlled),
      };
      let next: Product = {
        ...current,
        name,
        price: Number(input.price),
        costPrice: Number(input.costPrice),
        barcode,
        image,
        ...details,
        ...extras,
      };
      if (lots.length <= 1) {
        next = reflectLots(next, [
          {
            ...(lots[0] ?? {
              id: uid("lot"),
              lot: details.lot || "INICIAL",
              costPrice: Number(input.costPrice),
            }),
            lot: details.lot || lots[0]?.lot || "INICIAL",
            expiresAt: details.expiresAt,
            quantity: qty,
            costPrice: Number(input.costPrice),
          },
        ]);
      } else if (qty > current.quantity) {
        next = addIncomingLot(
          { ...next, lots },
          {
            id: uid("lot"),
            lot: details.lot || `LOTE-${Date.now().toString(36).toUpperCase()}`,
            expiresAt: details.expiresAt,
            quantity: qty - current.quantity,
            costPrice: Number(input.costPrice),
          },
        );
      } else if (qty < current.quantity) {
        return "Con varios lotes el stock se ajusta vendiendo o agregando un lote.";
      } else {
        next = reflectLots(next, lots);
      }
      persist({
        ...data,
        products: data.products.map((p) =>
          p.id === id ? { ...next, updatedAt: new Date().toISOString() } : p,
        ),
      });
      return null;
    },
    [data, persist, session],
  );
  const addLot = useCallback(
    (
      productId: string,
      input: { lot: string; expiresAt?: string; quantity: number; costPrice?: number },
    ) => {
      if (!session || !hasPermission(session, "inventario")) {
        return "No tienes permiso para gestionar inventario.";
      }
      const current = data.products.find((p) => p.id === productId);
      if (!current) return "Producto no encontrado.";
      const lot = input.lot.trim();
      if (!lot) return "El lote es obligatorio.";
      const quantity = Math.floor(input.quantity);
      if (quantity <= 0) return "La cantidad del lote debe ser mayor a 0.";
      const clinical = validatePharmacy(
        { ...current, lot, expiresAt: input.expiresAt },
        { strict: true },
      );
      if (clinical) return clinical;
      const next = addIncomingLot(current, {
        id: uid("lot"),
        lot,
        expiresAt: input.expiresAt,
        quantity,
        costPrice: input.costPrice ?? current.costPrice,
      });
      persist({
        ...data,
        products: data.products.map((p) =>
          p.id === productId ? { ...next, updatedAt: new Date().toISOString() } : p,
        ),
      });
      return null;
    },
    [data, persist, session],
  );
  const deleteProduct = useCallback(
    (id: string) => {
      if (!session || !hasPermission(session, "inventario")) return;
      persist({
        ...data,
        products: data.products.filter((p) => p.id !== id),
      });
    },
    [data, persist, session],
  );
  const createUser = useCallback(
    (input: {
      name: string;
      username: string;
      password: string;
      role: Role;
      branchId: string;
      allowedBranchIds?: string[];
      permissions?: Permission[];
    }) => {
      if (!canManageUsers(session)) {
        return "No tienes permiso para crear usuarios.";
      }
      const name = input.name.trim();
      const username = input.username.trim().toLowerCase();
      if (!name || !username || !input.password) {
        return "Completa todos los campos.";
      }
      if (input.password.trim().length < 8) {
        return "La contraseña debe tener al menos 8 caracteres.";
      }
      if (data.users.some((u) => u.username.toLowerCase() === username)) {
        return "Ese usuario ya existe.";
      }
      if (!data.branches.some((b) => b.id === input.branchId && !b.isWarehouse)) {
        return "No se pudo asignar el punto de venta.";
      }
      if (
        input.role === "administrador" &&
        session?.role !== "administrador"
      ) {
        return "Solo un administrador puede crear otros administradores.";
      }
      const storeIds = new Set(
        data.branches.filter((b) => !b.isWarehouse).map((b) => b.id),
      );
      const allowedRaw = (input.allowedBranchIds ?? [input.branchId]).filter(
        (id) => storeIds.has(id),
      );
      if (input.role !== "administrador" && allowedRaw.length === 0) {
        return "No se pudo asignar el punto de venta.";
      }
      if (
        input.role !== "administrador" &&
        !allowedRaw.includes(input.branchId)
      ) {
        return "No se pudo asignar el punto de venta.";
      }
      const permissions = normalizePermissions(
        input.role,
        input.permissions,
      );
      const user = normalizeUser({
        id: uid("usr"),
        name,
        username,
        password: input.password,
        role: input.role,
        branchId: input.branchId,
        allowedBranchIds: allowedRaw,
        permissions,
      });
      persist({ ...data, users: [...data.users, user] });
      return null;
    },
    [data, persist, session],
  );
  const updateUser = useCallback(
    (
      id: string,
      input: {
        name?: string;
        role?: Role;
        branchId?: string;
        allowedBranchIds?: string[];
        password?: string;
        permissions?: Permission[];
      },
    ) => {
      if (!canManageUsers(session)) {
        return "No tienes permiso para editar usuarios.";
      }
      const idx = data.users.findIndex((u) => u.id === id);
      if (idx < 0) return "Usuario no encontrado.";
      const current = data.users[idx];
      if (
        current.role === "administrador" &&
        session?.role !== "administrador" &&
        current.id !== session?.userId
      ) {
        return "No puedes editar a un administrador.";
      }
      const nextRole = input.role ?? current.role;
      if (
        nextRole === "administrador" &&
        session?.role !== "administrador"
      ) {
        return "Solo un administrador puede asignar ese rol.";
      }
      const nextBranchId = input.branchId ?? current.branchId;
      if (!data.branches.some((b) => b.id === nextBranchId && !b.isWarehouse)) {
        return "No se pudo asignar el punto de venta.";
      }
      const storeIds = new Set(
        data.branches.filter((b) => !b.isWarehouse).map((b) => b.id),
      );
      const allowedRaw = (
        input.allowedBranchIds ??
        current.allowedBranchIds ??
        [nextBranchId]
      ).filter((bid) => storeIds.has(bid));
      if (nextRole !== "administrador" && allowedRaw.length === 0) {
        return "No se pudo asignar el punto de venta.";
      }
      if (
        nextRole !== "administrador" &&
        !allowedRaw.includes(nextBranchId)
      ) {
        return "No se pudo asignar el punto de venta.";
      }
      if (
        input.password &&
        input.password.trim() &&
        input.password.trim().length < 8
      ) {
        return "La contraseña debe tener al menos 8 caracteres.";
      }
      const next = normalizeUser({
        ...current,
        name: input.name?.trim() || current.name,
        role: nextRole,
        branchId: nextBranchId,
        allowedBranchIds: allowedRaw,
        password:
          input.password && input.password.trim()
            ? input.password
            : current.password,
        permissions: normalizePermissions(
          nextRole,
          input.permissions ?? current.permissions,
        ),
      });
      const users = [...data.users];
      users[idx] = next;
      persist({ ...data, users });
      if (session?.userId === id) {
        persistSession(
          sessionFromUser(
            next,
            session.role === "administrador" || next.role === "administrador"
              ? session.branchId
              : next.branchId,
          ),
        );
      }
      return null;
    },
    [data, persist, persistSession, session],
  );
  const deleteUser = useCallback(
    (id: string) => {
      if (!canManageUsers(session)) {
        return "No tienes permiso para eliminar usuarios.";
      }
      if (id === session?.userId) return "No puedes eliminarte a ti mismo.";
      if (id === "usr-admin") return "No se puede eliminar el admin principal.";
      const target = data.users.find((u) => u.id === id);
      if (
        target?.role === "administrador" &&
        session?.role !== "administrador"
      ) {
        return "No puedes eliminar a un administrador.";
      }
      persist({
        ...data,
        users: data.users.filter((u) => u.id !== id),
      });
      return null;
    },
    [data, persist, session],
  );
  const checkout = useCallback(
    (items: SaleItem[], payment?: CheckoutPayment, meta?: CheckoutMeta) => {
      const openShiftId = (data.cashShifts ?? []).find(
        (shift) => shift.branchId === session?.branchId && !shift.closedAt,
      )?.id;
      const result = applyCheckout(data, session, items, payment, {
        ...meta,
        shiftId: meta?.shiftId ?? openShiftId,
      });
      if (result.error || !result.store || !result.sale) {
        return { error: result.error ?? "No se pudo cobrar." };
      }
      const offline = !isBrowserOnline();
      persist(result.store, {
        offlineSale: result.sale,
      });
      return {
        error: null,
        sale: result.sale,
        offline,
        invoice: result.store.invoices?.find(
          (item) => item.id === result.sale?.invoiceId,
        ),
      };
    },
    [data, persist, session],
  );

  const voidSaleById = useCallback(
    (saleId: string) => {
      if (!session || !hasPermission(session, "pos")) {
        return "No tienes permiso para anular ventas.";
      }
      const result = voidSale(data, saleId);
      if (result.error || !result.store) return result.error ?? "No se pudo anular.";
      persist(result.store);
      return null;
    },
    [data, persist, session],
  );

  const returnLine = useCallback(
    (saleId: string, lineIndex: number) => {
      if (!session || !hasPermission(session, "pos")) {
        return "No tienes permiso para devolver ventas.";
      }
      const result = returnSaleLine(data, saleId, lineIndex);
      if (result.error || !result.store) return result.error ?? "No se pudo devolver.";
      persist(result.store);
      return null;
    },
    [data, persist, session],
  );

  const openShift = useCallback(
    (openingAmount: number) => {
      if (!session || !hasPermission(session, "pos")) {
        return "No tienes permiso para abrir caja.";
      }
      if (!Number.isFinite(openingAmount) || openingAmount < 0) {
        return "El fondo inicial no es válido.";
      }
      const shifts = data.cashShifts ?? [];
      if (shifts.some((shift) => shift.branchId === session.branchId && !shift.closedAt)) {
        return "Ya hay un turno de caja abierto.";
      }
      if (isCashDayClosed(shifts, session.branchId)) {
        return "El día ya se cerró. La caja se apertura mañana.";
      }
      const locked = isCashFloatLocked(data.settings);
      const storedBase = data.settings.cashFloat;
      if (locked && typeof storedBase !== "number") {
        return "La cuota fija no está definida. Configúrala en Configuración.";
      }
      const opening = locked
        ? storedBase!
        : Math.round(openingAmount * 100) / 100;
      const shift: CashShift = {
        id: uid("shift"),
        branchId: session.branchId,
        userId: session.userId,
        userName: session.name,
        openingAmount: opening,
        openedAt: new Date().toISOString(),
      };
      persist({
        ...data,
        cashShifts: [shift, ...shifts],
      });
      return null;
    },
    [data, persist, session],
  );

  const closeShift = useCallback(
    (countedCash?: number, note?: string) => {
      if (!session || !hasPermission(session, "pos")) {
        return "No tienes permiso para cerrar caja.";
      }
      if (
        countedCash !== undefined &&
        (!Number.isFinite(countedCash) || countedCash < 0)
      ) {
        return "El efectivo contado no es válido.";
      }
      const shifts = data.cashShifts ?? [];
      const current = shifts.find(
        (shift) => shift.branchId === session.branchId && !shift.closedAt,
      );
      if (!current) return "No hay un turno abierto.";
      const sales = data.sales.filter(
        (sale) =>
          sale.shiftId === current.id &&
          sale.status !== "anulada",
      );
      const sum = (method: "efectivo" | "tarjeta" | "transferencia") =>
        Math.round(
          sales
            .filter((sale) => (sale.paymentMethod ?? "efectivo") === method)
            .reduce((total, sale) => total + sale.total, 0) * 100,
        ) / 100;
      const cashSales = sum("efectivo");
      const capital = Math.round(current.openingAmount * 100) / 100;
      const expectedCash = Math.round((capital + cashSales) * 100) / 100;
      const counted =
        countedCash === undefined
          ? expectedCash
          : Math.round(countedCash * 100) / 100;
      const now = new Date().toISOString();
      const closed: CashShift = {
        ...current,
        closedAt: now,
        countedCash: counted,
        expectedCash,
        difference: Math.round((counted - expectedCash) * 100) / 100,
        cashSales,
        cardTotal: sum("tarjeta"),
        transferTotal: sum("transferencia"),
        note: note?.trim() || undefined,
      };
      persist({
        ...data,
        cashShifts: shifts.map((shift) => (shift.id === current.id ? closed : shift)),
      });
      return null;
    },
    [data, persist, session],
  );

  const createPurchaseOrder = useCallback(
    (input: { supplierId: string; note?: string; items: PurchaseOrderItem[] }) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para hacer pedidos.";
      }
      if (!data.suppliers.some((supplier) => supplier.id === input.supplierId)) {
        return "Proveedor no encontrado.";
      }
      if (!input.items.length) return "Agrega al menos un producto al pedido.";
      for (const item of input.items) {
        if (!item.name.trim()) return "Cada línea necesita nombre.";
        if (!item.lot.trim()) return `Indica el lote de ${item.name}.`;
        if (item.quantity <= 0) return `Cantidad inválida de ${item.name}.`;
        if (item.costPrice < 0 || item.price < 0) return "Los precios no pueden ser negativos.";
      }
      const order: PurchaseOrder = {
        id: uid("po"),
        supplierId: input.supplierId,
        status: "pedido",
        note: input.note?.trim() || undefined,
        items: input.items.map((item) => ({
          ...item,
          name: item.name.trim(),
          lot: item.lot.trim(),
          quantity: Math.floor(item.quantity),
        })),
        createdAt: new Date().toISOString(),
      };
      persist({
        ...data,
        purchaseOrders: [order, ...(data.purchaseOrders ?? [])],
      });
      return null;
    },
    [data, persist, session],
  );

  const receivePurchaseOrder = useCallback(
    (id: string) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para recibir pedidos.";
      }
      const order = (data.purchaseOrders ?? []).find((item) => item.id === id);
      if (!order) return "Pedido no encontrado.";
      if (order.status !== "pedido") return "Ese pedido ya no está pendiente.";
      const branchId = session.branchId;
      let products = [...data.products];
      const now = new Date().toISOString();
      let debt = 0;
      for (const item of order.items) {
        debt += item.quantity * item.costPrice;
        const barcode = item.barcode?.trim();
        let idx = barcode
          ? products.findIndex((p) => p.branchId === branchId && p.barcode === barcode)
          : -1;
        if (idx < 0) {
          idx = products.findIndex(
            (p) => p.branchId === branchId && p.name.toLowerCase() === item.name.toLowerCase(),
          );
        }
        if (idx >= 0) {
          products[idx] = {
            ...addIncomingLot(products[idx], {
              id: uid("lot"),
              lot: item.lot,
              expiresAt: item.expiresAt,
              quantity: item.quantity,
              costPrice: item.costPrice,
            }),
            price: item.price || products[idx].price,
            updatedAt: now,
          };
        } else {
          products = [
            ensureLots({
              id: uid("prod"),
              name: item.name.trim(),
              price: item.price,
              costPrice: item.costPrice,
              quantity: item.quantity,
              barcode,
              genericName: item.genericName,
              presentation: item.presentation,
              lot: item.lot,
              expiresAt: item.expiresAt,
              lots: [
                {
                  id: uid("lot"),
                  lot: item.lot,
                  expiresAt: item.expiresAt,
                  quantity: item.quantity,
                  looseUnits: 0,
                  costPrice: item.costPrice,
                },
              ],
              branchId,
              createdAt: now,
              updatedAt: now,
            }),
            ...products,
          ];
        }
      }
      persist({
        ...data,
        products,
        purchaseOrders: (data.purchaseOrders ?? []).map((item) =>
          item.id === id ? { ...item, status: "recibido" as const, receivedAt: now } : item,
        ),
        suppliers: data.suppliers.map((supplier) =>
          supplier.id === order.supplierId
            ? {
                ...supplier,
                balance: Math.round((supplier.balance + debt) * 100) / 100,
                updatedAt: now,
              }
            : supplier,
        ),
      });
      return null;
    },
    [data, persist, session],
  );

  const cancelPurchaseOrder = useCallback(
    (id: string) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para cancelar pedidos.";
      }
      const order = (data.purchaseOrders ?? []).find((item) => item.id === id);
      if (!order) return "Pedido no encontrado.";
      if (order.status !== "pedido") return "Solo se cancela un pedido pendiente.";
      persist({
        ...data,
        purchaseOrders: (data.purchaseOrders ?? []).map((item) =>
          item.id === id ? { ...item, status: "cancelado" as const } : item,
        ),
      });
      return null;
    },
    [data, persist, session],
  );

  const transferStock = useCallback(
    (input: {
      fromBranchId: string;
      toBranchId: string;
      items: { productId: string; quantity: number }[];
      note?: string;
    }) => {
      if (!session || !hasPermission(session, "bodega")) {
        return "No tienes permiso para realizar traslados.";
      }
      if (input.fromBranchId === input.toBranchId) {
        return "Origen y destino deben ser diferentes.";
      }
      if (!input.items.length) return "Agrega al menos un producto.";
      const fromOk = data.branches.some((b) => b.id === input.fromBranchId);
      const toBranch = data.branches.find((b) => b.id === input.toBranchId);
      if (!fromOk || !toBranch) return "Origen o destino no válido.";
      if (toBranch.isWarehouse) {
        return "La bodega solo envía traslados a la tienda.";
      }

      let products = [...data.products];
      const transferItems: TransferItem[] = [];
      const now = new Date().toISOString();

      for (const line of input.items) {
        const qty = Math.floor(line.quantity);
        if (qty <= 0) return "Las cantidades deben ser mayores a 0.";
        const srcIdx = products.findIndex((p) => p.id === line.productId);
        if (srcIdx < 0) return "Producto de origen no encontrado.";
        const src = products[srcIdx];
        if (src.branchId !== input.fromBranchId) {
          return `El producto ${src.name} no pertenece al origen.`;
        }
        const taken = commitSaleItem(src, {
          productId: src.id,
          name: src.name,
          price: src.price,
          quantity: qty,
        });
        if (taken.error || !taken.item.allocations) {
          return taken.error ?? `Stock insuficiente de ${src.name}.`;
        }
        products[srcIdx] = { ...taken.product, updatedAt: now };
        const moved = taken.item.allocations;

        const barcode = src.barcode?.trim();
        let destIdx = -1;
        if (barcode) {
          destIdx = products.findIndex(
            (p) => p.branchId === input.toBranchId && p.barcode === barcode,
          );
        }
        if (destIdx < 0) {
          destIdx = products.findIndex(
            (p) =>
              p.branchId === input.toBranchId &&
              p.name.toLowerCase() === src.name.toLowerCase(),
          );
        }

        const receiveLots = (base: Product): Product => {
          let next = base;
          for (const line of moved) {
            if (line.boxes <= 0) continue;
            next = addIncomingLot(next, {
              id: uid("lot"),
              lot: line.lot || "TRASLADO",
              expiresAt: line.expiresAt,
              quantity: line.boxes,
              costPrice: getCostPrice(src),
            });
          }
          return { ...next, updatedAt: now };
        };
        if (destIdx >= 0) {
          products[destIdx] = receiveLots({
            ...products[destIdx],
            costPrice: getCostPrice(src),
            price: src.price,
            image: src.image ?? products[destIdx].image,
            ...pharmacyFields(src),
            controlled: src.controlled,
            minStock: src.minStock,
            unitsPerBox: src.unitsPerBox,
            unitPrice: src.unitPrice,
            unitsPerBlister: src.unitsPerBlister,
            blisterPrice: src.blisterPrice,
          });
        } else {
          products = [
            receiveLots({
              id: uid("prod"),
              name: src.name,
              price: src.price,
              costPrice: getCostPrice(src),
              quantity: 0,
              barcode: src.barcode,
              image: src.image,
              ...pharmacyFields(src),
              controlled: src.controlled,
              minStock: src.minStock,
              unitsPerBox: src.unitsPerBox,
              unitPrice: src.unitPrice,
              unitsPerBlister: src.unitsPerBlister,
              blisterPrice: src.blisterPrice,
              branchId: input.toBranchId,
              createdAt: now,
              updatedAt: now,
            }),
            ...products,
          ];
        }

        transferItems.push({
          productId: src.id,
          barcode: src.barcode,
          name: src.name,
          quantity: qty,
          costPrice: getCostPrice(src),
          price: src.price,
          image: src.image,
        });
      }

      const transfer: Transfer = {
        id: uid("trf"),
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        items: transferItems,
        userId: session.userId,
        userName: session.name,
        note: input.note?.trim() || undefined,
        createdAt: now,
      };

      persist({
        ...data,
        products,
        transfers: [transfer, ...(data.transfers ?? [])],
      });
      return null;
    },
    [data, persist, session],
  );

  const updateSettings = useCallback(
    (input: {
      companyName?: string;
      slogan?: string;
      address?: string;
      phone?: string;
      logo?: string | null;
      pdfStyle?: CompanySettings["pdfStyle"];
      nit?: string;
      invoiceSeries?: string;
      cashFloatMode?: "fija" | "libre";
      cashFloat?: number;
    }) => {
      if (!session || !hasPermission(session, "configuracion")) {
        return "No tienes permiso para cambiar la configuración.";
      }
      const nextName =
        input.companyName !== undefined
          ? input.companyName.trim()
          : data.settings.companyName;
      const nextSlogan =
        input.slogan !== undefined
          ? input.slogan.trim()
          : data.settings.slogan;
      const nextAddress =
        input.address !== undefined
          ? input.address.trim()
          : data.settings.address;
      const nextPhone =
        input.phone !== undefined ? input.phone.trim() : data.settings.phone;
      let cashFloatMode = data.settings.cashFloatMode;
      let cashFloat = data.settings.cashFloat;
      if (input.cashFloatMode === "libre") {
        cashFloatMode = "libre";
      } else if (input.cashFloatMode === "fija") {
        if (
          typeof input.cashFloat !== "number" ||
          !Number.isFinite(input.cashFloat) ||
          input.cashFloat < 0
        ) {
          return "La cuota fija no es válida.";
        }
        cashFloatMode = "fija";
        cashFloat = Math.round(input.cashFloat * 100) / 100;
      }
      const settings: CompanySettings = {
        ...data.settings,
        companyName: nextName,
        slogan: nextSlogan ?? "",
        address: nextAddress || undefined,
        phone: nextPhone || undefined,
        nit:
          input.nit !== undefined
            ? input.nit.trim() || undefined
            : data.settings.nit,
        invoiceSeries:
          input.invoiceSeries !== undefined
            ? input.invoiceSeries.trim()
            : data.settings.invoiceSeries,
        logo:
          input.logo === null
            ? undefined
            : input.logo !== undefined
              ? input.logo
              : data.settings.logo,
        pdfStyle: normalizePdfStyle(
          input.pdfStyle ?? data.settings.pdfStyle,
        ),
        cashFloatMode,
        cashFloat,
      };
      persist({ ...data, settings });
      return null;
    },
    [data, persist, session],
  );

  const saveSatCredentials = useCallback(
    async (input: { usuario: string; clave?: string }) => {
      if (!session || !hasPermission(session, "configuracion")) {
        return "No tienes permiso para cambiar la configuración.";
      }
      try {
        const res = await fetch("/api/sat/credentials", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario: input.usuario,
            clave: input.clave ?? "",
          }),
        });
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          store?: Partial<import("@/lib/types").StoreData>;
        } | null;
        if (!res.ok) return body?.error || "No se pudo guardar la consulta de NIT.";
        if (body?.store) {
          const saved = normalizeStoreData(body.store);
          setData(saved);
          dataRef.current = saved;
          writeLocalStore(saved);
        }
        return null;
      } catch {
        return "No se pudo guardar la consulta de NIT.";
      }
    },
    [session],
  );

  const importProducts = useCallback(
    (
      rows: ({
        name: string;
        quantity: number;
        costPrice: number;
        price: number;
        barcode?: string;
      } & PharmacyDetails)[],
    ) => {
      if (!session) {
        return { error: "Sesión no válida.", created: 0, updated: 0 };
      }
      if (!hasPermission(session, "inventario")) {
        return {
          error: "No tienes permiso para gestionar inventario.",
          created: 0,
          updated: 0,
        };
      }
      if (!rows.length) {
        return {
          error: "No hay productos para importar.",
          created: 0,
          updated: 0,
        };
      }

      const branchId = session.branchId;
      let products = [...data.products];
      let created = 0;
      let updated = 0;
      const now = new Date().toISOString();
      const seenBarcodes = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.name.trim();
        if (!name) {
          return {
            error: `Fila ${i + 1}: nombre vacío.`,
            created: 0,
            updated: 0,
          };
        }
        if (row.quantity < 0 || row.costPrice < 0 || row.price < 0) {
          return {
            error: `Fila ${i + 1}: valores negativos no permitidos (${name}).`,
            created: 0,
            updated: 0,
          };
        }

        const barcode =
          row.barcode?.trim() ||
          `IMP-${Date.now().toString(36)}-${i + 1}`.toUpperCase();

        if (seenBarcodes.has(`${branchId}:${barcode}`)) {
          return {
            error: `Código de barras duplicado en el archivo: ${barcode}`,
            created: 0,
            updated: 0,
          };
        }
        seenBarcodes.add(`${branchId}:${barcode}`);

        let idx = products.findIndex(
          (p) => p.branchId === branchId && p.barcode === barcode,
        );
        if (idx < 0) {
          idx = products.findIndex(
            (p) =>
              p.branchId === branchId &&
              p.name.toLowerCase() === name.toLowerCase(),
          );
        }

        const details = normalizePharmacy(row);
        const clinical = validatePharmacy(row);
        if (clinical) {
          return {
            error: `Fila ${i + 1}: ${clinical}`,
            created: 0,
            updated: 0,
          };
        }
        if (idx >= 0) {
          const base: Product = {
            ...products[idx],
            name,
            price: Number(row.price),
            costPrice: Number(row.costPrice),
            barcode: products[idx].barcode || barcode,
            ...details,
            category: details.category ?? products[idx].category,
            genericName: details.genericName ?? products[idx].genericName,
            presentation: details.presentation ?? products[idx].presentation,
            concentration: details.concentration ?? products[idx].concentration,
            laboratory: details.laboratory ?? products[idx].laboratory,
            requiresPrescription: row.requiresPrescription
              ? details.requiresPrescription
              : products[idx].requiresPrescription,
          };
          products[idx] = {
            ...addIncomingLot(base, {
              id: uid("lot"),
              lot: details.lot || `IMP-${i + 1}`,
              expiresAt: details.expiresAt,
              quantity: Math.floor(row.quantity),
              costPrice: Number(row.costPrice),
            }),
            updatedAt: now,
          };
          updated += 1;
        } else {
          products = [
            ensureLots({
              id: uid("prod"),
              name,
              price: Number(row.price),
              costPrice: Number(row.costPrice),
              quantity: Math.floor(row.quantity),
              barcode,
              ...details,
              lots: [
                {
                  id: uid("lot"),
                  lot: details.lot || "INICIAL",
                  expiresAt: details.expiresAt,
                  quantity: Math.floor(row.quantity),
                  looseUnits: 0,
                  costPrice: Number(row.costPrice),
                },
              ],
              branchId,
              createdAt: now,
              updatedAt: now,
            }),
            ...products,
          ];
          created += 1;
        }
      }

      persist({ ...data, products });
      return { error: null, created, updated };
    },
    [data, persist, session],
  );

  const createSupplier = useCallback(
    (input: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      balance?: number;
    }) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para gestionar proveedores.";
      }
      const name = input.name.trim();
      if (!name) return "El nombre del proveedor es obligatorio.";
      const now = new Date().toISOString();
      const supplier: Supplier = {
        id: uid("sup"),
        name,
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        address: input.address?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        balance: Math.max(0, Number(input.balance) || 0),
        createdAt: now,
        updatedAt: now,
      };
      persist({
        ...data,
        suppliers: [...(data.suppliers ?? []), supplier],
      });
      return null;
    },
    [data, persist, session],
  );

  const updateSupplier = useCallback(
    (
      id: string,
      input: {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
        balance?: number;
      },
    ) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para gestionar proveedores.";
      }
      const idx = (data.suppliers ?? []).findIndex((s) => s.id === id);
      if (idx < 0) return "Proveedor no encontrado.";
      const current = data.suppliers[idx];
      const nextName = input.name?.trim() || current.name;
      if (!nextName) return "El nombre del proveedor es obligatorio.";
      const next: Supplier = {
        ...current,
        name: nextName,
        phone:
          input.phone !== undefined
            ? input.phone.trim() || undefined
            : current.phone,
        email:
          input.email !== undefined
            ? input.email.trim() || undefined
            : current.email,
        address:
          input.address !== undefined
            ? input.address.trim() || undefined
            : current.address,
        notes:
          input.notes !== undefined
            ? input.notes.trim() || undefined
            : current.notes,
        balance:
          input.balance !== undefined
            ? Math.max(0, Number(input.balance) || 0)
            : current.balance,
        updatedAt: new Date().toISOString(),
      };
      const suppliers = [...data.suppliers];
      suppliers[idx] = next;
      persist({ ...data, suppliers });
      return null;
    },
    [data, persist, session],
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para gestionar proveedores.";
      }
      persist({
        ...data,
        suppliers: (data.suppliers ?? []).filter((s) => s.id !== id),
        supplierPayments: (data.supplierPayments ?? []).filter(
          (p) => p.supplierId !== id,
        ),
      });
      return null;
    },
    [data, persist, session],
  );

  const addSupplierPayment = useCallback(
    (input: {
      supplierId: string;
      amount: number;
      method: SupplierPaymentMethod;
      note?: string;
      paidAt?: string;
    }) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return {
          error: "No tienes permiso para registrar pagos.",
        };
      }
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "El monto del pago debe ser mayor a 0." };
      }
      const idx = (data.suppliers ?? []).findIndex(
        (s) => s.id === input.supplierId,
      );
      if (idx < 0) return { error: "Proveedor no encontrado." };
      const supplier = data.suppliers[idx];
      const now = new Date().toISOString();
      const payment: SupplierPayment = {
        id: uid("pay"),
        supplierId: supplier.id,
        amount,
        method: input.method,
        note: input.note?.trim() || undefined,
        paidAt: input.paidAt || now,
        userId: session.userId,
        userName: session.name,
        createdAt: now,
      };
      const nextSupplier: Supplier = {
        ...supplier,
        balance: Math.max(0, supplier.balance - amount),
        updatedAt: now,
      };
      const suppliers = [...data.suppliers];
      suppliers[idx] = nextSupplier;
      persist({
        ...data,
        suppliers,
        supplierPayments: [payment, ...(data.supplierPayments ?? [])],
      });
      return { error: null, payment, supplier: nextSupplier };
    },
    [data, persist, session],
  );

  const deleteSupplierPayment = useCallback(
    (id: string) => {
      if (!session || !hasPermission(session, "proveedores")) {
        return "No tienes permiso para eliminar pagos.";
      }
      const payment = (data.supplierPayments ?? []).find((p) => p.id === id);
      if (!payment) return "Pago no encontrado.";
      const suppliers = (data.suppliers ?? []).map((s) =>
        s.id === payment.supplierId
          ? {
              ...s,
              balance: s.balance + payment.amount,
              updatedAt: new Date().toISOString(),
            }
          : s,
      );
      persist({
        ...data,
        suppliers,
        supplierPayments: (data.supplierPayments ?? []).filter(
          (p) => p.id !== id,
        ),
      });
      return null;
    },
    [data, persist, session],
  );

  const branchProducts = useMemo(() => {
    if (!session) return [];
    return data.products.filter((p) => p.branchId === session.branchId);
  }, [data.products, session]);
  const branchSales = useMemo(() => {
    if (!session) return [];
    return data.sales.filter((s) => s.branchId === session.branchId);
  }, [data.sales, session]);
  const currentBranchName = useMemo(() => {
    if (!session) return "";
    return (
      data.branches.find((b) => b.id === session.branchId)?.name ?? "Tienda"
    );
  }, [data.branches, session]);
  const storeBranches = useMemo(
    () => data.branches.filter((b) => !b.isWarehouse),
    [data.branches],
  );
  const visibleBranches = useMemo(() => {
    if (!session) return [];
    if (session.role === "administrador" && !session.allowedBranchIds?.length) {
      return storeBranches;
    }
    const allowed = new Set(
      session.allowedBranchIds?.length
        ? session.allowedBranchIds
        : [session.branchId],
    );
    return storeBranches.filter((b) => allowed.has(b.id));
  }, [session, storeBranches]);
  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      syncError,
      isOnline,
      pendingSync,
      pendingOfflineCount,
      offlineConflicts,
      lastFlushReport,
      flushSync,
      retryOfflineSale,
      discardOfflineSale,
      session,
      data,
      login,
      logout,
      setActiveBranch,
      addProduct,
      addLot,
      updateProduct,
      deleteProduct,
      createUser,
      updateUser,
      deleteUser,
      checkout,
      voidSale: voidSaleById,
      returnSaleLine: returnLine,
      openShift,
      closeShift,
      createPurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
      transferStock,
      updateSettings,
      saveSatCredentials,
      importProducts,
      createSupplier,
      updateSupplier,
      deleteSupplier,
      addSupplierPayment,
      deleteSupplierPayment,
      branchProducts,
      branchSales,
      currentBranchName,
      storeBranches,
      visibleBranches,
    }),
    [
      ready,
      syncError,
      isOnline,
      pendingSync,
      pendingOfflineCount,
      offlineConflicts,
      lastFlushReport,
      flushSync,
      retryOfflineSale,
      discardOfflineSale,
      session,
      data,
      login,
      logout,
      setActiveBranch,
      addProduct,
      addLot,
      updateProduct,
      deleteProduct,
      createUser,
      updateUser,
      deleteUser,
      checkout,
      voidSaleById,
      returnLine,
      openShift,
      closeShift,
      createPurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
      transferStock,
      updateSettings,
      saveSatCredentials,
      importProducts,
      createSupplier,
      updateSupplier,
      deleteSupplier,
      addSupplierPayment,
      deleteSupplierPayment,
      branchProducts,
      branchSales,
      currentBranchName,
      storeBranches,
      visibleBranches,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
