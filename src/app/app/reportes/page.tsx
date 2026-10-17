"use client";
import { useMemo, useState } from "react";
import {
  Boxes,
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
import { formatDate, formatMoney, isCashFloatLocked } from "@/lib/store";
import type { CashShift, Sale } from "@/lib/types";

type Period = "hoy" | "semana" | "mes" | "todo";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function matchesPeriod(iso: string, period: Period) {
  if (period === "todo") return true;
  const saleTime = new Date(iso).getTime();
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
      <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy)] via-[var(--navy-soft)] to-[#8a4b22] p-4 text-white shadow-[0_12px_30px_rgba(59,36,24,0.3)] ring-1 ring-white/10 sm:p-5">
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
        <p className="relative mt-4 break-words font-[family-name:var(--font-display)] text-[clamp(1.15rem,5vw,1.875rem)] font-bold leading-tight tracking-tight">
          {value}
        </p>
        {hint ? (
          <p className="relative mt-1.5 line-clamp-2 text-xs text-white/55">
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
      <p className="mt-4 break-words font-[family-name:var(--font-display)] text-[clamp(1.15rem,5vw,1.7rem)] font-bold leading-tight tracking-tight text-[var(--ink)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 line-clamp-2 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </section>
  );
}

function signedMoney(value: number) {
  const formatted = formatMoney(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export default function ReportesPage() {
  const { session, branchSales, currentBranchName, data, voidSale, returnSaleLine } =
    useAuth();
  const [period, setPeriod] = useState<Period>("hoy");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filtered = useMemo(
    () =>
      branchSales
        .filter((s) => matchesPeriod(s.createdAt, period))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [branchSales, period],
  );

  const activeSales = filtered.filter((sale) => sale.status !== "anulada");
  const total = activeSales.reduce((sum, s) => sum + s.total, 0);
  const tickets = activeSales.length;
  const itemsSold = activeSales.reduce(
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

  const cashShifts = useMemo(() => {
    const branchId = session?.branchId;
    return (data.cashShifts ?? [])
      .filter((shift) => !branchId || shift.branchId === branchId)
      .filter((shift) => matchesPeriod(shift.openedAt, period))
      .sort(
        (a, b) =>
          new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
      );
  }, [data.cashShifts, period, session?.branchId]);

  const shiftGroups = useMemo(() => {
    const map = new Map<string, { label: string; shifts: CashShift[] }>();
    for (const shift of cashShifts) {
      const key = String(startOfDay(new Date(shift.openedAt)));
      const entry = map.get(key);
      if (entry) entry.shifts.push(shift);
      else map.set(key, { label: dayLabel(shift.openedAt), shifts: [shift] });
    }
    return Array.from(map.values());
  }, [cashShifts]);

  const closedShifts = cashShifts.filter((shift) => shift.closedAt);
  const periodDifference = closedShifts.reduce(
    (sum, shift) => sum + (shift.difference ?? 0),
    0,
  );
  const floatLocked = isCashFloatLocked(data.settings);
  const baseAmount = floatLocked ? (data.settings.cashFloat ?? 0) : 0;

  async function onDownload() {
    setDownloading(true);
    try {
      await downloadSalesPdf({
        sales: activeSales,
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
      subtitle="Ventas y aperturas de caja"
    >
      <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-4">
        {/* Barra de control */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
          <div className="min-w-0 w-full sm:w-auto">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--slate-soft)] p-1 ring-1 ring-[var(--line)] sm:inline-flex">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`min-h-10 rounded-lg px-2.5 py-2 text-center text-xs font-semibold transition sm:min-h-0 sm:shrink-0 sm:px-4 sm:text-sm ${
                    period === p.id
                      ? "bg-[var(--navy)] text-white shadow-[0_2px_8px_rgba(59,36,24,0.25)]"
                      : "text-[var(--muted)] hover:text-[var(--navy)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
            <span className="text-center text-xs text-[var(--muted)] sm:hidden">
              {tickets} venta{tickets === 1 ? "" : "s"} · {periodLabel}
            </span>
            <span className="hidden text-xs text-[var(--muted)] lg:inline">
              {tickets} venta{tickets === 1 ? "" : "s"} · {periodLabel}
            </span>
            <button
              type="button"
              className={`${buttonSecondary} w-full sm:w-auto`}
              onClick={onDownload}
              disabled={downloading || activeSales.length === 0}
            >
              <Download size={16} />
              {downloading ? "Generando..." : "Descargar PDF"}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
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

        <Panel className="!p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                <Wallet size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight">
                  Aperturas de caja
                </h2>
                <p className="text-[11px] text-[var(--muted)]">
                  Cuota de cada apertura y su corte
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-[var(--bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
              {cashShifts.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {floatLocked ? "Cuota fija" : "Apertura"}
              </p>
              <p className="truncate text-sm font-bold tabular-nums">
                {floatLocked ? formatMoney(baseAmount) : "Libre"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Cortes
              </p>
              <p className="truncate text-sm font-bold tabular-nums">
                {closedShifts.length}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Diferencia
              </p>
              <p
                className={`truncate text-sm font-bold tabular-nums ${
                  periodDifference < 0
                    ? "text-red-700"
                    : periodDifference > 0
                      ? "text-[var(--brand)]"
                      : ""
                }`}
              >
                {signedMoney(periodDifference)}
              </p>
            </div>
          </div>

          <div className="max-h-[min(50dvh,28rem)] overflow-y-auto overscroll-y-contain px-2.5 py-3 sm:px-4">
            {shiftGroups.map((group) => (
              <section key={group.label} className="mb-4 last:mb-0">
                <div className="mb-2 flex min-w-0 items-center gap-2 px-0.5">
                  <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    {group.label}
                  </p>
                  <span className="h-px min-w-4 flex-1 bg-[var(--line)]" aria-hidden />
                </div>
                <ul className="space-y-2">
                  {group.shifts.map((shift) => {
                    const open = openShiftId === shift.id;
                    const closed = Boolean(shift.closedAt);
                    return (
                      <li
                        key={shift.id}
                        className={`overflow-hidden rounded-xl border bg-white transition ${
                          open
                            ? "border-[var(--navy)]/30 shadow-[0_6px_18px_rgba(59,36,24,0.12)]"
                            : "border-[var(--line)] hover:border-[var(--navy)]/25 hover:shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-2.5 py-3 text-left sm:gap-3 sm:px-4"
                          onClick={() =>
                            setOpenShiftId(open ? null : shift.id)
                          }
                          aria-expanded={open}
                        >
                          <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--slate-soft)] text-[10px] font-bold leading-none tracking-tight text-[var(--navy)] ring-1 ring-[var(--line)] sm:w-12 sm:text-[11px]">
                            {timeOnly(shift.openedAt)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="break-words font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[var(--ink)]">
                                {formatMoney(shift.openingAmount)}
                              </span>
                              <span
                                className={`text-[11px] font-semibold ${
                                  closed ? "text-[var(--muted)]" : "text-[var(--brand)]"
                                }`}
                              >
                                {closed ? "Cerrada" : "Abierta"}
                              </span>
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)]">
                              <User size={11} className="shrink-0" />
                              <span className="truncate">{shift.userName}</span>
                              {closed && shift.difference !== undefined ? (
                                <>
                                  <span className="shrink-0 opacity-50">·</span>
                                  <span className="shrink-0">
                                    Dif. {signedMoney(shift.difference)}
                                  </span>
                                </>
                              ) : null}
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
                          <div className="border-t border-[var(--line)] bg-[var(--bg-soft)]/60 px-2.5 py-3 sm:px-4">
                            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                  Apertura
                                </dt>
                                <dd className="text-sm font-semibold">
                                  {formatDate(shift.openedAt)}
                                </dd>
                              </div>
                              <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                  Fondo base
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums">
                                  {formatMoney(shift.openingAmount)}
                                </dd>
                              </div>
                              <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                  Cierre
                                </dt>
                                <dd className="text-sm font-semibold">
                                  {shift.closedAt
                                    ? formatDate(shift.closedAt)
                                    : "Día en curso"}
                                </dd>
                              </div>
                              {closed ? (
                                <>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Esperado
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {formatMoney(shift.expectedCash ?? 0)}
                                    </dd>
                                  </div>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Contado
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {formatMoney(shift.countedCash ?? 0)}
                                    </dd>
                                  </div>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Diferencia
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {signedMoney(shift.difference ?? 0)}
                                    </dd>
                                  </div>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Efectivo
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {formatMoney(shift.cashSales ?? 0)}
                                    </dd>
                                  </div>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Tarjeta
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {formatMoney(shift.cardTotal ?? 0)}
                                    </dd>
                                  </div>
                                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[var(--line)]">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      Transferencia
                                    </dt>
                                    <dd className="text-sm font-semibold tabular-nums">
                                      {formatMoney(shift.transferTotal ?? 0)}
                                    </dd>
                                  </div>
                                </>
                              ) : null}
                            </dl>
                            {shift.note ? (
                              <p className="mt-2 text-[11px] text-[var(--muted)]">
                                {shift.note}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {cashShifts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--muted)]">
                  <Wallet size={26} className="opacity-60" />
                </span>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  Sin aperturas en este período
                </p>
                <p className="max-w-xs text-xs text-[var(--muted)]">
                  Las aperturas y los cortes del día aparecen aquí.
                </p>
              </div>
            ) : null}
          </div>
        </Panel>

        {/* Detalle */}
        <Panel className="!p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--navy)]">
                <Receipt size={16} />
              </span>
              <div className="min-w-0">
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

          <div className="max-h-[min(70dvh,40rem)] overflow-y-auto overscroll-y-contain px-2.5 py-3 sm:px-4">
            {groups.map((group) => (
              <section key={group.label} className="mb-4 last:mb-0">
                <div className="mb-2 flex min-w-0 items-center gap-2 px-0.5">
                  <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    {group.label}
                  </p>
                  <span className="h-px min-w-4 flex-1 bg-[var(--line)]" aria-hidden />
                  <p className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--ink)]">
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
                            ? "border-[var(--navy)]/30 shadow-[0_6px_18px_rgba(59,36,24,0.12)]"
                            : "border-[var(--line)] hover:border-[var(--navy)]/25 hover:shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-2.5 py-3 text-left sm:gap-3 sm:px-4"
                          onClick={() => setOpenId(open ? null : sale.id)}
                          aria-expanded={open}
                        >
                          <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--slate-soft)] text-[10px] font-bold leading-none tracking-tight text-[var(--navy)] ring-1 ring-[var(--line)] sm:w-12 sm:text-[11px]">
                            {timeOnly(sale.createdAt)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="break-words font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[var(--ink)]">
                                {formatMoney(sale.total)}
                              </span>
                              {sale.status === "anulada" ? (
                                <span className="text-[11px] font-semibold text-red-700">
                                  Anulada
                                </span>
                              ) : null}
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
                          <div className="border-t border-[var(--line)] bg-[var(--bg-soft)]/60 px-2.5 py-3 sm:px-4">
                            {sale.status === "anulada" ? (
                              <p className="mb-2 text-xs font-semibold text-red-700">
                                Venta anulada
                              </p>
                            ) : (
                              <div className="mb-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={buttonSecondary}
                                  onClick={() => {
                                    const err = voidSale(sale.id);
                                    if (err) window.alert(err);
                                  }}
                                >
                                  Anular venta
                                </button>
                              </div>
                            )}
                            {sale.prescription ? (
                              <p className="mb-2 text-[11px] text-[var(--muted)]">
                                Receta {sale.prescription.number} ·{" "}
                                {sale.prescription.doctor} ·{" "}
                                {sale.prescription.patient}
                              </p>
                            ) : null}
                            {sale.customerName ? (
                              <p className="mb-2 text-[11px] text-[var(--muted)]">
                                {sale.customerName}
                                {sale.customerPhone ? ` · ${sale.customerPhone}` : ""}
                              </p>
                            ) : null}
                            <ul className="space-y-2">
                              {sale.items.map((item, index) => (
                                <li
                                  key={`${sale.id}-${index}`}
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
                                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--ink)]">
                                    {formatMoney(item.price * item.quantity)}
                                  </span>
                                  {sale.status !== "anulada" ? (
                                    <button
                                      type="button"
                                      className="text-[11px] font-semibold text-[var(--brand)]"
                                      onClick={() => {
                                        const err = returnSaleLine(sale.id, index);
                                        if (err) window.alert(err);
                                      }}
                                    >
                                      Devolver
                                    </button>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-2.5">
                              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                Total
                              </span>
                              <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[var(--navy)]">
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
