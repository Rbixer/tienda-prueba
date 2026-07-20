import type { Branch, Product, Sale, SaleItem, StoreData, User } from "./types";

export const STORAGE_KEY = "tienda-barrio-data-v2";
export const SESSION_KEY = "tienda-barrio-session-v1";

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "suc-1",
    name: "Sucursal Centro",
    address: "Av. Principal #120, Centro",
  },
  {
    id: "suc-2",
    name: "Sucursal Norte",
    address: "Calle 8 #45, Col. Norte",
  },
  {
    id: "suc-3",
    name: "Sucursal Sur",
    address: "Blvd. Sur #88, Col. Sur",
  },
];

export const DEFAULT_USERS: User[] = [
  {
    id: "usr-admin",
    name: "Administrador General",
    username: "admin",
    password: "admin123",
    role: "administrador",
    branchId: "suc-1",
  },
  {
    id: "usr-vendedor",
    name: "Vendedor Demo",
    username: "vendedor",
    password: "vendedor123",
    role: "vendedor",
    branchId: "suc-1",
  },
  {
    id: "usr-vendedor-2",
    name: "María López",
    username: "maria",
    password: "maria123",
    role: "vendedor",
    branchId: "suc-2",
  },
];

const nowIso = () => new Date().toISOString();

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Coca-Cola 600ml",
    price: 18,
    costPrice: 12,
    quantity: 48,
    barcode: "7501055300162",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-2",
    name: "Pan bolillo",
    price: 3.5,
    costPrice: 2,
    quantity: 80,
    barcode: "1000000000001",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-3",
    name: "Leche 1L",
    price: 28,
    costPrice: 22,
    quantity: 24,
    barcode: "7501020516012",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-4",
    name: "Huevos (caja)",
    price: 55,
    costPrice: 42,
    quantity: 15,
    barcode: "1000000000004",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-5",
    name: "Aceite 1L",
    price: 32,
    costPrice: 24,
    quantity: 18,
    barcode: "7501000110101",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-6",
    name: "Arroz 2lb",
    price: 14,
    costPrice: 9,
    quantity: 4,
    barcode: "7501000220202",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-7",
    name: "Frijol 1lb",
    price: 12,
    costPrice: 8,
    quantity: 3,
    barcode: "7501000330303",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-8",
    name: "Agua 600ml",
    price: 6,
    costPrice: 3.5,
    quantity: 60,
    barcode: "7501000440404",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-9",
    name: "Jabón en barra",
    price: 8,
    costPrice: 5,
    quantity: 2,
    barcode: "7501000550505",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-10",
    name: "Cable C",
    price: 25,
    costPrice: 14,
    quantity: 100,
    barcode: "7506250932908",
    branchId: "suc-1",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-n1",
    name: "Galletas surtidas",
    price: 15,
    costPrice: 10,
    quantity: 30,
    barcode: "7502000111111",
    branchId: "suc-2",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-n2",
    name: "Café molido 400g",
    price: 48,
    costPrice: 35,
    quantity: 12,
    barcode: "7502000222222",
    branchId: "suc-2",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "prod-s1",
    name: "Azúcar 2lb",
    price: 16,
    costPrice: 11,
    quantity: 22,
    barcode: "7503000111111",
    branchId: "suc-3",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

function daysAgo(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, Math.floor(Math.random() * 50), 0);
  return d.toISOString();
}

function saleFrom(
  id: string,
  branchId: string,
  userId: string,
  userName: string,
  items: SaleItem[],
  createdAt: string,
): Sale {
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { id, branchId, userId, userName, items, total, createdAt };
}

/** Ventas mock de los últimos 7 días para gráficos y reportes. */
export function createMockSales(products: Product[]): Sale[] {
  const centro = products.filter((p) => p.branchId === "suc-1");
  const norte = products.filter((p) => p.branchId === "suc-2");
  const sur = products.filter((p) => p.branchId === "suc-3");
  const pick = (list: Product[], n: number) => {
    const out: SaleItem[] = [];
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(n, shuffled.length); i++) {
      const p = shuffled[i];
      out.push({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1 + Math.floor(Math.random() * 3),
        image: p.image,
      });
    }
    return out;
  };

  const sales: Sale[] = [];
  let n = 0;
  // Patrones diarios variados (hoy → hace 6 días)
  const dayCounts = [8, 6, 11, 5, 9, 7, 10];
  for (let day = 0; day < 7; day++) {
    const count = dayCounts[day];
    for (let i = 0; i < count; i++) {
      n += 1;
      const hour = 8 + Math.floor(Math.random() * 12);
      const useVendedor = Math.random() > 0.35;
      sales.push(
        saleFrom(
          `sale-mock-${n}`,
          "suc-1",
          useVendedor ? "usr-vendedor" : "usr-admin",
          useVendedor ? "Vendedor Demo" : "Administrador General",
          pick(centro, 1 + Math.floor(Math.random() * 3)),
          daysAgo(day, hour, i * 3),
        ),
      );
    }
    if (norte.length) {
      n += 1;
      sales.push(
        saleFrom(
          `sale-mock-n-${day}`,
          "suc-2",
          "usr-vendedor-2",
          "María López",
          pick(norte, 2),
          daysAgo(day, 11, 20),
        ),
      );
    }
    if (sur.length) {
      n += 1;
      sales.push(
        saleFrom(
          `sale-mock-s-${day}`,
          "suc-3",
          "usr-admin",
          "Administrador General",
          pick(sur, 1),
          daysAgo(day, 15, 10),
        ),
      );
    }
  }

  return sales.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createInitialData(): StoreData {
  const products = DEFAULT_PRODUCTS;
  return {
    branches: DEFAULT_BRANCHES,
    users: DEFAULT_USERS,
    products,
    sales: createMockSales(products),
  };
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(value);
}

/** Compatibilidad con productos guardados sin costPrice */
export function getCostPrice(product: { price: number; costPrice?: number }) {
  return typeof product.costPrice === "number"
    ? product.costPrice
    : product.price;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateShort(value: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
  }).format(new Date(value));
}
