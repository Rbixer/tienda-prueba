import { describe, expect, it } from "vitest";
import { mergeStores } from "@/lib/sync";
import type { StoreData } from "@/lib/types";

function store(partial: Partial<StoreData>): StoreData {
  return {
    version: 0,
    branches: [{ id: "suc-1", name: "Centro", address: "x" }],
    users: [],
    products: [],
    sales: [],
    transfers: [],
    suppliers: [],
    supplierPayments: [],
    settings: { companyName: "MI BARRIO" },
    ...partial,
  };
}

describe("mergeStores", () => {
  it("conserva ventas locales y del servidor", () => {
    const server = store({
      version: 2,
      sales: [
        {
          id: "sale-server",
          branchId: "suc-1",
          userId: "u1",
          userName: "A",
          items: [],
          total: 10,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });
    const local = store({
      version: 1,
      sales: [
        {
          id: "sale-offline",
          branchId: "suc-1",
          userId: "u1",
          userName: "A",
          items: [],
          total: 20,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
    });
    const merged = mergeStores(server, local);
    const ids = merged.sales.map((s) => s.id).sort();
    expect(ids).toEqual(["sale-offline", "sale-server"]);
    expect(merged.version).toBe(2);
  });

  it("prioriza producto local (stock offline)", () => {
    const product = {
      id: "prod-1",
      name: "Agua",
      price: 5,
      costPrice: 2,
      quantity: 10,
      branchId: "suc-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const server = store({ products: [{ ...product, quantity: 10 }] });
    const local = store({ products: [{ ...product, quantity: 7 }] });
    const merged = mergeStores(server, local);
    expect(merged.products[0].quantity).toBe(7);
  });
});
