import type { StoreData } from "@/lib/types";
import { STORAGE_KEY } from "@/lib/store";
export function readLocalStore(): StoreData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoreData;
  } catch {
    return null;
  }
}
/** Une datos locales previos con el servidor para no perder ventas. */
export function mergeStores(server: StoreData, local: StoreData | null): StoreData {
  if (!local) return server;
  const sales = new Map(server.sales.map((s) => [s.id, s]));
  for (const sale of local.sales) sales.set(sale.id, sale);
  const products = new Map(server.products.map((p) => [p.id, p]));
  for (const product of local.products) products.set(product.id, product);
  const users = new Map(server.users.map((u) => [u.id, u]));
  for (const user of local.users) {
    if (!users.has(user.id)) users.set(user.id, user);
  }
  return {
    branches: server.branches.length ? server.branches : local.branches,
    users: Array.from(users.values()),
    products: Array.from(products.values()),
    sales: Array.from(sales.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}
export async function fetchStore(): Promise<StoreData> {
  const res = await fetch("/api/store", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar datos del servidor");
  return (await res.json()) as StoreData;
}
export async function saveStore(data: StoreData): Promise<void> {
  const res = await fetch("/api/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudo guardar en el servidor");
}
