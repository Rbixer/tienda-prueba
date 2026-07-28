import type { StoreData } from "@/lib/types";
import { STORAGE_KEY, normalizeStoreData } from "@/lib/store";

export class StoreConflictError extends Error {
  store: StoreData;
  constructor(store: StoreData, message?: string) {
    super(message || "Conflicto de versión");
    this.name = "StoreConflictError";
    this.store = store;
  }
}

export class AuthRequiredError extends Error {
  constructor(message = "Sesión expirada") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function readLocalStore(): StoreData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeStoreData(JSON.parse(raw) as Partial<StoreData>);
  } catch {
    return null;
  }
}

export function writeLocalStore(data: StoreData): void {
  if (typeof window === "undefined") return;
  try {
    const safe = normalizeStoreData({
      ...data,
      users: data.users.map((u) => ({ ...u, password: "" })),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore quota / private mode
  }
}

/** Une datos locales previos con el servidor para no perder ventas. */
export function mergeStores(
  server: StoreData,
  local: StoreData | null,
): StoreData {
  const s = normalizeStoreData(server);
  if (!local) return s;
  const l = normalizeStoreData(local);
  const sales = new Map(s.sales.map((x) => [x.id, x]));
  for (const sale of l.sales) sales.set(sale.id, sale);
  const products = new Map(s.products.map((p) => [p.id, p]));
  for (const product of l.products) products.set(product.id, product);
  const users = new Map(s.users.map((u) => [u.id, u]));
  for (const user of l.users) {
    if (!users.has(user.id)) users.set(user.id, user);
  }
  const transfers = new Map((s.transfers ?? []).map((t) => [t.id, t]));
  for (const t of l.transfers ?? []) transfers.set(t.id, t);
  const suppliers = new Map((s.suppliers ?? []).map((x) => [x.id, x]));
  for (const x of l.suppliers ?? []) suppliers.set(x.id, x);
  const supplierPayments = new Map(
    (s.supplierPayments ?? []).map((x) => [x.id, x]),
  );
  for (const x of l.supplierPayments ?? []) supplierPayments.set(x.id, x);
  return normalizeStoreData({
    version: Math.max(s.version ?? 0, l.version ?? 0),
    branches: s.branches.length ? s.branches : l.branches,
    users: Array.from(users.values()),
    products: Array.from(products.values()),
    sales: Array.from(sales.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    transfers: Array.from(transfers.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    suppliers: Array.from(suppliers.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    ),
    supplierPayments: Array.from(supplierPayments.values()).sort(
      (a, b) =>
        new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    ),
    settings: {
      companyName:
        s.settings?.companyName?.trim() ||
        l.settings?.companyName?.trim() ||
        "MI BARRIO",
      slogan:
        s.settings?.slogan?.trim() ||
        l.settings?.slogan?.trim() ||
        "Tu tienda de confianza en el barrio",
      address:
        s.settings?.address?.trim() ||
        l.settings?.address?.trim() ||
        undefined,
      phone:
        s.settings?.phone?.trim() ||
        l.settings?.phone?.trim() ||
        undefined,
      logo: s.settings?.logo || l.settings?.logo,
      pdfStyle: s.settings?.pdfStyle ?? l.settings?.pdfStyle,
    },
  });
}

export async function fetchStore(): Promise<StoreData> {
  const res = await fetch("/api/store", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok) throw new Error("No se pudo cargar datos del servidor");
  const data = normalizeStoreData((await res.json()) as Partial<StoreData>);
  writeLocalStore(data);
  return data;
}

export async function saveStore(data: StoreData): Promise<StoreData> {
  const payload = normalizeStoreData({
    ...data,
    // Nunca reenviar hashes; solo texto plano al crear/cambiar contraseña
    users: data.users.map((u) => ({
      ...u,
      password: u.password && !u.password.startsWith("$2") ? u.password : "",
    })),
  });
  const res = await fetch("/api/store", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new AuthRequiredError();
  if (res.status === 409) {
    const body = (await res.json()) as {
      store?: Partial<StoreData>;
      error?: string;
    };
    const server = normalizeStoreData(body.store ?? {});
    throw new StoreConflictError(server, body.error);
  }
  if (!res.ok) throw new Error("No se pudo guardar en el servidor");
  const body = (await res.json()) as {
    store?: Partial<StoreData>;
    version?: number;
  };
  const saved = body.store
    ? normalizeStoreData(body.store)
    : normalizeStoreData({
        ...data,
        version: body.version ?? (data.version ?? 0) + 1,
      });
  writeLocalStore(saved);
  return saved;
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<{ session: import("@/lib/types").Session; store: StoreData }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json()) as {
    error?: string;
    session?: import("@/lib/types").Session;
  };
  if (!res.ok || !body.session) {
    throw new Error(body.error || "Usuario o contraseña incorrectos.");
  }
  // Store por separado (login liviano; evita payloads de ~90KB)
  const store = await fetchStore();
  return { session: body.session, store };
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

export async function apiMe(): Promise<{
  session: import("@/lib/types").Session;
  store: StoreData;
} | null> {
  const res = await fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("No se pudo validar la sesión");
  const body = (await res.json()) as {
    session: import("@/lib/types").Session;
  };
  if (!body.session) return null;
  const store = await fetchStore();
  return { session: body.session, store };
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch("/api/auth/password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const body = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(body.error || "No se pudo cambiar la contraseña");
}
