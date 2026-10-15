import { describe, expect, it } from "vitest";
import { commitSaleItem, restoreSaleItem, sellableBlisters } from "@/lib/stock";
import type { Product, SaleItem } from "@/lib/types";

function product(): Product {
  return {
    id: "prod-1",
    name: "Acetaminofén",
    price: 18.5,
    costPrice: 11,
    quantity: 1,
    unitsPerBox: 20,
    unitPrice: 1.5,
    unitsPerBlister: 10,
    blisterPrice: 9.5,
    looseUnits: 0,
    lots: [
      {
        id: "lot-1",
        lot: "AC-1",
        expiresAt: "2027-08-15",
        quantity: 1,
        looseUnits: 0,
        costPrice: 11,
      },
    ],
    branchId: "suc-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("venta por blíster", () => {
  it("abre la caja y deja el blíster sobrante", () => {
    const item: SaleItem = {
      productId: "prod-1",
      name: "Acetaminofén",
      price: 9.5,
      quantity: 1,
      saleUnit: "blister",
    };
    const sold = commitSaleItem(product(), item);
    expect(sold.error).toBeUndefined();
    expect(sold.product.quantity).toBe(0);
    expect(sold.product.looseUnits).toBe(10);
    expect(sellableBlisters(sold.product)).toBe(1);
  });

  it("devuelve el blíster a la caja", () => {
    const item: SaleItem = {
      productId: "prod-1",
      name: "Acetaminofén",
      price: 9.5,
      quantity: 1,
      saleUnit: "blister",
    };
    const sold = commitSaleItem(product(), item);
    const back = restoreSaleItem(sold.product, sold.item);
    expect(back.error).toBeUndefined();
    expect(back.product.quantity).toBe(1);
    expect(back.product.looseUnits).toBe(0);
  });
});
