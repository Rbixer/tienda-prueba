"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductThumb } from "@/components/ProductThumb";
import { Panel, buttonSecondary } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { downloadSalesPdf } from "@/lib/pdf";
import { formatDate, formatMoney } from "@/lib/store";
import type { Sale } from "@/lib/types";
type Period = "hoy" | "semana" | "mes" | "todo";
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function matchesPeriod(sale: Sale, period: Period) {
  if (period === "todo") return true;
  const saleTime = new Date(sale.createdAt).getTime();
  const now = new Date();
  const today = startOfDay(now);
  if (period === "hoy") return saleTime >= today;
  if (period === "semana") {
    const weekAgo = today - 6 * 24 * 60 * 60 * 1000;
    return saleTime >= weekAgo;
  }
  if (period === "mes") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return saleTime >= monthStart;
  }
  return true;
}
const periods: { id: Period; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "7 días" },
  { id: "mes", label: "Este mes" },
  { id: "todo", label: "Todo" },
];
export default function ReportesPage() {
  const { branchSales, currentBranchName, session } = useAuth();
  const [period, setPeriod] = useState<Period>("hoy");
  const [openId, setOpenId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const filtered = useMemo(
    () =>
      branchSales
        .filter((s) => matchesPeriod(s, period))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [branchSales, period],
  );
  const total = filtered.reduce((sum, s) => sum + s.total, 0);
  const tickets = filtered.length;
  const itemsSold = filtered.reduce(
    (sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0),
    0,
  );
  const average = tickets > 0 ? total / tickets : 0;
  const periodLabel =
    periods.find((p) => p.id === period)?.label ?? period;
  async function onDownload() {
    setDownloading(true);
    try {
      await downloadSalesPdf(filtered, currentBranchName, periodLabel);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <AppShell
      title="Reportes de ventas"
      subtitle={`Historial de ventas en ${currentBranchName}${
        session?.role === "vendedor" ? " (tu sucursal)" : ""
      }.`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  period === p.id
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${buttonSecondary} min-h-11 w-full sm:w-auto`}
            onClick={onDownload}
            disabled={downloading || filtered.length === 0}
          >
            <Download size={16} />
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Total vendido
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand)]">
              {formatMoney(total)}
            </p>
          </Panel>
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Tickets
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {tickets}
            </p>
          </Panel>
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Artículos
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {itemsSold}
            </p>
          </Panel>
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Ticket promedio
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {formatMoney(average)}
            </p>
          </Panel>
        </div>
        <Panel className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <Receipt size={18} className="text-[var(--brand)]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Detalle de ventas
            </h2>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {filtered.map((sale) => {
              const open = openId === sale.id;
              return (
                <div
                  key={sale.id}
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)]"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setOpenId(open ? null : sale.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--brand)]">
                        {formatMoney(sale.total)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {formatDate(sale.createdAt)} · {sale.userName} ·{" "}
                        {sale.items.length} producto
                        {sale.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {open ? (
                      <ChevronUp
                        size={18}
                        className="shrink-0 text-[var(--muted)]"
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        className="shrink-0 text-[var(--muted)]"
                      />
                    )}
                  </button>
                  {open ? (
                    <div className="border-t border-[var(--line)] bg-white px-4 py-3">
                      <ul className="space-y-2 text-sm">
                        {sale.items.map((item) => (
                          <li
                            key={`${sale.id}-${item.productId}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <ProductThumb
                                src={item.image}
                                alt={item.name}
                                size="sm"
                              />
                              <span className="truncate">
                                {item.quantity}× {item.name}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium">
                              {formatMoney(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">
                No hay ventas en este período.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
