export type Role = "administrador" | "vendedor";
export type Branch = {
  id: string;
  name: string;
  address: string;
};
export type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  branchId: string;
};
export type Product = {
  id: string;
  name: string;
  /** Precio de venta */
  price: number;
  /** Precio de costo */
  costPrice: number;
  quantity: number;
  image?: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
};
export type SaleItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};
export type Sale = {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  items: SaleItem[];
  total: number;
  createdAt: string;
};
export type Session = {
  userId: string;
  name: string;
  username: string;
  role: Role;
  branchId: string;
};
export type StoreData = {
  branches: Branch[];
  users: User[];
  products: Product[];
  sales: Sale[];
};
