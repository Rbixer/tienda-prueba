export type Role = "administrador" | "vendedor";

/** Permisos por módulo del sistema. */
export type Permission =
  | "dashboard"
  | "pos"
  | "inventario"
  | "reportes"
  | "bodega"
  | "proveedores"
  | "usuarios"
  | "configuracion";

export type Branch = {
  id: string;
  name: string;
  address: string;
  /** Si true, es la bodega. Desde aquí no se cobra. */
  isWarehouse?: boolean;
};

export type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  /** Punto de venta asignado */
  branchId: string;
  /**
   * Tiendas que el usuario puede ver/operar.
   * Admin vacío = todas. Vendedor siempre incluye branchId.
   */
  allowedBranchIds: string[];
  /** Módulos a los que puede acceder (admin siempre tiene todos) */
  permissions: Permission[];
};

export type PharmacyCategory =
  | "medicamento"
  | "otc"
  | "higiene"
  | "dermocosmetico"
  | "suplemento"
  | "material";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia";

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
  /** Principio activo o nombre genérico */
  genericName?: string;
  /** Caja, frasco, tubo, blíster… */
  presentation?: string;
  /** 500 mg, 250 mg/5 ml… */
  concentration?: string;
  laboratory?: string;
  lot?: string;
  /** Fecha de vencimiento YYYY-MM-DD del lote que sale primero */
  expiresAt?: string;
  requiresPrescription?: boolean;
  /** Psicotrópico o estupefaciente: exige receta en el mostrador */
  controlled?: boolean;
  /** Aviso cuando las cajas bajan de este número */
  minStock?: number;
  /** Unidades dentro de una caja (tabletas, ampollas…) */
  unitsPerBox?: number;
  /** Precio de una unidad suelta */
  unitPrice?: number;
  /** Unidades dentro de un blíster */
  unitsPerBlister?: number;
  /** Precio de un blíster */
  blisterPrice?: number;
  /** Unidades sueltas, suma de los lotes */
  looseUnits?: number;
  lots?: StockLot[];
  category?: PharmacyCategory;
  branchId: string;
  createdAt: string;
  updatedAt: string;
};

export type StockLot = {
  id: string;
  lot: string;
  expiresAt?: string;
  /** Cajas o frascos cerrados */
  quantity: number;
  looseUnits?: number;
  costPrice: number;
};

export type LotAllocation = {
  lotId: string;
  lot?: string;
  expiresAt?: string;
  boxes: number;
  units: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  /** Caja cierra el empaque; blíster y unidad descuentan tabletas */
  saleUnit?: "caja" | "blister" | "unidad";
  allocations?: LotAllocation[];
};

export type Prescription = {
  number: string;
  doctor: string;
  patient: string;
  date: string;
};

export type Sale = {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  items: SaleItem[];
  total: number;
  paymentMethod?: PaymentMethod;
  amountReceived?: number;
  change?: number;
  status?: "completada" | "anulada";
  customerName?: string;
  customerPhone?: string;
  customerNit?: string;
  prescription?: Prescription;
  invoiceId?: string;
  shiftId?: string;
  createdAt: string;
  voidedAt?: string;
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
  /** NIT del establecimiento, para la factura */
  nit?: string;
  invoiceSeries?: string;
  nextInvoiceNumber?: number;
  /**
   * fija: el fondo queda bloqueado y no se cambia al aperturar.
   * libre: cada día se escribe el monto.
   */
  cashFloatMode?: "fija" | "libre";
  /** Cuota fija de la caja, cuando el modo es fija */
  cashFloat?: number;
};

export type PurchaseOrderItem = {
  name: string;
  barcode?: string;
  quantity: number;
  costPrice: number;
  price: number;
  lot: string;
  expiresAt?: string;
  genericName?: string;
  presentation?: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: "pedido" | "recibido" | "cancelado";
  items: PurchaseOrderItem[];
  note?: string;
  createdAt: string;
  receivedAt?: string;
};

export type CashShift = {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  openingAmount: number;
  openedAt: string;
  closedAt?: string;
  countedCash?: number;
  expectedCash?: number;
  difference?: number;
  cardTotal?: number;
  transferTotal?: number;
  cashSales?: number;
  note?: string;
};

export type Invoice = {
  id: string;
  saleId: string;
  series: string;
  number: number;
  nitEmitter: string;
  nitReceiver: string;
  receiverName: string;
  total: number;
  createdAt: string;
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
  purchaseOrders?: PurchaseOrder[];
  cashShifts?: CashShift[];
  invoices?: Invoice[];
  settings: CompanySettings;
};
