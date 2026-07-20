"use client";
import type { DayBucket } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { days: DayBucket[] };

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function SalesBarChart({ days }: Props) {
  const max = Math.max(...days.map((d) => d.total), 1);
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const today = new Date();
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ventas · últimos 7 días
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
            {formatMoney(weekTotal)}
          </p>
        </div>
        <p className="rounded-full border border-white/60 bg-white/45 px-2.5 py-1 text-xs text-[var(--muted)] backdrop-blur-md">
          {days.reduce((n, d) => n + d.tickets, 0)} tickets
        </p>
      </div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
        {days.map((day) => {
          const height = Math.max(6, (day.total / max) * 100);
          const isToday = isSameCalendarDay(day.date, today);
          return (
            <div
              key={day.key}
              className="group flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex h-36 w-full items-end justify-center">
                <div
                  className={`w-full max-w-10 rounded-t-2xl transition duration-500 sm:max-w-12 ${
                    isToday
                      ? "bg-[linear-gradient(180deg,#22d3ee,#0f766e)] shadow-[0_8px_20px_rgba(20,184,166,0.35)]"
                      : "bg-[linear-gradient(180deg,rgba(45,212,191,0.55),rgba(15,118,110,0.35))] group-hover:brightness-110"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${formatMoney(day.total)}`}
                />
                <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--ink)] px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {formatMoney(day.total)}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold sm:text-xs ${
                  isToday ? "text-[var(--brand)]" : "text-[var(--muted)]"
                }`}
              >
                {day.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
