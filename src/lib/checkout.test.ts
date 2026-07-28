import { describe, expect, it } from "vitest";
import { applyCheckout } from "@/lib/checkout";
import type { Session, StoreData } from "@/lib/types";
import { ALL_PERMISSIONS } from "@/lib/permissions";

function baseStore(): StoreData {
  return {
    version: 1,
    branches: [
      { id: "bodega-central", name: "Bodega", address: "x", isWarehouse: true },
      { id: "suc-1", name: "Centro", address: "Av 1" },
    ],
    users: [
      {
        id: "usr-1",
        name: "Cajero",
        username: "cajero",
        password: "",
        role: "vendedor",
        branchId: "suc-1",
        allowedBranchIds: ["suc-1"],
        permissions: ["pos", "dashboard", "inventario"],
      },
    ],
    products: [
      {
        id: "prod-1",
        name: "Agua",
        price: 5,
        costPrice: 2,
        quantity: 10,
        barcode: "100",
        branchId: "suc-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    sales: [],
    transfers: [],
    suppliers: [],
    supplierPayments: [],
    settings: { companyName: "MI BARRIO" },
  };
}

const session: Session = {
  userId: "usr-1",
  name: "Cajero",
  username: "cajero",
  role: "vendedor",
  branchId: "suc-1",
  allowedBranchIds: ["suc-1"],
  permissions: ["pos", "dashboard", "inventario"],
};

describe("applyCheckout", () => {
  it("descuenta stock y crea venta", () => {
    const result = applyCheckout(baseStore(), session, [
      {
        productId: "prod-1",
        name: "Agua",
        price: 5,
        quantity: 3,
      },
    ]);
    expect(result.error).toBeNull();
    expect(result.sale?.total).toBe(15);
    expect(result.store?.products[0].quantity).toBe(7);
    expect(result.store?.sales).toHaveLength(1);
  });

  it("rechaza stock insuficiente", () => {
    const result = applyCheckout(baseStore(), session, [
      { productId: "prod-1", name: "Agua", price: 5, quantity: 99 },
    ]);
    expect(result.error).toMatch(/Stock insuficiente/);
    expect(result.store).toBeUndefined();
  });

  it("rechaza sin permiso POS", () => {
    const noPos: Session = {
      ...session,
      permissions: ["dashboard"],
    };
    const result = applyCheckout(baseStore(), noPos, [
      { productId: "prod-1", name: "Agua", price: 5, quantity: 1 },
    ]);
    expect(result.error).toMatch(/permiso/);
  });

  it("rechaza venta desde bodega", () => {
    const warehouseSession: Session = {
      ...session,
      branchId: "bodega-central",
      permissions: [...ALL_PERMISSIONS],
      role: "administrador",
    };
    const result = applyCheckout(baseStore(), warehouseSession, [
      { productId: "prod-1", name: "Agua", price: 5, quantity: 1 },
    ]);
    expect(result.error).toMatch(/Bodega Central/);
  });
});
