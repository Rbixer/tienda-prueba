import {
  defaultPermissionsForRole,
  normalizeUser,
} from "./permissions";
import { ensureLots } from "./stock";
import type {
  Branch,
  CompanySettings,
  PdfStyleSettings,
  PdfTextStyle,
  Product,
  Sale,
  SaleItem,
  CashShift,
  StoreData,
  Transfer,
  User,
} from "./types";

export const STORAGE_KEY = "tienda-barrio-data-v11";
export const SESSION_KEY = "tienda-barrio-session-v2";
/** Cierre automático por inactividad (30 minutos). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Usuario recordado en el login (nunca la contraseña). */
export const REMEMBER_LOGIN_KEY = "tienda-barrio-remember-login-v2";
export const BODEGA_CENTRAL_ID = "bodega-central";

export const DEFAULT_PDF_STYLE: PdfStyleSettings = {
  companyName: { bold: true, italic: false, color: "#3b2418" },
  slogan: { bold: false, italic: true, color: "#7d6556" },
  contact: { bold: false, italic: false, color: "#5c4638" },
  accentColor: "#e06a1f",
};

function normalizeTextStyle(
  base: PdfTextStyle,
  raw?: PdfTextStyle | null,
): PdfTextStyle {
  return {
    bold: raw?.bold ?? base.bold ?? false,
    italic: raw?.italic ?? base.italic ?? false,
    color:
      typeof raw?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color)
        ? raw.color
        : base.color,
  };
}

export function normalizePdfStyle(
  raw?: PdfStyleSettings | null,
): PdfStyleSettings {
  return {
    companyName: normalizeTextStyle(
      DEFAULT_PDF_STYLE.companyName!,
      raw?.companyName,
    ),
    slogan: normalizeTextStyle(DEFAULT_PDF_STYLE.slogan!, raw?.slogan),
    contact: normalizeTextStyle(DEFAULT_PDF_STYLE.contact!, raw?.contact),
    accentColor:
      typeof raw?.accentColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(raw.accentColor)
        ? raw.accentColor
        : DEFAULT_PDF_STYLE.accentColor,
  };
}

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "TIENDA",
  slogan: "Lo del día, cerca de ti",
  address: "",
  phone: "",
  logo: undefined,
  pdfStyle: { ...DEFAULT_PDF_STYLE },
};

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: BODEGA_CENTRAL_ID,
    name: "Bodega Central",
    address: "Almacén principal",
    isWarehouse: true,
  },
  {
    id: "suc-1",
    name: "Tienda",
    address: "Local único",
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
    allowedBranchIds: [],
    permissions: defaultPermissionsForRole("administrador"),
  },
  {
    id: "usr-vendedor",
    name: "Vendedor Demo",
    username: "vendedor",
    password: "vendedor123",
    role: "vendedor",
    branchId: "suc-1",
    allowedBranchIds: ["suc-1"],
    permissions: defaultPermissionsForRole("vendedor"),
  },
  {
    id: "usr-vendedor-2",
    name: "María López",
    username: "maria",
    password: "maria123",
    role: "vendedor",
    branchId: "suc-1",
    allowedBranchIds: ["suc-1"],
    permissions: defaultPermissionsForRole("vendedor"),
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
    image: "/products/coca-cola.jpg",
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
    image: "/products/pan.jpg",
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
    image: "/products/leche.jpg",
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
    image: "/products/huevos.jpg",
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
    image: "/products/aceite.jpg",
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
    image: "/products/arroz.jpg",
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
    image: "/products/frijol.jpg",
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
    image: "/products/agua.jpg",
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
    image: "/products/jabon.jpg",
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
    image: "/products/cable.jpg",
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
    image: "/products/galletas.jpg",
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
    image: "/products/cafe.jpg",
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
    image: "/products/azucar.jpg",
    branchId: "suc-3",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

/**
 * Catálogo base de abarrotería: [nombre, costo, precio venta, stock].
 * Catálogo de ejemplo para un inventario inicial.
 */
const CATALOG_SEED: [string, number, number, number][] = [
  ["Coca-Cola 2.5L", 20, 28, 30],
  ["Pepsi 2L", 16, 23, 26],
  ["Sprite 600ml", 7, 11, 40],
  ["Fanta naranja 600ml", 7, 11, 36],
  ["Agua pura 5L", 12, 18, 20],
  ["Jugo de naranja 1L", 14, 21, 22],
  ["Néctar de durazno 1L", 13, 20, 18],
  ["Gatorade 600ml", 11, 17, 24],
  ["Té helado limón 500ml", 8, 13, 28],
  ["Cerveza lata 350ml", 10, 16, 48],
  ["Leche entera 900ml", 13, 19, 24],
  ["Leche deslactosada 1L", 16, 24, 16],
  ["Yogurt natural 1L", 18, 27, 14],
  ["Yogurt fresa 200ml", 5, 8, 30],
  ["Queso fresco 1lb", 28, 40, 12],
  ["Queso mozzarella 400g", 32, 46, 10],
  ["Crema 200ml", 9, 14, 18],
  ["Mantequilla 250g", 16, 24, 15],
  ["Margarina 500g", 12, 18, 20],
  ["Huevos docena", 26, 36, 25],
  ["Pan de caja grande", 15, 22, 18],
  ["Pan integral", 17, 25, 14],
  ["Tortillas paquete", 6, 10, 30],
  ["Pan dulce (unidad)", 2, 4, 60],
  ["Baguette", 7, 12, 16],
  ["Arroz 5lb", 22, 32, 24],
  ["Frijol negro 5lb", 30, 42, 20],
  ["Frijol rojo 2lb", 14, 21, 22],
  ["Azúcar blanca 5lb", 24, 34, 26],
  ["Sal refinada 1kg", 5, 9, 30],
  ["Harina de trigo 2lb", 10, 16, 20],
  ["Maseca 1kg", 11, 17, 22],
  ["Avena 400g", 12, 19, 16],
  ["Cereal maíz 500g", 26, 38, 12],
  ["Espagueti 200g", 5, 9, 40],
  ["Macarrones 200g", 5, 9, 36],
  ["Sopa instantánea", 4, 7, 50],
  ["Consomé de pollo 8u", 8, 13, 24],
  ["Aceite vegetal 900ml", 26, 37, 20],
  ["Aceite de oliva 250ml", 45, 65, 8],
  ["Vinagre 500ml", 7, 12, 16],
  ["Salsa de tomate 400g", 9, 15, 26],
  ["Kétchup 400g", 12, 18, 20],
  ["Mayonesa 400g", 18, 27, 16],
  ["Mostaza 250g", 10, 16, 14],
  ["Salsa picante 150ml", 8, 13, 22],
  ["Atún en lata 140g", 11, 17, 34],
  ["Sardinas en lata", 9, 15, 28],
  ["Frijoles enlatados", 10, 16, 20],
  ["Maíz dulce lata", 9, 15, 18],
  ["Leche condensada", 14, 21, 16],
  ["Café instantáneo 200g", 38, 54, 12],
  ["Café molido 1lb", 32, 46, 14],
  ["Chocolate en polvo 400g", 24, 35, 12],
  ["Té de manzanilla 25u", 11, 17, 18],
  ["Galletas saladas 300g", 12, 18, 26],
  ["Galletas de chocolate", 9, 15, 30],
  ["Papas fritas 150g", 11, 17, 32],
  ["Tortrix 40g", 3, 6, 60],
  ["Churros picantes", 4, 7, 45],
  ["Maní salado 100g", 6, 10, 28],
  ["Chocolate barra", 7, 12, 36],
  ["Chicles paquete", 2, 4, 70],
  ["Caramelos surtidos", 1.5, 3, 90],
  ["Helado 1L", 28, 40, 10],
  ["Papel higiénico 4u", 16, 24, 24],
  ["Servilletas 100u", 8, 13, 20],
  ["Toallas de cocina", 12, 18, 16],
  ["Jabón de tocador", 5, 9, 40],
  ["Jabón para ropa 1kg", 18, 27, 20],
  ["Detergente en polvo 500g", 14, 21, 24],
  ["Suavizante 1L", 20, 30, 14],
  ["Cloro 1L", 9, 15, 22],
  ["Desinfectante 1L", 15, 23, 18],
  ["Lavaplatos 500g", 11, 17, 24],
  ["Esponja para trastos", 4, 7, 34],
  ["Escoba plástica", 25, 38, 8],
  ["Bolsas para basura 10u", 10, 16, 20],
  ["Shampoo 400ml", 26, 38, 14],
  ["Acondicionador 400ml", 26, 38, 12],
  ["Pasta dental 100ml", 13, 20, 22],
  ["Cepillo dental", 8, 14, 20],
  ["Desodorante barra", 18, 27, 16],
  ["Rastrillo desechable 2u", 9, 15, 18],
  ["Papel facial 100u", 10, 16, 16],
  ["Toallas femeninas 10u", 14, 21, 20],
  ["Pañales talla M 10u", 32, 46, 12],
  ["Alcohol gel 250ml", 12, 19, 18],
  ["Curitas 20u", 7, 12, 16],
  ["Acetaminofén 10 tab", 5, 9, 24],
  ["Ibuprofeno 10 tab", 7, 12, 20],
  ["Suero oral 500ml", 8, 13, 18],
  ["Pilas AA 4u", 16, 25, 16],
  ["Pilas AAA 2u", 10, 17, 14],
  ["Foco LED 9W", 22, 34, 12],
  ["Encendedor", 4, 8, 40],
  ["Fósforos caja", 2, 4, 30],
  ["Vela blanca", 3, 6, 26],
  ["Cargador USB", 45, 72, 8],
  ["Audífonos básicos", 38, 60, 10],
  ["Cuaderno 80 hojas", 9, 15, 22],
  ["Lapicero azul", 2, 4, 60],
];

/** Distribución del catálogo: la mayoría al Centro, el resto a Norte y Sur. */
function branchForIndex(_i: number): string {
  return "suc-1";
}

/**
 * Asocia cada producto a una categoría con foto real (archivo en
 * /public/products/cat-<slug>.jpg). Las fotos son fotografías reales,
 * no imágenes generadas.
 */
export function categoryImageForName(name: string): string | undefined {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/coca|pepsi|sprite|fanta|refresco|gaseosa/, "soda"],
    [/agua/, "water"],
    [/jugo|néctar|nectar/, "juice"],
    [/gatorade|deportiv|energiz/, "sports"],
    [/té helado|te helado/, "icetea"],
    [/cerveza/, "beer"],
    [/leche condensada/, "condensedmilk"],
    [/leche/, "milk"],
    [/yogurt/, "yogurt"],
    [/queso/, "cheese"],
    [/crema/, "cream"],
    [/mantequilla|margarina/, "butter"],
    [/huevo/, "eggs"],
    [/tortilla/, "tortilla"],
    [/pan dulce|dona|dulce/, "pastry"],
    [/baguette|pan/, "bread"],
    [/arroz/, "rice"],
    [/frijol.*enlatad|enlatad.*frijol|frijoles enlatados/, "cannedbeans"],
    [/frijol/, "beans"],
    [/az[úu]car/, "sugar"],
    [/\bsal\b/, "salt"],
    [/harina|maseca/, "flour"],
    [/avena/, "oats"],
    [/cereal/, "cereal"],
    [/espagueti|macarron|pasta|fideo/, "pasta"],
    [/sopa|consom[ée]/, "soup"],
    [/aceite/, "oil"],
    [/vinagre/, "vinegar"],
    [/mayonesa|mostaza/, "mayo"],
    [/salsa|k[ée]tchup|catsup/, "sauce"],
    [/at[úu]n|sardina/, "cannedfish"],
    [/ma[íi]z dulce/, "cannedcorn"],
    [/caf[ée]/, "coffee"],
    [/chocolate en polvo|cacao/, "cocoa"],
    [/chocolate/, "chocolate"],
    [/t[ée] |manzanilla|\bt[ée]$/, "tea"],
    [/galletas saladas|galleta salada/, "crackers"],
    [/galleta/, "cookies"],
    [/papas frit|tortrix|churros|chips|frituras/, "chips"],
    [/man[íi]/, "peanuts"],
    [/chicle/, "gum"],
    [/caramelo|dulces/, "candy"],
    [/helado/, "icecream"],
    [/papel higi[ée]nico/, "toiletpaper"],
    [/servilleta/, "napkins"],
    [/toallas de cocina|papel toalla/, "papertowel"],
    [/papel facial|pa[ñn]uelo/, "tissue"],
    [/jab[óo]n para ropa|jab[óo]n de ropa/, "laundrysoap"],
    [/jab[óo]n/, "soap"],
    [/detergente/, "detergent"],
    [/suavizante/, "softener"],
    [/cloro/, "bleach"],
    [/desinfectante/, "disinfectant"],
    [/lavaplatos|lavatrastos/, "dishsoap"],
    [/esponja/, "sponge"],
    [/escoba/, "broom"],
    [/bolsas para basura|bolsa de basura/, "trashbag"],
    [/shampoo|champ[úu]/, "shampoo"],
    [/acondicionador/, "conditioner"],
    [/pasta dental|dental/, "toothpaste"],
    [/cepillo/, "toothbrush"],
    [/desodorante/, "deodorant"],
    [/rastrillo|afeitar/, "razor"],
    [/toallas femenina|femenin/, "feminine"],
    [/pa[ñn]al/, "diapers"],
    [/alcohol gel|gel antibac|sanitiz/, "sanitizer"],
    [/curita|venda/, "bandage"],
    [/acetaminof[ée]n|ibuprofeno|suero|pastilla|medicina/, "medicine"],
    [/pila|bater[íi]a/, "battery"],
    [/foco|bombillo|l[áa]mpara|led/, "bulb"],
    [/encendedor/, "lighter"],
    [/f[óo]sforo|cerillo/, "matches"],
    [/vela/, "candle"],
    [/cargador/, "charger"],
    [/aud[íi]fono|aud[íi]fonos/, "headphones"],
    [/cuaderno/, "notebook"],
    [/lapicero|l[áa]piz|boligrafo|bol[íi]grafo/, "pen"],
    [/cable/, "cable"],
  ];
  for (const [re, slug] of rules) {
    if (re.test(n)) return `/products/cat-${slug}.jpg`;
  }
  return undefined;
}

/** Genera el catálogo completo (100+ productos). */
export function createCatalogProducts(): Product[] {
  const now = nowIso();
  return CATALOG_SEED.map(([name, costPrice, price, quantity], i) => ({
    id: `prod-cat-${i + 1}`,
    name,
    price,
    costPrice,
    quantity,
    barcode: `750${String(4000000 + i * 137).padStart(10, "0")}`,
    image: categoryImageForName(name),
    branchId: branchForIndex(i),
    createdAt: now,
    updatedAt: now,
  }));
}

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
  return normalizeStoreData({
    branches: DEFAULT_BRANCHES,
    users: DEFAULT_USERS,
    products: [],
    sales: [],
    transfers: [],
    suppliers: [],
    supplierPayments: [],
    settings: { ...DEFAULT_SETTINGS },
  });
}

/** Deja la bodega y un solo punto de venta. El stock de los demás locales se suma ahí. */
function collapseToSingleStore(input: {
  branches: Branch[];
  users: User[];
  products: Product[];
  sales: Sale[];
  transfers: Transfer[];
}): {
  branches: Branch[];
  users: User[];
  products: Product[];
  sales: Sale[];
  transfers: Transfer[];
} {
  const warehouse =
    input.branches.find((b) => b.isWarehouse || b.id === BODEGA_CENTRAL_ID) ??
    DEFAULT_BRANCHES[0];
  const stores = input.branches.filter((b) => !b.isWarehouse && b.id !== warehouse.id);
  const main = stores.find((b) => b.id === "suc-1") ?? stores[0] ?? DEFAULT_BRANCHES[1];
  const retired = new Set(stores.filter((b) => b.id !== main.id).map((b) => b.id));
  const mapId = (id: string) => (retired.has(id) ? main.id : id);

  const products: Product[] = [];
  for (const product of input.products) {
    const next = { ...product, branchId: mapId(product.branchId) };
    const barcode = next.barcode?.trim();
    const idx = barcode
      ? products.findIndex(
          (p) => p.branchId === next.branchId && p.barcode === barcode,
        )
      : -1;
    if (idx >= 0) {
      const current = ensureLots(products[idx]);
      const incoming = ensureLots(next);
      products[idx] = {
        ...current,
        lots: [...(current.lots ?? []), ...(incoming.lots ?? [])],
      };
      continue;
    }
    products.push(next);
  }

  const pharmacy = {
    ...main,
    name: "Tienda",
    address: /sucursal/i.test(main.address ?? "")
      ? "Local único"
      : main.address || "Local único",
  };
  const bodega = {
    ...warehouse,
    name: /sucursal/i.test(warehouse.name) ? "Bodega Central" : warehouse.name,
    isWarehouse: true as const,
  };

  return {
    branches: [bodega, pharmacy],
    users: input.users.map((user) =>
      normalizeUser({
        ...user,
        branchId: main.id,
        allowedBranchIds: user.role === "administrador" ? [] : [main.id],
      }),
    ),
    products,
    sales: input.sales.map((sale) => ({ ...sale, branchId: mapId(sale.branchId) })),
    transfers: input.transfers.map((transfer) => ({
      ...transfer,
      fromBranchId: mapId(transfer.fromBranchId),
      toBranchId: mapId(transfer.toBranchId),
    })),
  };
}

/** Normaliza datos viejos sin settings/transfers/bodega. */
export function normalizeStoreData(raw: Partial<StoreData> & {
  branches?: Branch[];
  products?: Product[];
  users?: User[];
  sales?: Sale[];
}): StoreData {
  const branches = [...(raw.branches ?? DEFAULT_BRANCHES)];
  if (!branches.some((b) => b.id === BODEGA_CENTRAL_ID)) {
    branches.unshift({
      id: BODEGA_CENTRAL_ID,
      name: "Bodega Central",
      address: "Almacén principal",
      isWarehouse: true,
    });
  } else {
    const idx = branches.findIndex((b) => b.id === BODEGA_CENTRAL_ID);
    if (idx >= 0) branches[idx] = { ...branches[idx], isWarehouse: true };
  }
  const users = (raw.users ?? DEFAULT_USERS).map((u) =>
    normalizeUser({
      ...u,
      permissions: u.permissions ?? defaultPermissionsForRole(u.role),
    }),
  );
  const single = collapseToSingleStore({
    branches,
    users,
    products: raw.products ?? [],
    sales: raw.sales ?? [],
    transfers: raw.transfers ?? [],
  });
  return {
    version:
      typeof raw.version === "number" && Number.isFinite(raw.version)
        ? Math.max(0, Math.floor(raw.version))
        : 0,
    branches: single.branches,
    users: single.users,
    products: single.products.map((product) => ensureLots(product)),
    sales: single.sales,
    transfers: single.transfers,
    suppliers: raw.suppliers ?? [],
    supplierPayments: raw.supplierPayments ?? [],
    purchaseOrders: raw.purchaseOrders ?? [],
    cashShifts: raw.cashShifts ?? [],
    invoices: raw.invoices ?? [],
    settings: {
      companyName:
        typeof raw.settings?.companyName === "string"
          ? raw.settings.companyName.trim()
          : DEFAULT_SETTINGS.companyName,
      slogan:
        typeof raw.settings?.slogan === "string"
          ? raw.settings.slogan.trim()
          : DEFAULT_SETTINGS.slogan,
      address: raw.settings?.address?.trim() || undefined,
      phone: raw.settings?.phone?.trim() || undefined,
      logo: raw.settings?.logo || undefined,
      pdfStyle: normalizePdfStyle(raw.settings?.pdfStyle),
      nit: raw.settings?.nit?.trim() || undefined,
      invoiceSeries:
        typeof raw.settings?.invoiceSeries === "string"
          ? raw.settings.invoiceSeries.trim()
          : "A",
      nextInvoiceNumber:
        typeof raw.settings?.nextInvoiceNumber === "number" &&
        raw.settings.nextInvoiceNumber >= 1
          ? Math.floor(raw.settings.nextInvoiceNumber)
          : 1,
      cashFloatMode:
        raw.settings?.cashFloatMode === "fija" ||
        raw.settings?.cashFloatMode === "libre"
          ? raw.settings.cashFloatMode
          : undefined,
      cashFloat:
        typeof raw.settings?.cashFloat === "number" &&
        Number.isFinite(raw.settings.cashFloat) &&
        raw.settings.cashFloat >= 0
          ? Math.round(raw.settings.cashFloat * 100) / 100
          : undefined,
      satUsuario:
        typeof raw.settings?.satUsuario === "string" &&
        raw.settings.satUsuario.trim()
          ? raw.settings.satUsuario.trim()
          : undefined,
      satClave:
        typeof raw.settings?.satClave === "string" && raw.settings.satClave.trim()
          ? raw.settings.satClave.trim()
          : undefined,
      satConfigured:
        Boolean(
          typeof raw.settings?.satUsuario === "string" &&
            raw.settings.satUsuario.trim() &&
            typeof raw.settings?.satClave === "string" &&
            raw.settings.satClave.trim(),
        ) || raw.settings?.satConfigured === true,
    },
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

/** Día local YYYY-MM-DD. El cierre de caja sigue el calendario del mostrador. */
export function calendarDay(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** La cuota fija bloquea el monto de apertura. Sin modo guardado, un fondo ya definido se trata como fijo. */
export function isCashFloatLocked(settings: {
  cashFloatMode?: "fija" | "libre";
  cashFloat?: number;
}): boolean {
  if (settings.cashFloatMode === "libre") return false;
  if (settings.cashFloatMode === "fija") return true;
  return typeof settings.cashFloat === "number";
}

/** True si hoy ya hubo un corte de caja en esa ubicación. */
export function isCashDayClosed(
  shifts: CashShift[] | undefined,
  branchId: string,
  now: Date = new Date(),
): boolean {
  const today = calendarDay(now);
  return (shifts ?? []).some(
    (shift) =>
      shift.branchId === branchId &&
      Boolean(shift.closedAt) &&
      calendarDay(shift.closedAt as string) === today,
  );
}
