"use client";
import type { DayBucket } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { days: DayBucket[] };

export function SalesBarChart({ days }: Props) {
  const max = Math.max(...days.map((d) => d.total), 1);
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const w = 320;
  const h = 110;
  const padX = 6;
  const padY = 10;
  const points = days.map((d, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(days.length - 1, 1);
    const y = h - padY - (d.total / max) * (h - padY * 2);
    return { x, y, d };
  });
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1]?.x ?? 0} ${h - padY} L ${points[0]?.x ?? 0} ${h - padY} Z`;

  return (
    <div className="min-w-0 max-w-full">
      <p className="truncate font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
        {formatMoney(weekTotal)}
      </p>
      <span className="mt-2 inline-flex rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
        Ventas semanales
      </span>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-3 h-32 w-full"
        role="img"
        aria-label="Ventas por día"
      >
        <defs>
          <linearGradient id="areaFillBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFillBlue)" />
        <path
          d={line}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={p.d.key}
            cx={p.x}
            cy={p.y}
            r="3.2"
            fill="#fff"
            stroke="#2563eb"
            strokeWidth="2"
          >
            <title>
              {p.d.shortLabel}: {formatMoney(p.d.total)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-0.5 text-[10px] font-medium text-[var(--muted)]">
        {days.map((d) => (
          <span key={d.key}>{d.shortLabel}</span>
        ))}
      </div>
    </div>
  );
}
