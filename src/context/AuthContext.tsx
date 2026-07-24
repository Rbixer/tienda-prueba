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
import { SESSION_KEY, createInitialData, uid, getCostPrice, normalizePdfStyle } from "@/lib/store";
import {
  canManageUsers,
  hasPermission,
  normalizePermissions,
} from "@/lib/permissions";
import {
  fetchStore,
  mergeStores,
  readLocalStore,
  saveStore,
} from "@/lib/sync";
import type {
  CompanySettings,
  Permission,
  Product,
  Sale,
  SaleItem,
  Session,
  StoreData,
  Transfer,
  TransferItem,
  User,
  Role,
} from "@/lib/types";
type AuthContextValue = {
  ready: boolean;
  syncError: string | null;
  session: Session | null;
  data: StoreData;
  login: (username: string, password: string) => string | null;
  logout: () => void;
  setActiveBranch: (branchId: string) => void;
  addProduct: (input: {
    name: string;
    price: number;
    costPrice: number;
    quantity: number;
    barcode?: string;
    image?: string;
    branchId?: string;
  }) => string | null;
  updateProduct: (
    id: string,
    input: {
      name: string;
      price: number;
      costPrice: number;
      quantity: number;
      barcode?: string;
      image?: string;
    },
  ) => string | null;
  deleteProduct: (id: string) => void;
  createUser: (input: {
    name: string;
    username: string;
    password: string;
    role: Role;
    branchId: string;
    permissions?: Permission[];
  }) => string | null;
  updateUser: (
    id: string,
    input: {
      name?: string;
      role?: Role;
      branchId?: string;
      password?: string;
      permissions?: Permission[];
    },
  ) => string | null;
  deleteUser: (id: string) => string | null;
  checkout: (items: SaleItem[]) => string | null;
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
  }) => string | null;
  importProducts: (
    rows: {
      name: string;
      quantity: number;
      costPrice: number;
      price: number;
      barcode?: string;
    }[],
  ) => { error: string | null; created: number; updated: number };
  branchProducts: Product[];
  branchSales: Sale[];
  currentBranchName: string;
  storeBranches: StoreData["branches"];
};
const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromUser(user: User, branchId?: string): Session {
  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    branchId: branchId ?? user.branchId,
    permissions: normalizePermissions(user.role, user.permissions),
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
    };
  } catch {
    return null;
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [data, setData] = useState<StoreData>(createInitialData);
  const [session, setSession] = useState<Session | null>(null);
  const dataRef = useRef(data);
  const savingRef = useRef(false);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const server = await fetchStore();
        const local = readLocalStore();
        const merged = mergeStores(server, local);
        const needsUpload =
          !!local &&
          (merged.sales.length !== server.sales.length ||
            merged.products.length !== server.products.length ||
            merged.users.length !== server.users.length);
        if (needsUpload) {
          await saveStore(merged);
        }
        if (!cancelled) {
          setData(merged);
          setSyncError(null);
          const existing = loadSession();
          if (existing) {
            const user = merged.users.find((u) => u.id === existing.userId);
            if (user) {
              setSession(
                sessionFromUser(
                  user,
                  existing.role === "administrador"
                    ? existing.branchId
                    : user.branchId,
                ),
              );
            } else {
              setSession(null);
              localStorage.removeItem(SESSION_KEY);
            }
          }
        }
      } catch {
        const local = readLocalStore() ?? createInitialData();
        if (!cancelled) {
          setData(local);
          setSyncError(
            "Sin conexión al servidor compartido. Los datos pueden no sincronizarse con otros dispositivos.",
          );
          const existing = loadSession();
          if (existing) {
            const user = local.users.find((u) => u.id === existing.userId);
            if (user) {
              setSession(
                sessionFromUser(
                  user,
                  existing.role === "administrador"
                    ? existing.branchId
                    : user.branchId,
                ),
              );
            } else {
              setSession(null);
              localStorage.removeItem(SESSION_KEY);
            }
          }
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);
  // Sincroniza ventas/productos desde el servidor (local ↔ PWA)
  useEffect(() => {
    if (!ready) return;
    async function pull() {
      if (savingRef.current || document.hidden) return;
      try {
        const server = await fetchStore();
        const current = dataRef.current;
        const serverSig = `${server.sales.length}:${server.products.length}:${server.users.length}:${server.transfers?.length ?? 0}:${server.settings?.logo ?? ""}:${server.settings?.companyName ?? ""}:${server.sales[0]?.id ?? ""}:${server.products[0]?.updatedAt ?? ""}`;
        const localSig = `${current.sales.length}:${current.products.length}:${current.users.length}:${current.transfers?.length ?? 0}:${current.settings?.logo ?? ""}:${current.settings?.companyName ?? ""}:${current.sales[0]?.id ?? ""}:${current.products[0]?.updatedAt ?? ""}`;
        if (serverSig !== localSig) {
          setData(server);
          setSyncError(null);
        }
      } catch {
        // ignore polling errors
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
  }, [ready]);
  const persist = useCallback((next: StoreData) => {
    setData(next);
    dataRef.current = next;
    savingRef.current = true;
    saveStore(next)
      .then(() => setSyncError(null))
      .catch(() =>
        setSyncError(
          "No se pudo sincronizar con el servidor. Revisa la conexión.",
        ),
      )
      .finally(() => {
        savingRef.current = false;
      });
  }, []);
  const persistSession = useCallback((next: Session | null) => {
    setSession(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }, []);
  const login = useCallback(
    (username: string, password: string) => {
      const user = data.users.find(
        (u) =>
          u.username.toLowerCase() === username.trim().toLowerCase() &&
          u.password === password,
      );
      if (!user) return "Usuario o contraseña incorrectos.";
      persistSession(sessionFromUser(user));
      return null;
    },
    [data.users, persistSession],
  );
  const logout = useCallback(() => {
    persistSession(null);
  }, [persistSession]);
  const setActiveBranch = useCallback(
    (branchId: string) => {
      if (!session) return;
      if (session.role !== "administrador") return;
      const exists = data.branches.some((b) => b.id === branchId);
      if (!exists) return;
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
      image?: string;
      branchId?: string;
    }) => {
      if (!session) return "Sesión no válida.";
      const name = input.name.trim();
      const barcode = input.barcode?.trim() || undefined;
      if (!name) return "El nombre es obligatorio.";
      if (!input.image) return "La fotografía del producto es obligatoria.";
      if (!barcode) return "El código de barras es obligatorio.";
      if (input.price < 0) return "El precio de venta no puede ser negativo.";
      if (input.costPrice < 0)
        return "El precio de costo no puede ser negativo.";
      if (input.quantity < 0) return "La cantidad no puede ser negativa.";
      const branchId = input.branchId ?? session.branchId;
      if (
        barcode &&
        data.products.some(
          (p) => p.branchId === branchId && p.barcode === barcode,
        )
      ) {
        return "Ese código de barras ya está registrado en esta sucursal.";
      }
      const now = new Date().toISOString();
      const product: Product = {
        id: uid("prod"),
        name,
        price: Number(input.price),
        costPrice: Number(input.costPrice),
        quantity: Math.floor(input.quantity),
        barcode,
        image: input.image,
        branchId,
        createdAt: now,
        updatedAt: now,
      };
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
        image?: string;
      },
    ) => {
      const name = input.name.trim();
      const barcode = input.barcode?.trim() || undefined;
      if (!name) return "El nombre es obligatorio.";
      if (input.price < 0) return "El precio de venta no puede ser negativo.";
      if (input.costPrice < 0)
        return "El precio de costo no puede ser negativo.";
      if (input.quantity < 0) return "La cantidad no puede ser negativa.";
      const current = data.products.find((p) => p.id === id);
      if (!current) return "Producto no encontrado.";
      const image = input.image ?? current.image;
      if (!image) return "La fotografía del producto es obligatoria.";
      if (!barcode) return "El código de barras es obligatorio.";
      if (
        barcode &&
        data.products.some(
          (p) =>
            p.id !== id &&
            p.branchId === current.branchId &&
            p.barcode === barcode,
        )
      ) {
        return "Ese código de barras ya está registrado en esta sucursal.";
      }
      persist({
        ...data,
        products: data.products.map((p) =>
          p.id === id
            ? {
                ...p,
                name,
                price: Number(input.price),
                costPrice: Number(input.costPrice),
                quantity: Math.floor(input.quantity),
                barcode,
                image,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      });
      return null;
    },
    [data, persist],
  );
  const deleteProduct = useCallback(
    (id: string) => {
      persist({
        ...data,
        products: data.products.filter((p) => p.id !== id),
      });
    },
    [data, persist],
  );
  const createUser = useCallback(
    (input: {
      name: string;
      username: string;
      password: string;
      role: Role;
      branchId: string;
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
      if (data.users.some((u) => u.username.toLowerCase() === username)) {
        return "Ese usuario ya existe.";
      }
      if (!data.branches.some((b) => b.id === input.branchId)) {
        return "Sucursal no válida.";
      }
      if (
        input.role === "administrador" &&
        session?.role !== "administrador"
      ) {
        return "Solo un administrador puede crear otros administradores.";
      }
      const permissions = normalizePermissions(
        input.role,
        input.permissions,
      );
      const user: User = {
        id: uid("usr"),
        name,
        username,
        password: input.password,
        role: input.role,
        branchId: input.branchId,
        permissions,
      };
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
      if (input.branchId && !data.branches.some((b) => b.id === input.branchId)) {
        return "Sucursal no válida.";
      }
      const next: User = {
        ...current,
        name: input.name?.trim() || current.name,
        role: nextRole,
        branchId: input.branchId ?? current.branchId,
        password:
          input.password && input.password.trim()
            ? input.password
            : current.password,
        permissions: normalizePermissions(
          nextRole,
          input.permissions ?? current.permissions,
        ),
      };
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
    (items: SaleItem[]) => {
      if (!session) return "Sesión no válida.";
      if (!items.length) return "Agrega productos al carrito.";
      const branch = data.branches.find((b) => b.id === session.branchId);
      if (branch?.isWarehouse) {
        return "No se puede vender desde la Bodega Central. Cambia a una sucursal.";
      }
      const products = [...data.products];
      for (const item of items) {
        const idx = products.findIndex((p) => p.id === item.productId);
        if (idx < 0) return `Producto no encontrado: ${item.name}`;
        if (products[idx].branchId !== session.branchId) {
          return "Hay productos de otra sucursal.";
        }
        if (products[idx].quantity < item.quantity) {
          return `Stock insuficiente de ${item.name}.`;
        }
        products[idx] = {
          ...products[idx],
          quantity: products[idx].quantity - item.quantity,
          updatedAt: new Date().toISOString(),
        };
      }
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const sale: Sale = {
        id: uid("sale"),
        branchId: session.branchId,
        userId: session.userId,
        userName: session.name,
        items,
        total,
        createdAt: new Date().toISOString(),
      };
      persist({
        ...data,
        products,
        sales: [sale, ...data.sales],
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
      if (!fromOk || !toBranch) return "Sucursal o bodega no válida.";
      if (toBranch.isWarehouse) {
        return "La Bodega Central solo envía traslados a sucursales.";
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
        if (src.quantity < qty) {
          return `Stock insuficiente de ${src.name} (disponible ${src.quantity}).`;
        }
        products[srcIdx] = {
          ...src,
          quantity: src.quantity - qty,
          updatedAt: now,
        };

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

        if (destIdx >= 0) {
          products[destIdx] = {
            ...products[destIdx],
            quantity: products[destIdx].quantity + qty,
            costPrice: getCostPrice(src),
            price: src.price,
            image: src.image ?? products[destIdx].image,
            updatedAt: now,
          };
        } else {
          products = [
            {
              id: uid("prod"),
              name: src.name,
              price: src.price,
              costPrice: getCostPrice(src),
              quantity: qty,
              barcode: src.barcode,
              image: src.image,
              branchId: input.toBranchId,
              createdAt: now,
              updatedAt: now,
            },
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
    }) => {
      if (!session || !hasPermission(session, "configuracion")) {
        return "No tienes permiso para cambiar la configuración.";
      }
      const nextName =
        input.companyName !== undefined
          ? input.companyName.trim()
          : data.settings.companyName;
      if (!nextName) return "El nombre de la empresa es obligatorio.";
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
      const settings: CompanySettings = {
        companyName: nextName,
        slogan: nextSlogan || undefined,
        address: nextAddress || undefined,
        phone: nextPhone || undefined,
        logo:
          input.logo === null
            ? undefined
            : input.logo !== undefined
              ? input.logo
              : data.settings.logo,
        pdfStyle: normalizePdfStyle(
          input.pdfStyle ?? data.settings.pdfStyle,
        ),
      };
      persist({ ...data, settings });
      return null;
    },
    [data, persist, session],
  );

  const importProducts = useCallback(
    (
      rows: {
        name: string;
        quantity: number;
        costPrice: number;
        price: number;
        barcode?: string;
      }[],
    ) => {
      if (!session) {
        return { error: "Sesión no válida.", created: 0, updated: 0 };
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

        if (idx >= 0) {
          products[idx] = {
            ...products[idx],
            name,
            price: Number(row.price),
            costPrice: Number(row.costPrice),
            quantity: products[idx].quantity + Math.floor(row.quantity),
            barcode: products[idx].barcode || barcode,
            updatedAt: now,
          };
          updated += 1;
        } else {
          products = [
            {
              id: uid("prod"),
              name,
              price: Number(row.price),
              costPrice: Number(row.costPrice),
              quantity: Math.floor(row.quantity),
              barcode,
              branchId,
              createdAt: now,
              updatedAt: now,
            },
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
      data.branches.find((b) => b.id === session.branchId)?.name ?? "Sucursal"
    );
  }, [data.branches, session]);
  const storeBranches = useMemo(
    () => data.branches.filter((b) => !b.isWarehouse),
    [data.branches],
  );
  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      syncError,
      session,
      data,
      login,
      logout,
      setActiveBranch,
      addProduct,
      updateProduct,
      deleteProduct,
      createUser,
      updateUser,
      deleteUser,
      checkout,
      transferStock,
      updateSettings,
      importProducts,
      branchProducts,
      branchSales,
      currentBranchName,
      storeBranches,
    }),
    [
      ready,
      syncError,
      session,
      data,
      login,
      logout,
      setActiveBranch,
      addProduct,
      updateProduct,
      deleteProduct,
      createUser,
      updateUser,
      deleteUser,
      checkout,
      transferStock,
      updateSettings,
      importProducts,
      branchProducts,
      branchSales,
      currentBranchName,
      storeBranches,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
