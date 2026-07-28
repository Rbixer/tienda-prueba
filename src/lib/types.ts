export type Role = "administrador" | "vendedor";

/** Permisos por módulo del sistema. */
export type Permission =
  | "dashboard"
  | "pos"
  | "inventario"
  | "reportes"
  | "bodega"
  | "proveedores"
  | "sucursales"
  | "usuarios"
  | "configuracion";

export type Branch = {
  id: string;
  name: string;
  address: string;
  /** Si true, es la bodega central (no es tienda de venta) */
  isWarehouse?: boolean;
};

export type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  /** Sucursal principal / por defecto */
  branchId: string;
  /**
   * Tiendas que el usuario puede ver/operar.
   * Admin vacío = todas. Vendedor siempre incluye branchId.
   */
  allowedBranchIds: string[];
  /** Módulos a los que puede acceder (admin siempre tiene todos) */
  permissions: Permission[];
};

export type Product = {
  id: string;
  name: string;
  /** Precio de venta */
  price: number;
  /** Precio de costo */
  costPrice: number;
  quantity: number;
  /** Código de barras */
  barcode?: string;
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

export type TransferItem = {
  productId: string;
  barcode?: string;
  name: string;
  quantity: number;
  costPrice: number;
  price: number;
  image?: string;
};

export type Transfer = {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  items: TransferItem[];
  userId: string;
  userName: string;
  note?: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  /** Saldo pendiente a pagar */
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPaymentMethod =
  | "efectivo"
  | "transferencia"
  | "cheque"
  | "otro";

export type SupplierPayment = {
  id: string;
  supplierId: string;
  amount: number;
  method: SupplierPaymentMethod;
  note?: string;
  paidAt: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export type PdfTextStyle = {
  bold?: boolean;
  italic?: boolean;
  /** Color hex, ej. #0b2545 */
  color?: string;
};

export type PdfStyleSettings = {
  companyName?: PdfTextStyle;
  slogan?: PdfTextStyle;
  contact?: PdfTextStyle;
  /** Color de la barra superior y encabezados de tabla */
  accentColor?: string;
};

export type CompanySettings = {
  companyName: string;
  /** Slogan o eslogan que aparece bajo el nombre en documentos */
  slogan?: string;
  address?: string;
  phone?: string;
  /** Data URL o ruta pública del logo */
  logo?: string;
  /** Estilos tipográficos para los PDFs */
  pdfStyle?: PdfStyleSettings;
};

export type Session = {
  userId: string;
  name: string;
  username: string;
  role: Role;
  branchId: string;
  allowedBranchIds: string[];
  permissions: Permission[];
};

export type StoreData = {
  /** Versión para control de concurrencia (optimistic locking). */
  version: number;
  branches: Branch[];
  users: User[];
  products: Product[];
  sales: Sale[];
  transfers: Transfer[];
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  settings: CompanySettings;
};
