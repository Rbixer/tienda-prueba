import type { Branch, Product, Sale, StoreData, User } from "./types";
export const STORAGE_KEY = "tienda-barrio-data-v1";
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
];
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Coca-Cola 600ml",
    price: 18,
    costPrice: 12,
    quantity: 48,
    barcode: "7501055300162",
    branchId: "suc-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-2",
    name: "Pan bolillo",
    price: 3.5,
    costPrice: 2,
    quantity: 80,
    barcode: "1000000000001",
    branchId: "suc-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-3",
    name: "Leche 1L",
    price: 28,
    costPrice: 22,
    quantity: 24,
    barcode: "7501020516012",
    branchId: "suc-2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-4",
    name: "Huevos (caja)",
    price: 55,
    costPrice: 42,
    quantity: 15,
    barcode: "1000000000004",
    branchId: "suc-3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
export function createInitialData(): StoreData {
  return {
    branches: DEFAULT_BRANCHES,
    users: DEFAULT_USERS,
    products: DEFAULT_PRODUCTS,
    sales: [] as Sale[],
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
  return typeof product.costPrice === "number" ? product.costPrice : product.price;
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
