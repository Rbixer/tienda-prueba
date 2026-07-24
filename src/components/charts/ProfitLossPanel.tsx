"use client";
import type { ReactNode } from "react";
import { AlertTriangle, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import type { ProfitSummary } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { summary: ProfitSummary; periodLabel?: string };

export function ProfitLossPanel({
  summary,
  periodLabel = "últimos 7 días",
}: Props) {
  const {
    revenue,
    cost,
    profit,
    marginPct,
    stockCost,
    stockRetail,
    potentialProfit,
    deadStockCost,
    deadStockCount,
    lossFromUnderpriced,
    unitsSold,
  } = summary;

  const gain = profit >= 0;
  // Proporción ingreso vs costo para la barra comparativa
  const base = Math.max(revenue, 1);
  const costWidth = Math.min(100, (cost / base) * 100);
  const profitWidth = Math.max(0, 100 - costWidth);

  return (
    <div className="min-w-0 max-w-full">
      {/* Resultado principal */}
      <div
        className={`rounded-2xl p-4 ${
          gain
            ? "bg-gradient-to-br from-emerald-50 to-emerald-100/60 ring-1 ring-emerald-200"
            : "bg-gradient-to-br from-red-50 to-red-100/60 ring-1 ring-red-200"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {gain ? "Ganancia neta" : "Pérdida neta"} · {periodLabel}
            </p>
            <p
              className={`mt-1 truncate font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl ${
                gain ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatMoney(Math.abs(profit))}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Margen {marginPct.toFixed(1)}% sobre {formatMoney(revenue)}{" "}
              vendidos · {unitsSold} unidades
            </p>
          </div>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              gain
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {gain ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </span>
        </div>

        {/* Barra costo vs ganancia */}
        <div className="mt-3.5 flex h-2.5 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full bg-slate-400"
            style={{ width: `${costWidth}%` }}
            title={`Costo: ${formatMoney(cost)}`}
          />
          <div
            className={`h-full ${gain ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${profitWidth}%` }}
            title={`Ganancia: ${formatMoney(profit)}`}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-slate-400" />
            Costo mercadería {formatMoney(cost)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-sm ${gain ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {gain ? "Ganancia" : "Pérdida"} {formatMoney(Math.abs(profit))}
          </span>
        </div>
      </div>

      {/* Detalle del inventario */}
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric
          label="Capital en inventario"
          value={formatMoney(stockCost)}
          hint="a precio de costo"
        />
        <Metric
          label="Valor de venta"
          value={formatMoney(stockRetail)}
          hint="si se vende todo"
        />
        <Metric
          label="Ganancia potencial"
          value={formatMoney(potentialProfit)}
          hint="inventario actual"
          tone="good"
          icon={<PiggyBank size={13} />}
        />
        <Metric
          label="Capital en riesgo"
          value={formatMoney(deadStockCost)}
          hint={`${deadStockCount} sin ventas`}
          tone="bad"
          icon={<AlertTriangle size={13} />}
        />
      </div>

      {lossFromUnderpriced > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700 ring-1 ring-red-100">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>
            Se vendieron productos por debajo del costo:{" "}
            <strong>{formatMoney(lossFromUnderpriced)}</strong> de pérdida
            directa. Revisa los precios de venta en Inventario.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad";
  icon?: ReactNode;
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-[var(--ink)]";
  return (
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]/60 px-2.5 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`mt-1 truncate font-[family-name:var(--font-display)] text-base font-bold ${valueClass}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
