"use client";

import { useState, type FormEvent } from "react";
import { PackagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Field, Panel, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import { formatMoney } from "@/lib/store";
import type { PurchaseOrderItem } from "@/lib/types";

const emptyLine = (): PurchaseOrderItem => ({
  name: "",
  barcode: "",
  quantity: 1,
  costPrice: 0,
  price: 0,
  lot: "",
  expiresAt: "",
  genericName: "",
  presentation: "",
});

export function PurchaseOrdersPanel() {
  const {
    data,
    createPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<PurchaseOrderItem[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const orders = data.purchaseOrders ?? [];
  const suppliers = data.suppliers ?? [];

  function updateLine(index: number, patch: Partial<PurchaseOrderItem>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const err = createPurchaseOrder({
      supplierId,
      note,
      items: lines.map((line) => ({
        ...line,
        barcode: line.barcode?.trim() || undefined,
        quantity: Number(line.quantity),
        costPrice: Number(line.costPrice),
        price: Number(line.price),
      })),
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setOpen(false);
    setNote("");
    setLines([emptyLine()]);
  }

  return (
    <Panel className="!p-3 sm:!p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Pedidos a proveedores</h2>
          <p className="text-xs text-[var(--muted)]">
            Lo pedido entra al inventario con su lote al recibirlo.
          </p>
        </div>
        <button
          type="button"
          className={buttonPrimary}
          onClick={() => setOpen((value) => !value)}
        >
          <PackagePlus size={16} />
          Nuevo pedido
        </button>
      </div>
      {open ? (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <Field label="Proveedor">
            <select
              className={inputClass}
              value={supplierId}
              required
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-[var(--line)] p-3 sm:grid-cols-2"
            >
              <Field label="Producto">
                <input
                  className={inputClass}
                  value={line.name}
                  required
                  onChange={(e) => updateLine(index, { name: e.target.value })}
                />
              </Field>
              <Field label="Código de barras">
                <input
                  className={inputClass}
                  value={line.barcode ?? ""}
                  onChange={(e) => updateLine(index, { barcode: e.target.value })}
                />
              </Field>
              <Field label="Lote">
                <input
                  className={inputClass}
                  value={line.lot}
                  required
                  onChange={(e) => updateLine(index, { lot: e.target.value })}
                />
              </Field>
              <Field label="Vencimiento">
                <input
                  type="date"
                  className={inputClass}
                  value={line.expiresAt ?? ""}
                  onChange={(e) => updateLine(index, { expiresAt: e.target.value })}
                />
              </Field>
              <Field label="Cantidad">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Costo">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={line.costPrice}
                  onChange={(e) =>
                    updateLine(index, { costPrice: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Precio de venta">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={line.price}
                  onChange={(e) =>
                    updateLine(index, { price: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              Otra línea
            </button>
            <button type="submit" className={buttonPrimary}>
              Guardar pedido
            </button>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      ) : null}
      <ul className="mt-3 space-y-2">
        {orders.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">Aún no hay pedidos.</li>
        ) : (
          orders.map((order) => {
            const supplier = suppliers.find((item) => item.id === order.supplierId);
            const amount = order.items.reduce(
              (sum, item) => sum + item.quantity * item.costPrice,
              0,
            );
            return (
              <li
                key={order.id}
                className="rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {supplier?.name ?? "Proveedor"} · {order.status}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {order.items
                        .map((item) => `${item.quantity} ${item.name} (${item.lot})`)
                        .join(" · ")}{" "}
                      · {formatMoney(amount)}
                    </p>
                  </div>
                  {order.status === "pedido" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={buttonPrimary}
                        onClick={() => {
                          const err = receivePurchaseOrder(order.id);
                          if (err) setError(err);
                        }}
                      >
                        Recibir
                      </button>
                      <button
                        type="button"
                        className={buttonSecondary}
                        onClick={() => {
                          const err = cancelPurchaseOrder(order.id);
                          if (err) setError(err);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Panel>
  );
}
