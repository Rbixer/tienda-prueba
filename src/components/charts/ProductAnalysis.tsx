"use client";
import Link from "next/link";
import type { ProductInsight } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

const statusLabel: Record<ProductInsight["status"], string> = {
  strong: "Fuerte",
  ok: "Normal",
  weak: "Bajo",
  dead: "Descartar",
};

const statusClass: Record<ProductInsight["status"], string> = {
  strong: "bg-[var(--success-soft)] text-[var(--success)]",
  ok: "bg-[var(--brand-soft)] text-[var(--brand)]",
  weak: "bg-[var(--accent-soft)] text-[var(--accent)]",
  dead: "bg-red-50 text-[var(--danger)]",
};

type Props = { insights: ProductInsight[] };

export function ProductAnalysis({ insights }: Props) {
  const discard = insights.filter(
    (i) => i.status === "dead" || i.status === "weak",
  );
  const rows = insights.slice(0, 10);

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--bg-soft)] px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Sin ventas
          </p>
          <p className="mt-1 text-lg font-bold text-[var(--danger)] sm:text-xl">
            {insights.filter((i) => i.status === "dead").length}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--bg-soft)] px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Bajo vol.
          </p>
          <p className="mt-1 text-lg font-bold text-[var(--accent)] sm:text-xl">
            {insights.filter((i) => i.status === "weak").length}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--bg-soft)] px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            A revisar
          </p>
          <p className="mt-1 truncate text-lg font-bold text-[var(--danger)] sm:text-xl">
            {discard.length}
          </p>
        </div>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div
            key={row.productId}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]/50 p-3"
          >
            <div className="flex items-start gap-2.5">
              {row.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.image}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-[var(--line)]"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold">{row.name}</p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusClass[row.status]}`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {row.advice}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
                  <div className="rounded-lg bg-white px-1 py-1.5">
                    <p className="text-[var(--muted)]">Vend.</p>
                    <p className="font-semibold">{row.quantitySold}</p>
                  </div>
                  <div className="rounded-lg bg-white px-1 py-1.5">
                    <p className="text-[var(--muted)]">Stock</p>
                    <p className="font-semibold">{row.stock}</p>
                  </div>
                  <div className="rounded-lg bg-white px-1 py-1.5">
                    <p className="text-[var(--muted)]">Ingreso</p>
                    <p className="truncate font-semibold">
                      {formatMoney(row.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
              <th className="pb-2 pr-2 font-semibold">Producto</th>
              <th className="pb-2 pr-2 text-right font-semibold">Vendidos</th>
              <th className="pb-2 pr-2 text-right font-semibold">Ingreso</th>
              <th className="pb-2 pr-2 text-right font-semibold">Stock</th>
              <th className="pb-2 pr-2 text-right font-semibold">Valor</th>
              <th className="pb-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.productId}
                className="border-b border-[var(--line)]/80 last:border-0"
              >
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-[var(--line)]"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {row.advice}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">
                  {row.quantitySold}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-[var(--muted)]">
                  {formatMoney(row.revenue)}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{row.stock}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-[var(--muted)]">
                  {formatMoney(row.stockValue)}
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusClass[row.status]}`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/app/inventario"
        className="mt-3 inline-block text-sm font-semibold text-[var(--brand)] hover:underline"
      >
        Ir a inventario →
      </Link>
    </div>
  );
}
