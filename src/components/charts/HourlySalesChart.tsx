"use client";
import type { HourBucket } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { hours: HourBucket[] };

export function HourlySalesChart({ hours }: Props) {
  const max = Math.max(...hours.map((h) => h.total), 1);
  const total = hours.reduce((s, h) => s + h.total, 0);
  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Ventas por hora · hoy
          </p>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl font-bold">
            {formatMoney(total)}
          </p>
        </div>
      </div>
      <div className="flex h-36 max-w-full items-end gap-0.5 overflow-x-auto overscroll-x-contain pb-1 sm:gap-1">
        {hours.map((h) => {
          const height = Math.max(4, (h.total / max) * 100);
          return (
            <div
              key={h.hour}
              className="group flex w-5 shrink-0 flex-col items-center gap-1 sm:min-w-0 sm:w-auto sm:flex-1"
              title={`${h.label}: ${formatMoney(h.total)}`}
            >
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-[10px] rounded-t-md bg-[var(--brand)]/80 transition group-hover:bg-[var(--brand)] sm:max-w-[12px]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[8px] font-medium text-[var(--muted)] sm:text-[9px]">
                {h.hour}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
