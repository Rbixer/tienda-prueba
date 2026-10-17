"use client";
import type { SellerBucket } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { sellers: SellerBucket[] };

const colors = ["#e06a1f", "#b45309", "#5a3826", "#7d6556"];

export function SellerSalesChart({ sellers }: Props) {
  if (sellers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Sin ventas de vendedores en el período.
      </p>
    );
  }
  const max = Math.max(...sellers.map((s) => s.total), 1);
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Ventas por vendedor · 7 días
      </p>
      <div className="space-y-3">
        {sellers.map((s, i) => {
          const width = Math.max(8, (s.total / max) * 100);
          return (
            <div key={s.userId}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: colors[i % colors.length] }}
                  >
                    {s.userName[0]?.toUpperCase() ?? "V"}
                  </span>
                  <p className="truncate text-sm font-medium">{s.userName}</p>
                </div>
                <p className="shrink-0 text-xs font-bold">
                  {formatMoney(s.total)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    background: colors[i % colors.length],
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {s.tickets} ticket{s.tickets === 1 ? "" : "s"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
