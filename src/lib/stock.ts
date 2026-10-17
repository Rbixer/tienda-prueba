import { expiryTone } from "@/lib/pharmacy";
import type { LotAllocation, Product, SaleItem, StockLot } from "@/lib/types";

function sortLots(lots: StockLot[]): StockLot[] {
  return [...lots].sort((a, b) => {
    const ae = a.expiresAt || "9999-12-31";
    const be = b.expiresAt || "9999-12-31";
    return ae.localeCompare(be);
  });
}

function cloneLots(lots: StockLot[]): StockLot[] {
  return lots.map((lot) => ({
    ...lot,
    quantity: Math.max(0, Math.floor(lot.quantity)),
    looseUnits: Math.max(0, Math.floor(lot.looseUnits ?? 0)),
  }));
}

/** Sincroniza cajas, sueltas y el lote que debe salir primero. */
export function reflectLots(product: Product, lots: StockLot[]): Product {
  const cloned = cloneLots(lots);
  const positive = cloned.filter(
    (lot) => lot.quantity > 0 || (lot.looseUnits ?? 0) > 0,
  );
  const next = positive.length ? positive : cloned.slice(0, 1);
  const quantity = next.reduce((sum, lot) => sum + lot.quantity, 0);
  const looseUnits = next.reduce((sum, lot) => sum + (lot.looseUnits ?? 0), 0);
  const withStock = next.filter(
    (lot) => lot.quantity > 0 || (lot.looseUnits ?? 0) > 0,
  );
  const sellable = withStock.filter(
    (lot) => expiryTone(lot.expiresAt) !== "expired",
  );
  const head = sortLots(sellable.length ? sellable : withStock)[0];
  return {
    ...product,
    lots: next,
    quantity,
    looseUnits,
    lot: head?.lot ?? product.lot,
    expiresAt: head?.expiresAt ?? product.expiresAt,
  };
}

/** Garantiza al menos un lote a partir de los campos antiguos. */
export function ensureLots(product: Product): Product {
  if (product.lots?.length) return reflectLots(product, product.lots);
  return reflectLots(product, [
    {
      id: `lot-${product.id}`,
      lot: product.lot?.trim() || "INICIAL",
      expiresAt: product.expiresAt,
      quantity: Math.max(0, Math.floor(product.quantity)),
      looseUnits: Math.max(0, Math.floor(product.looseUnits ?? 0)),
      costPrice: product.costPrice,
    },
  ]);
}

export function sellableBoxes(product: Product): number {
  return (ensureLots(product).lots ?? [])
    .filter((lot) => expiryTone(lot.expiresAt) !== "expired")
    .reduce((sum, lot) => sum + lot.quantity, 0);
}

export function sellableUnits(product: Product): number {
  const per = Math.max(0, Math.floor(product.unitsPerBox ?? 0));
  return (ensureLots(product).lots ?? [])
    .filter((lot) => expiryTone(lot.expiresAt) !== "expired")
    .reduce((sum, lot) => sum + (lot.looseUnits ?? 0) + lot.quantity * per, 0);
}

export type SalePack = "caja" | "blister" | "unidad";

export function canSellUnit(product: Product): boolean {
  return Boolean(
    product.unitsPerBox &&
      product.unitPrice != null &&
      product.unitPrice >= 0,
  );
}

export function canSellBlister(product: Product): boolean {
  const blister = Math.floor(product.unitsPerBlister ?? 0);
  const box = Math.floor(product.unitsPerBox ?? 0);
  return (
    blister > 0 &&
    box > 0 &&
    blister <= box &&
    product.blisterPrice != null &&
    product.blisterPrice >= 0
  );
}

export function sellableBlisters(product: Product): number {
  const per = Math.max(0, Math.floor(product.unitsPerBlister ?? 0));
  if (!canSellBlister(product) || per <= 0) return 0;
  return Math.floor(sellableUnits(product) / per);
}

export function packStock(product: Product, pack: SalePack): number {
  if (pack === "unidad") return canSellUnit(product) ? sellableUnits(product) : 0;
  if (pack === "blister") return sellableBlisters(product);
  return sellableBoxes(product);
}

export function packPrice(product: Product, pack: SalePack): number {
  if (pack === "unidad") return Number(product.unitPrice);
  if (pack === "blister") return Number(product.blisterPrice);
  return product.price;
}

export function packName(pack?: string): string {
  if (pack === "unidad") return "unidad";
  if (pack === "blister") return "paquete";
  return "caja";
}

export function readSalePacks(input: {
  unitsPerBox?: number;
  unitPrice?: number;
  unitsPerBlister?: number;
  blisterPrice?: number;
}): {
  error?: string;
  unitsPerBox?: number;
  unitPrice?: number;
  unitsPerBlister?: number;
  blisterPrice?: number;
} {
  const unitsPerBox = input.unitsPerBox
    ? Math.max(0, Math.floor(input.unitsPerBox))
    : undefined;
  const unitsPerBlister = input.unitsPerBlister
    ? Math.max(0, Math.floor(input.unitsPerBlister))
    : undefined;
  const unitPrice =
    input.unitPrice !== undefined &&
    Number.isFinite(input.unitPrice) &&
    input.unitPrice >= 0
      ? Number(input.unitPrice)
      : undefined;
  const blisterPrice =
    input.blisterPrice !== undefined &&
    Number.isFinite(input.blisterPrice) &&
    input.blisterPrice >= 0
      ? Number(input.blisterPrice)
      : undefined;
  if (unitPrice !== undefined && !unitsPerBox) {
    return { error: "La venta por unidad necesita las unidades por caja." };
  }
  if (unitsPerBlister || blisterPrice !== undefined) {
    if (!unitsPerBox || !unitsPerBlister || blisterPrice === undefined) {
      return {
        error:
          "El paquete necesita unidades por caja, unidades por paquete y su precio.",
      };
    }
    if (unitsPerBlister > unitsPerBox) {
      return { error: "El paquete no puede traer más unidades que la caja." };
    }
  }
  return {
    unitsPerBox: unitsPerBox || undefined,
    unitPrice,
    unitsPerBlister: unitsPerBlister || undefined,
    blisterPrice,
  };
}

function applyAllocations(
  product: Product,
  allocations: LotAllocation[],
  sign: 1 | -1,
): { product: Product; error?: string } {
  const lots = cloneLots(ensureLots(product).lots ?? []);
  for (const line of allocations) {
    let lot = lots.find((item) => item.id === line.lotId);
    if (!lot && sign > 0) {
      lot = {
        id: line.lotId,
        lot: line.lot || "DEVOLUCION",
        expiresAt: line.expiresAt,
        quantity: 0,
        looseUnits: 0,
        costPrice: product.costPrice,
      };
      lots.push(lot);
    }
    if (!lot) return { product, error: `No está el lote de ${product.name}.` };
    const boxes = lot.quantity + sign * line.boxes;
    const units = (lot.looseUnits ?? 0) + sign * line.units;
    if (boxes < 0 || units < 0) {
      return { product, error: `Stock insuficiente de ${product.name}.` };
    }
    lot.quantity = boxes;
    lot.looseUnits = units;
  }
  return { product: reflectLots(product, lots) };
}

function deductBoxes(
  product: Product,
  boxes: number,
): { product: Product; allocations: LotAllocation[]; error?: string } {
  const lots = cloneLots(ensureLots(product).lots ?? []);
  let need = boxes;
  const allocations: LotAllocation[] = [];
  for (const lot of sortLots(lots)) {
    if (need <= 0) break;
    if (expiryTone(lot.expiresAt) === "expired" || lot.quantity <= 0) continue;
    const take = Math.min(need, lot.quantity);
    lot.quantity -= take;
    need -= take;
    allocations.push({
      lotId: lot.id,
      lot: lot.lot,
      expiresAt: lot.expiresAt,
      boxes: take,
      units: 0,
    });
  }
  if (need > 0) {
    return {
      product,
      allocations: [],
      error: `Stock insuficiente de ${product.name}.`,
    };
  }
  return { product: reflectLots(product, lots), allocations };
}

function deductUnits(
  product: Product,
  units: number,
): { product: Product; allocations: LotAllocation[]; error?: string } {
  const per = Math.max(0, Math.floor(product.unitsPerBox ?? 0));
  if (per <= 0) {
    return {
      product,
      allocations: [],
      error: `${product.name} no tiene unidades por caja.`,
    };
  }
  const lots = cloneLots(ensureLots(product).lots ?? []);
  let need = units;
  const taken = new Map<string, LotAllocation>();

  function bump(lot: StockLot, boxes: number, loose: number) {
    const current = taken.get(lot.id) ?? {
      lotId: lot.id,
      lot: lot.lot,
      expiresAt: lot.expiresAt,
      boxes: 0,
      units: 0,
    };
    current.boxes += boxes;
    current.units += loose;
    taken.set(lot.id, current);
  }

  for (const lot of sortLots(lots)) {
    if (need <= 0) break;
    if (expiryTone(lot.expiresAt) === "expired") continue;
    const loose = Math.min(need, lot.looseUnits ?? 0);
    if (loose > 0) {
      lot.looseUnits = (lot.looseUnits ?? 0) - loose;
      need -= loose;
      bump(lot, 0, loose);
    }
  }
  for (const lot of sortLots(lots)) {
    while (need > 0 && lot.quantity > 0 && expiryTone(lot.expiresAt) !== "expired") {
      lot.quantity -= 1;
      const fromBox = Math.min(need, per);
      const leftover = per - fromBox;
      lot.looseUnits = (lot.looseUnits ?? 0) + leftover;
      need -= fromBox;
      bump(lot, 1, -leftover);
    }
  }
  if (need > 0) {
    return {
      product,
      allocations: [],
      error: `Unidades insuficientes de ${product.name}.`,
    };
  }
  return {
    product: reflectLots(product, lots),
    allocations: [...taken.values()],
  };
}

export function commitSaleItem(
  product: Product,
  item: SaleItem,
): { product: Product; item: SaleItem; error?: string } {
  if (item.allocations?.length) {
    const applied = applyAllocations(product, item.allocations, -1);
    if (applied.error) return { product, item, error: applied.error };
    return { product: applied.product, item };
  }
  const unit = item.saleUnit ?? "caja";
  const blisterSize = Math.max(0, Math.floor(product.unitsPerBlister ?? 0));
  if (unit === "blister" && blisterSize <= 0) {
    return {
      product,
      item,
      error: `${product.name} no se vende por paquete.`,
    };
  }
  const result =
    unit === "unidad"
      ? deductUnits(product, item.quantity)
      : unit === "blister"
        ? deductUnits(product, item.quantity * blisterSize)
        : deductBoxes(product, item.quantity);
  if (result.error) return { product, item, error: result.error };
  return {
    product: result.product,
    item: { ...item, allocations: result.allocations },
  };
}

export function restoreSaleItem(
  product: Product,
  item: SaleItem,
): { product: Product; error?: string } {
  if (item.allocations?.length) {
    return applyAllocations(product, item.allocations, 1);
  }
  const blisterSize = Math.max(0, Math.floor(product.unitsPerBlister ?? 0));
  const boxes = item.saleUnit === "caja" || !item.saleUnit ? item.quantity : 0;
  const units =
    item.saleUnit === "unidad"
      ? item.quantity
      : item.saleUnit === "blister"
        ? item.quantity * blisterSize
        : 0;
  const lots = cloneLots(ensureLots(product).lots ?? []);
  const lot = sortLots(lots)[0];
  if (!lot) return { product, error: `No hay lote para devolver ${product.name}.` };
  lot.quantity += boxes;
  lot.looseUnits = (lot.looseUnits ?? 0) + units;
  return { product: reflectLots(product, lots) };
}

export function addIncomingLot(
  product: Product,
  input: {
    id: string;
    lot: string;
    expiresAt?: string;
    quantity: number;
    costPrice: number;
  },
): Product {
  const lots = cloneLots(ensureLots(product).lots ?? []);
  const code = input.lot.trim();
  const existing = lots.find(
    (lot) =>
      lot.lot.toLowerCase() === code.toLowerCase() &&
      (lot.expiresAt ?? "") === (input.expiresAt ?? ""),
  );
  if (existing) {
    existing.quantity += Math.max(0, Math.floor(input.quantity));
    existing.costPrice = input.costPrice;
  } else {
    lots.push({
      id: input.id,
      lot: code,
      expiresAt: input.expiresAt,
      quantity: Math.max(0, Math.floor(input.quantity)),
      looseUnits: 0,
      costPrice: input.costPrice,
    });
  }
  return reflectLots({ ...product, costPrice: input.costPrice }, lots);
}
