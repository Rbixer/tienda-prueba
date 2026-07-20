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
import { SESSION_KEY, createInitialData, uid } from "@/lib/store";
import {
  fetchStore,
  mergeStores,
  readLocalStore,
  saveStore,
} from "@/lib/sync";
import type {
  Product,
  Sale,
  SaleItem,
  Session,
  StoreData,
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
  }) => string | null;
  deleteUser: (id: string) => string | null;
  checkout: (items: SaleItem[]) => string | null;
  branchProducts: Product[];
  branchSales: Sale[];
  currentBranchName: string;
};
const AuthContext = createContext<AuthContextValue | null>(null);
function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
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
        }
      } catch {
        const local = readLocalStore() ?? createInitialData();
        if (!cancelled) {
          setData(local);
          setSyncError(
            "Sin conexión al servidor compartido. Los datos pueden no sincronizarse con otros dispositivos.",
          );
        }
      } finally {
        if (!cancelled) {
          setSession(loadSession());
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
        const serverSig = `${server.sales.length}:${server.products.length}:${server.users.length}:${server.sales[0]?.id ?? ""}:${server.products[0]?.updatedAt ?? ""}`;
        const localSig = `${current.sales.length}:${current.products.length}:${current.users.length}:${current.sales[0]?.id ?? ""}:${current.products[0]?.updatedAt ?? ""}`;
        if (serverSig !== localSig) {
          setData(server);
          setSyncError(null);
        }
      } catch {
        // ignore polling errors
      }
    }
    const id = window.setInterval(pull, 4000);
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
      persistSession({
        userId: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      });
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
    }) => {
      if (!session || session.role !== "administrador") {
        return "Solo el administrador puede crear usuarios.";
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
      const user: User = {
        id: uid("usr"),
        name,
        username,
        password: input.password,
        role: input.role,
        branchId: input.branchId,
      };
      persist({ ...data, users: [...data.users, user] });
      return null;
    },
    [data, persist, session],
  );
  const deleteUser = useCallback(
    (id: string) => {
      if (!session || session.role !== "administrador") {
        return "Solo el administrador puede eliminar usuarios.";
      }
      if (id === session.userId) return "No puedes eliminarte a ti mismo.";
      if (id === "usr-admin") return "No se puede eliminar el admin principal.";
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
      deleteUser,
      checkout,
      branchProducts,
      branchSales,
      currentBranchName,
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
      deleteUser,
      checkout,
      branchProducts,
      branchSales,
      currentBranchName,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
