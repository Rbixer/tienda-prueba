import type { StoreData } from "@/lib/types";
import { STORAGE_KEY, normalizeStoreData } from "@/lib/store";

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
  const res = await fetch("/api/store", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar datos del servidor");
  return normalizeStoreData((await res.json()) as Partial<StoreData>);
}

export async function saveStore(data: StoreData): Promise<void> {
  const res = await fetch("/api/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeStoreData(data)),
  });
  if (!res.ok) throw new Error("No se pudo guardar en el servidor");
}
