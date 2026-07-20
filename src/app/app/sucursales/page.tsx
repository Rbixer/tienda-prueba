"use client";
import { Check, MapPin, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GuardAdmin } from "@/components/GuardAdmin";
import { Panel, buttonPrimary } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { formatMoney, getCostPrice } from "@/lib/store";
export default function SucursalesPage() {
  const { data, session, setActiveBranch } = useAuth();
  return (
    <AppShell
      title="Sucursales"
      subtitle="Administra las 3 sucursales y cambia la ubicación activa para operar inventario y POS."
    >
      <GuardAdmin>
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-3 md:items-stretch">
          {data.branches.map((branch, index) => {
            const products = data.products.filter(
              (p) => p.branchId === branch.id,
            );
            const users = data.users.filter((u) => u.branchId === branch.id);
            const sales = data.sales.filter((s) => s.branchId === branch.id);
            const stockValue = products.reduce(
              (sum, p) => sum + getCostPrice(p) * p.quantity,
              0,
            );
            const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);
            const active = session?.branchId === branch.id;
            return (
              <Panel
                key={branch.id}
                className={`relative flex h-full flex-col overflow-hidden transition ${
                  active ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20" : ""
                }`}
              >
                <div
                  className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30"
                  style={{
                    background:
                      index === 0
                        ? "var(--brand)"
                        : index === 1
                          ? "var(--accent)"
                          : "#4A7C6F",
                  }}
                />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Store size={20} />
                    </div>
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2 py-1 text-xs font-medium text-white">
                        <Check size={12} />
                        Activa
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">
                    {branch.name}
                  </h2>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--muted)]">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    {branch.address}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-2">
                      <dt className="text-xs text-[var(--muted)]">Productos</dt>
                      <dd className="mt-1 font-semibold">{products.length}</dd>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-2">
                      <dt className="text-xs text-[var(--muted)]">Usuarios</dt>
                      <dd className="mt-1 font-semibold">{users.length}</dd>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-2">
                      <dt className="text-xs text-[var(--muted)]">Inventario</dt>
                      <dd className="mt-1 font-semibold">
                        {formatMoney(stockValue)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-2">
                      <dt className="text-xs text-[var(--muted)]">Ventas</dt>
                      <dd className="mt-1 font-semibold">
                        {formatMoney(salesTotal)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`${buttonPrimary} mt-auto w-full`}
                    disabled={active}
                    onClick={() => setActiveBranch(branch.id)}
                  >
                    {active ? "Sucursal en uso" : "Operar aquí"}
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      </GuardAdmin>
    </AppShell>
  );
}
