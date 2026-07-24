import {
  defaultPermissionsForRole,
  normalizeUser,
} from "./permissions";
import type {
  Branch,
  CompanySettings,
  PdfStyleSettings,
  PdfTextStyle,
  Product,
  Sale,
  SaleItem,
  StoreData,
  User,
} from "./types";

export const STORAGE_KEY = "tienda-barrio-data-v9";
export const SESSION_KEY = "tienda-barrio-session-v2";
/** Cierre automático por inactividad (30 minutos). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Credenciales recordadas en el login (usuario + contraseña). */
export const REMEMBER_LOGIN_KEY = "tienda-barrio-remember-login-v1";
export const BODEGA_CENTRAL_ID = "bodega-central";

export const DEFAULT_PDF_STYLE: PdfStyleSettings = {
  companyName: { bold: true, italic: false, color: "#0b2545" },
  slogan: { bold: false, italic: true, color: "#64748b" },
  contact: { bold: false, italic: false, color: "#334155" },
  accentColor: "#0b2545",
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
  companyName: "MI BARRIO",
  slogan: "Tu tienda de confianza en el barrio",
  address: "",
  phone: "",
  logo: undefined,
  pdfStyle: { ...DEFAULT_PDF_STYLE },
};

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: BODEGA_CENTRAL_ID,
    name: "Bodega Central",
    address: "Almacén principal · distribución a sucursales",
    isWarehouse: true,
  },
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
    permissions: defaultPermissionsForRole("administrador"),
  },
  {
    id: "usr-vendedor",
    name: "Vendedor Demo",
    username: "vendedor",
    password: "vendedor123",
    role: "vendedor",
    branchId: "suc-1",
    permissions: defaultPermissionsForRole("vendedor"),
  },
  {
    id: "usr-vendedor-2",
    name: "María López",
    username: "maria",
    password: "maria123",
    role: "vendedor",
    branchId: "suc-2",
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
 * Se reparte entre las sucursales para tener un inventario realista.
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
function branchForIndex(i: number): string {
  if (i % 5 === 3) return "suc-2";
  if (i % 5 === 4) return "suc-3";
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

/** Genera el catálogo completo (100+ productos) repartido por sucursal. */
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
  const now = new Date().toISOString();
  const storeProducts = [...DEFAULT_PRODUCTS, ...createCatalogProducts()];
  // Bodega: un ítem por nombre (no duplicar el mismo producto de cada sucursal)
  const seen = new Set<string>();
  const warehouseStock: Product[] = [];
  for (const p of storeProducts) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    warehouseStock.push({
      ...p,
      id: `prod-wh-${warehouseStock.length + 1}`,
      quantity: 150 + (warehouseStock.length % 40) * 4,
      branchId: BODEGA_CENTRAL_ID,
      createdAt: now,
      updatedAt: now,
    });
  }
  const products = [...warehouseStock, ...storeProducts];
  return normalizeStoreData({
    branches: DEFAULT_BRANCHES,
    users: DEFAULT_USERS,
    products,
    sales: createMockSales(storeProducts),
    transfers: [],
    settings: { ...DEFAULT_SETTINGS },
  });
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
      address: "Almacén principal · distribución a sucursales",
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
  return {
    branches,
    users,
    products: raw.products ?? [],
    sales: raw.sales ?? [],
    transfers: raw.transfers ?? [],
    settings: {
      companyName: raw.settings?.companyName?.trim() || DEFAULT_SETTINGS.companyName,
      slogan:
        raw.settings?.slogan?.trim() ||
        DEFAULT_SETTINGS.slogan ||
        undefined,
      address: raw.settings?.address?.trim() || undefined,
      phone: raw.settings?.phone?.trim() || undefined,
      logo: raw.settings?.logo || undefined,
      pdfStyle: normalizePdfStyle(raw.settings?.pdfStyle),
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
