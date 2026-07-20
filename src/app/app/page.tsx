"use client";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SalesBarChart } from "@/components/charts/SalesBarChart";
import { TopProductsChart } from "@/components/charts/TopProductsChart";
import { Panel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  lowStockProducts,
  percentChange,
  salesByDay,
  salesOnDay,
  sumSales,
  topProducts,
} from "@/lib/analytics";
import { formatDate, formatMoney, getCostPrice } from "@/lib/store";

export default function HomePage() {
  const { session, branchProducts, branchSales, currentBranchName } =
    useAuth();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const todaySales = salesOnDay(branchSales, now);
  const yesterdaySales = salesOnDay(branchSales, yesterday);
  const todayTotal = sumSales(todaySales);
  const yesterdayTotal = sumSales(yesterdaySales);
  const change = percentChange(todayTotal, yesterdayTotal);
  const weekDays = salesByDay(branchSales, 7);
  const weekSales = branchSales.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    return t >= weekDays[0].date.getTime();
  });
  const weekTotal = sumSales(weekSales);
  const avgTicket =
    todaySales.length > 0 ? todayTotal / todaySales.length : 0;
  const myToday = todaySales.filter((s) => s.userId === session?.userId);
  const myTodayTotal = sumSales(myToday);
  const tops = topProducts(weekSales, 5);
  const lowStock = lowStockProducts(branchProducts, 5);
  const stockValue = branchProducts.reduce(
    (sum, p) => sum + getCostPrice(p) * p.quantity,
    0,
  );
  const recentSales = branchSales.slice(0, 6);
  const changeUp = change >= 0;

  return (
    <AppShell
      title={`Hola, ${session?.name.split(" ")[0] ?? ""}`}
      subtitle={`${currentBranchName} · resumen en vivo`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Panel className="glass-dark relative overflow-hidden rounded-3xl p-5">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-cyan-300/30 blur-2xl"
            aria-hidden
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
            Ingresos de hoy
          </p>
          <p className="relative mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            {formatMoney(todayTotal)}
          </p>
          <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
            <span>
              {todaySales.length} ticket
              {todaySales.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md">
              {changeUp ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {Math.abs(change).toFixed(0)}% vs ayer
            </span>
            <span className="text-white/60">
              Ayer {formatMoney(yesterdayTotal)}
            </span>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "7 días", value: formatMoney(weekTotal), hint: `${weekSales.length} ventas` },
            { label: "Ticket prom.", value: formatMoney(avgTicket), hint: "Del día" },
            { label: "Mis ventas", value: formatMoney(myTodayTotal), hint: `${myToday.length} tickets` },
            { label: "Inventario", value: formatMoney(stockValue), hint: `${branchProducts.length} SKU` },
          ].map((kpi) => (
            <Panel key={kpi.label} className="rounded-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {kpi.label}
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--brand)] sm:text-2xl">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{kpi.hint}</p>
            </Panel>
          ))}
        </div>

        <div className="grid min-h-0 gap-3 lg:grid-cols-5">
          <Panel className="rounded-3xl lg:col-span-3">
            <SalesBarChart days={weekDays} />
          </Panel>
          <Panel className="rounded-3xl lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#14b8a6,#22d3ee)] text-white">
                <TrendingUp size={15} />
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                  Más vendidos
                </h2>
                <p className="text-[11px] text-[var(--muted)]">Últimos 7 días</p>
              </div>
            </div>
            <TopProductsChart products={tops} />
          </Panel>
        </div>

        {lowStock.length > 0 ? (
          <Panel className="rounded-3xl border-amber-200/50 bg-gradient-to-br from-amber-50/70 to-white/40">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-700" />
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-amber-950">
                Stock bajo
              </h2>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {lowStock.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {lowStock.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="min-w-[8.5rem] shrink-0 rounded-2xl border border-white/70 bg-white/60 px-3 py-2.5 backdrop-blur-md"
                >
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    {p.quantity} en stock
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/app/pos"
            className="flex items-center gap-3 rounded-3xl bg-[linear-gradient(135deg,#0f766e,#14b8a6,#22d3ee)] px-4 py-4 text-white shadow-[0_16px_40px_rgba(15,118,110,0.3)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <ShoppingCart size={20} />
            </span>
            <span>
              <span className="block font-semibold">Abrir POS</span>
              <span className="block text-sm text-white/75">Cobrar y escanear</span>
            </span>
          </Link>
          <Link
            href="/app/inventario"
            className="glass flex items-center gap-3 rounded-3xl px-4 py-4 transition hover:bg-white/70 active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14b8a6,#22d3ee)] text-white">
              <Package size={20} />
            </span>
            <span>
              <span className="block font-semibold">Inventario</span>
              <span className="block text-sm text-[var(--muted)]">
                {branchProducts.length} productos
              </span>
            </span>
          </Link>
        </div>

        <Panel className="rounded-3xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Últimas ventas
            </h2>
            <Link
              href="/app/reportes"
              className="text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Ver reportes
            </Link>
          </div>
          <div className="space-y-2">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/40 px-3 py-2.5 backdrop-blur-md"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--brand)]">
                    {formatMoney(sale.total)}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {sale.userName} · {formatDate(sale.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {sale.items.reduce((n, i) => n + i.quantity, 0)} ítems
                </span>
              </div>
            ))}
            {recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                Sin ventas aún.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
