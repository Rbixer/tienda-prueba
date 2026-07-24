"use client";
import { Crown, Store } from "lucide-react";
import type { BranchBucket } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { branches: BranchBucket[]; periodLabel?: string };

const palette = ["#2563eb", "#f97316", "#0f766e", "#7c3aed", "#db2777"];

export function BranchSalesChart({
  branches,
  periodLabel = "últimos 7 días",
}: Props) {
  // La bodega no vende: solo se muestra si tuviera movimiento
  const stores = branches.filter((b) => !b.isWarehouse || b.revenue > 0);

  if (stores.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Aún no hay sucursales con ventas.
      </p>
    );
  }

  const max = Math.max(...stores.map((b) => b.revenue), 1);
  const totalRevenue = stores.reduce((s, b) => s + b.revenue, 0);
  const totalProfit = stores.reduce((s, b) => s + b.profit, 0);
  const leader = stores[0];

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Total vendido · {periodLabel}
          </p>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl font-bold">
            {formatMoney(totalRevenue)}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Ganancia {formatMoney(totalProfit)}
        </p>
      </div>

      <div className="space-y-2.5">
        {stores.map((b, i) => {
          const width = b.revenue > 0 ? Math.max(6, (b.revenue / max) * 100) : 0;
          const color = palette[i % palette.length];
          const isLeader = b.branchId === leader.branchId && b.revenue > 0;
          return (
            <div
              key={b.branchId}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: color }}
                  >
                    {isLeader ? <Crown size={14} /> : <Store size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {b.tickets} tickets · {b.unitsSold} und ·{" "}
                      {b.products} productos
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{formatMoney(b.revenue)}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {b.share.toFixed(0)}% del total
                  </p>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${width}%`, background: color }}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)]">
                <span>
                  Ganancia{" "}
                  <strong
                    className={
                      b.profit >= 0 ? "text-emerald-700" : "text-red-700"
                    }
                  >
                    {formatMoney(b.profit)}
                  </strong>
                </span>
                <span>Margen {b.marginPct.toFixed(0)}%</span>
                <span>Ticket prom. {formatMoney(b.avgTicket)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
