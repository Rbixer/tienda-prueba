import type { Product } from "@/lib/types";

export const PHARMACY_CATEGORIES = [
  { id: "abarrotes", label: "Abarrotes" },
  { id: "bebidas", label: "Bebidas" },
  { id: "lacteos", label: "Lácteos" },
  { id: "snacks", label: "Snacks" },
  { id: "limpieza", label: "Limpieza" },
  { id: "cuidado", label: "Cuidado personal" },
] as const;

export type PharmacyCategory = (typeof PHARMACY_CATEGORIES)[number]["id"];

export const PRESENTATION_SUGGESTIONS = [
  "Bolsa",
  "Botella",
  "Lata",
  "Caja",
  "Paquete",
  "Frasco",
  "Unidad",
  "Galón",
  "Sobre",
];

export type PharmacyDetails = {
  genericName?: string;
  presentation?: string;
  concentration?: string;
  laboratory?: string;
  lot?: string;
  expiresAt?: string;
  requiresPrescription?: boolean;
  category?: PharmacyCategory;
};

export type ExpiryTone = "none" | "ok" | "soon" | "expired";

const NEAR_EXPIRY_DAYS = 90;

export function isPharmacyCategory(value: string): value is PharmacyCategory {
  return PHARMACY_CATEGORIES.some((c) => c.id === value);
}

export function categoryLabel(id?: string): string {
  return PHARMACY_CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

export function categoryFromLabel(value: string): PharmacyCategory | undefined {
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  const byId = PHARMACY_CATEGORIES.find((c) => c.id === raw);
  if (byId) return byId.id;
  const byLabel = PHARMACY_CATEGORIES.find(
    (c) => c.label.toLowerCase() === raw,
  );
  return byLabel?.id;
}

function clean(value?: string | null): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

export function parseExpiryDate(value?: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) return null;
  const day = dmy[1].padStart(2, "0");
  const month = dmy[2].padStart(2, "0");
  return `${dmy[3]}-${month}-${day}`;
}

export function formatExpiry(value?: string | null): string {
  const iso = parseExpiryDate(value);
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function daysUntilExpiry(value?: string | null, today = new Date()): number | null {
  const iso = parseExpiryDate(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiry.getTime() - start.getTime()) / 86_400_000);
}

export function expiryTone(value?: string | null, today = new Date()): ExpiryTone {
  const days = daysUntilExpiry(value, today);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= NEAR_EXPIRY_DAYS) return "soon";
  return "ok";
}

export function expiryBadge(value?: string | null): {
  label: string;
  className: string;
} | null {
  const tone = expiryTone(value);
  if (tone === "none") return null;
  const date = formatExpiry(value);
  if (tone === "expired") {
    return {
      label: `Vencido ${date}`,
      className: "bg-red-50 text-red-700",
    };
  }
  if (tone === "soon") {
    return {
      label: `Vence ${date}`,
      className: "bg-amber-50 text-amber-800",
    };
  }
  return {
    label: date,
    className: "bg-[var(--bg-soft)] text-[var(--muted)]",
  };
}

export function pharmacyFields(product: Product): PharmacyDetails {
  return normalizePharmacy(product);
}

export function normalizePharmacy(input: PharmacyDetails): PharmacyDetails {
  const category = input.category;
  const expiresAt = parseExpiryDate(input.expiresAt) ?? undefined;
  return {
    genericName: clean(input.genericName),
    presentation: clean(input.presentation),
    concentration: clean(input.concentration),
    laboratory: clean(input.laboratory),
    lot: clean(input.lot),
    expiresAt,
    requiresPrescription: false,
    category,
  };
}

/** Valida la ficha. La categoría es obligatoria; lote y vencimiento son opcionales. */
export function validatePharmacy(
  input: PharmacyDetails,
  opts?: { strict?: boolean },
): string | null {
  if (input.expiresAt?.trim() && !parseExpiryDate(input.expiresAt)) {
    return "La fecha de vencimiento no es válida.";
  }
  if (!opts?.strict) return null;
  if (!input.category) return "Selecciona la categoría del producto.";
  return null;
}

export function productSearchText(product: Product): string {
  return [
    product.name,
    product.barcode,
    product.genericName,
    product.presentation,
    product.concentration,
    product.laboratory,
    product.lot,
    categoryLabel(product.category),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function productSubtitle(product: Product): string {
  return [
    product.genericName,
    product.concentration,
    product.presentation,
    product.laboratory,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
