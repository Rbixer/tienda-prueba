"use client";
import type { MarginPoint } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { points: MarginPoint[] };

export function MarginChart({ points }: Props) {
  const max = Math.max(...points.flatMap((p) => [p.revenue, p.cost]), 1);
  const profit = points.reduce((s, p) => s + p.profit, 0);
  const revenue = points.reduce((s, p) => s + p.revenue, 0);
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Margen estimado · 7 días
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--navy)]">
            {formatMoney(profit)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {marginPct.toFixed(0)}% sobre ventas
          </p>
        </div>
        <div className="flex gap-3 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 text-[var(--muted)]">
            <span className="h-2 w-2 rounded-sm bg-[var(--brand)]" /> Ingreso
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--muted)]">
            <span className="h-2 w-2 rounded-sm bg-slate-400" /> Costo
          </span>
        </div>
      </div>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {points.map((p) => {
          const revH = Math.max(4, (p.revenue / max) * 100);
          const costH = Math.max(4, (p.cost / max) * 100);
          return (
            <div
              key={p.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${p.shortLabel}: ingreso ${formatMoney(p.revenue)} · costo ${formatMoney(p.cost)} · margen ${formatMoney(p.profit)}`}
            >
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                <div
                  className="w-[42%] max-w-5 rounded-t-md bg-[var(--brand)]"
                  style={{ height: `${revH}%` }}
                />
                <div
                  className="w-[42%] max-w-5 rounded-t-md bg-slate-400"
                  style={{ height: `${costH}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-[var(--muted)]">
                {p.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
