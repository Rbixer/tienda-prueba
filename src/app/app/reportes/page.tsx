"use client";
import { useMemo, useState } from "react";
import {
  Boxes,
  Calendar,
  ChevronDown,
  Download,
  Receipt,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  if (day === today) return "Hoy";
  if (day === today - 86_400_000) return "Ayer";
  return d.toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Tone = "slate" | "teal" | "amber";

const toneStyles: Record<Tone, { badge: string; bar: string }> = {
  slate: {
    badge: "bg-[var(--slate-soft)] text-[var(--slate)]",
    bar: "bg-[var(--slate)]/45",
  },
  teal: {
    badge: "bg-[var(--teal-soft)] text-[var(--teal)]",
    bar: "bg-[var(--teal)]/50",
  },
  amber: {
    badge: "bg-[var(--amber-soft)] text-[var(--amber)]",
    bar: "bg-[var(--amber)]/45",
  },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "slate",
  featured = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy)] via-[var(--navy-soft)] to-[#1b4a7e] p-4 text-white shadow-[0_12px_30px_rgba(11,37,69,0.3)] ring-1 ring-white/10 sm:p-5">
        <span
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[var(--accent)]/20 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/65">
            {label}
          </p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300 ring-1 ring-white/15">
            <Icon size={18} />
          </span>
        </div>
        <p className="relative mt-4 truncate font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>
        {hint ? (
          <p className="relative mt-1.5 truncate text-xs text-white/55">
            {hint}
          </p>
        ) : null}
      </section>
    );
  }

  const style = toneStyles[tone];
  return (
    <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span
        className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] ${style.bar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.badge}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 truncate font-[family-name:var(--font-display)] text-2xl font-bold leading-none tracking-tight text-[var(--ink)] sm:text-[1.7rem]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </section>
  );
}

export default function ReportesPage() {
  const { branchSales, currentBranchName, session, data } = useAuth();
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
  const periodLabel = periods.find((p) => p.id === period)?.label ?? period;

  // Agrupa las ventas por día para dar contexto al listado.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; sales: Sale[] }>();
    for (const sale of filtered) {
      const key = String(startOfDay(new Date(sale.createdAt)));
      const entry = map.get(key);
      if (entry) entry.sales.push(sale);
      else map.set(key, { label: dayLabel(sale.createdAt), sales: [sale] });
    }
    return Array.from(map.values());
  }, [filtered]);

  async function onDownload() {
    setDownloading(true);
    try {
      await downloadSalesPdf({
        sales: filtered,
        branchName: currentBranchName,
        periodLabel,
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
        logoDataUrl: data.settings?.logo,
        pdfStyle: data.settings?.pdfStyle,
      });
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
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Barra de control */}
        <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--slate-soft)] text-[var(--navy)] sm:flex">
              <Calendar size={17} />
            </span>
            <div className="inline-flex shrink-0 gap-1 rounded-xl bg-[var(--slate-soft)] p-1 ring-1 ring-[var(--line)]">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                    period === p.id
                      ? "bg-[var(--navy)] text-white shadow-[0_2px_8px_rgba(11,37,69,0.25)]"
                      : "text-[var(--muted)] hover:text-[var(--navy)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-xs text-[var(--muted)] lg:inline">
              {tickets} venta{tickets === 1 ? "" : "s"} · {periodLabel}
            </span>
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
        </div>

        {/* KPIs */}
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            featured
            label="Total vendido"
            value={formatMoney(total)}
            icon={Wallet}
            hint={`Periodo: ${periodLabel}`}
          />
          <KpiCard
            label="Tickets"
            value={String(tickets)}
            icon={Receipt}
            hint="Ventas registradas"
            tone="slate"
          />
          <KpiCard
            label="Artículos"
            value={String(itemsSold)}
            icon={Boxes}
            hint="Unidades despachadas"
            tone="teal"
          />
          <KpiCard
            label="Ticket promedio"
            value={formatMoney(average)}
            icon={TrendingUp}
            hint="Por venta"
            tone="amber"
          />
        </div>

        {/* Detalle */}
        <Panel className="flex min-h-0 flex-1 flex-col !p-0">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--navy)]">
                <Receipt size={16} />
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight">
                  Detalle de ventas
                </h2>
                <p className="text-[11px] text-[var(--muted)]">
                  Toca una venta para ver los productos
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-[var(--bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
              {tickets}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            {groups.map((group) => (
              <section key={group.label} className="mb-4 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    {group.label}
                  </p>
                  <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                  <p className="text-[11px] font-semibold text-[var(--ink)]">
                    {formatMoney(
                      group.sales.reduce((n, s) => n + s.total, 0),
                    )}
                  </p>
                </div>

                <ul className="space-y-2">
                  {group.sales.map((sale) => {
                    const open = openId === sale.id;
                    const units = sale.items.reduce(
                      (n, i) => n + i.quantity,
                      0,
                    );
                    return (
                      <li
                        key={sale.id}
                        className={`overflow-hidden rounded-xl border bg-white transition ${
                          open
                            ? "border-[var(--navy)]/30 shadow-[0_6px_18px_rgba(11,37,69,0.12)]"
                            : "border-[var(--line)] hover:border-[var(--navy)]/25 hover:shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4"
                          onClick={() => setOpenId(open ? null : sale.id)}
                          aria-expanded={open}
                        >
                          <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--slate-soft)] text-[11px] font-bold leading-none tracking-tight text-[var(--navy)] ring-1 ring-[var(--line)]">
                            {timeOnly(sale.createdAt)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--ink)]">
                                {formatMoney(sale.total)}
                              </span>
                              <span className="text-[11px] text-[var(--muted)]">
                                {units} und.
                              </span>
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)]">
                              <User size={11} className="shrink-0" />
                              <span className="truncate">{sale.userName}</span>
                              <span className="shrink-0 opacity-50">·</span>
                              <span className="shrink-0">
                                {sale.items.length} producto
                                {sale.items.length === 1 ? "" : "s"}
                              </span>
                            </span>
                          </span>

                          <ChevronDown
                            size={18}
                            className={`shrink-0 text-[var(--muted)] transition ${
                              open ? "rotate-180 text-[var(--navy)]" : ""
                            }`}
                          />
                        </button>

                        {open ? (
                          <div className="border-t border-[var(--line)] bg-[var(--bg-soft)]/60 px-3 py-3 sm:px-4">
                            <ul className="space-y-2">
                              {sale.items.map((item) => (
                                <li
                                  key={`${sale.id}-${item.productId}`}
                                  className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]"
                                >
                                  <ProductThumb
                                    src={item.image}
                                    alt={item.name}
                                    size="sm"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[var(--ink)]">
                                      {item.name}
                                    </p>
                                    <p className="text-[11px] text-[var(--muted)]">
                                      {item.quantity} × {formatMoney(item.price)}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">
                                    {formatMoney(item.price * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-2.5">
                              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                Total
                              </span>
                              <span className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--navy)]">
                                {formatMoney(sale.total)}
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] text-[var(--muted)]">
                              {formatDate(sale.createdAt)}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--muted)]">
                  <Receipt size={26} className="opacity-60" />
                </span>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  Sin ventas en este período
                </p>
                <p className="max-w-xs text-xs text-[var(--muted)]">
                  Cambia el filtro de fecha o registra una venta en el punto de
                  venta.
                </p>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
