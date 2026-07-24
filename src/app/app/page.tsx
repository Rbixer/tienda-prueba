"use client";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock,
  LineChart,
  Package,
  Receipt,
  ReceiptText,
  Scale,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BranchSalesChart } from "@/components/charts/BranchSalesChart";
import { DonutGauge } from "@/components/charts/DonutGauge";
import { ProfitLossPanel } from "@/components/charts/ProfitLossPanel";
import { HourlySalesChart } from "@/components/charts/HourlySalesChart";
import { MarginChart } from "@/components/charts/MarginChart";
import { ProductAnalysis } from "@/components/charts/ProductAnalysis";
import { SalesBarChart } from "@/components/charts/SalesBarChart";
import { SellerSalesChart } from "@/components/charts/SellerSalesChart";
import { TopProductsChart } from "@/components/charts/TopProductsChart";
import { ProductThumb } from "@/components/ProductThumb";
import { Panel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  analyzeProducts,
  lowStockProducts,
  marginByDay,
  percentChange,
  profitAndLoss,
  salesByBranch,
  salesByDay,
  salesByHour,
  salesBySeller,
  salesOnDay,
  sumSales,
  topProducts,
} from "@/lib/analytics";
import { formatDate, formatMoney, getCostPrice } from "@/lib/store";
import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "accent" | "success" | "navy";

const toneBadge: Record<Tone, string> = {
  brand: "bg-[var(--brand-soft)] text-[var(--brand)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  navy: "bg-[var(--bg-soft)] text-[var(--navy)]",
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  footer,
  trend,
  featured = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  footer?: ReactNode;
  trend?: { up: boolean; text: string };
  featured?: boolean;
}) {
  if (featured) {
    return (
      <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--brand-dark)]/20 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] p-3.5 text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)] sm:p-5 col-span-2 sm:col-span-1 xl:col-span-1">
        <span
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/75">
            {label}
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Icon size={18} />
          </span>
        </div>
        <p className="mt-4 truncate font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>
        {footer ? (
          <div className="mt-3 truncate text-xs text-white/70">{footer}</div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-3.5 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneBadge[tone]}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 truncate font-[family-name:var(--font-display)] text-[1.45rem] font-bold leading-none tracking-tight text-[var(--ink)] sm:text-[1.7rem]">
        {value}
      </p>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        {trend ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              trend.up
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-red-50 text-[var(--danger)]"
            }`}
          >
            {trend.up ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {trend.text}
          </span>
        ) : null}
        {footer ? (
          <span className="truncate text-xs text-[var(--muted)]">{footer}</span>
        ) : null}
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--navy)]">
          <Icon size={16} />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight">
            {title}
          </h2>
          {hint ? (
            <p className="text-[11px] text-[var(--muted)]">{hint}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  const { session, branchProducts, branchSales, currentBranchName, data } =
    useAuth();
  const isAdmin = session?.role === "administrador";

  const stats = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const todaySales = salesOnDay(branchSales, now);
    const yesterdaySales = salesOnDay(branchSales, yesterday);
    const todayTotal = sumSales(todaySales);
    const yesterdayTotal = sumSales(yesterdaySales);
    const change = percentChange(todayTotal, yesterdayTotal);
    const weekDays = salesByDay(branchSales, 7);
    const weekStart = weekDays[0].date.getTime();
    const weekSales = branchSales.filter(
      (s) => new Date(s.createdAt).getTime() >= weekStart,
    );
    const weekTotal = sumSales(weekSales);
    const avgTicket =
      todaySales.length > 0 ? todayTotal / todaySales.length : 0;
    const myToday = todaySales.filter((s) => s.userId === session?.userId);
    const myTodayTotal = sumSales(myToday);
    const imageById = new Map(branchProducts.map((p) => [p.id, p.image]));
    const tops = topProducts(weekSales, 5).map((t) => ({
      ...t,
      image: t.image || imageById.get(t.productId),
    }));
    const lowStock = lowStockProducts(branchProducts, 5);
    const stockValue = branchProducts.reduce(
      (sum, p) => sum + getCostPrice(p) * p.quantity,
      0,
    );
    const insights = isAdmin
      ? analyzeProducts(branchProducts, weekSales, getCostPrice)
      : [];
    const sellers = isAdmin ? salesBySeller(weekSales) : [];
    const hours = isAdmin ? salesByHour(todaySales) : [];
    const margins = isAdmin
      ? marginByDay(weekSales, branchProducts, 7, getCostPrice)
      : [];
    const weekProfit = margins.reduce((s, m) => s + m.profit, 0);
    const pnl = profitAndLoss(weekSales, branchProducts, getCostPrice);
    const allWeekSales = isAdmin
      ? data.sales.filter(
          (s) => new Date(s.createdAt).getTime() >= weekStart,
        )
      : [];
    const branchStats = isAdmin
      ? salesByBranch(
          allWeekSales,
          data.branches,
          data.products,
          getCostPrice,
        )
      : [];
    const recentSales = branchSales.slice(0, 5);
    const maxTopQty = Math.max(...tops.map((t) => t.quantity), 1);
    const soldShare =
      !isAdmin || branchProducts.length === 0
        ? 0
        : Math.round(
            (insights.filter((i) => i.quantitySold > 0).length /
              branchProducts.length) *
              100,
          );
    const strongShare =
      !isAdmin || branchProducts.length === 0
        ? 0
        : Math.round(
            (insights.filter((i) => i.status === "strong").length /
              branchProducts.length) *
              100,
          );
    const discardShare =
      !isAdmin || branchProducts.length === 0
        ? 0
        : Math.round(
            (insights.filter(
              (i) => i.status === "dead" || i.status === "weak",
            ).length /
              branchProducts.length) *
              100,
          );

    return {
      todaySales,
      todayTotal,
      yesterdayTotal,
      change,
      changeUp: change >= 0,
      weekDays,
      weekTotal,
      avgTicket,
      myToday,
      myTodayTotal,
      tops,
      lowStock,
      stockValue,
      insights,
      sellers,
      hours,
      margins,
      weekProfit,
      pnl,
      branchStats,
      recentSales,
      maxTopQty,
      soldShare,
      strongShare,
      discardShare,
      imageById,
      trendText: `${Math.abs(change).toFixed(0)}% vs ayer`,
    };
  }, [
    branchProducts,
    branchSales,
    data.branches,
    data.products,
    data.sales,
    isAdmin,
    session?.userId,
  ]);

  const {
    todaySales,
    todayTotal,
    yesterdayTotal,
    changeUp,
    weekDays,
    weekTotal,
    avgTicket,
    myToday,
    myTodayTotal,
    tops,
    lowStock,
    stockValue,
    insights,
    sellers,
    hours,
    margins,
    weekProfit,
    pnl,
    branchStats,
    recentSales,
    maxTopQty,
    soldShare,
    strongShare,
    discardShare,
    imageById,
    trendText,
  } = stats;

  const topProductsList = (
    <ul className="space-y-2.5">
      {tops.map((item, idx) => (
        <li key={item.productId} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--bg-soft)] text-[11px] font-bold text-[var(--muted)]">
            {idx + 1}
          </span>
          <ProductThumb src={item.image} alt={item.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="shrink-0 text-sm font-semibold text-[var(--brand)]">
                {formatMoney(item.revenue)}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand)]"
                style={{
                  width: `${Math.max(8, (item.quantity / maxTopQty) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {item.quantity} vendidos
            </p>
          </div>
        </li>
      ))}
    </ul>
  );

  const recentSalesList = (
    <div className="space-y-2">
      {recentSales.map((sale) => (
        <div
          key={sale.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]/60 px-3 py-2.5 transition hover:bg-[var(--bg-soft)]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <ProductThumb
              src={
                sale.items[0]?.image ||
                imageById.get(sale.items[0]?.productId ?? "")
              }
              alt={sale.items[0]?.name ?? "Venta"}
              size="sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--brand)]">
                {formatMoney(sale.total)}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {sale.userName} · {formatDate(sale.createdAt)}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
            {sale.items.reduce((n, i) => n + i.quantity, 0)} ítems
          </span>
        </div>
      ))}
    </div>
  );

  const quickActions = (
    <>
      <Link
        href="/app/pos"
        className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[var(--navy)] to-[var(--navy-soft)] px-4 py-4 text-white shadow-sm transition hover:shadow-md"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition group-hover:bg-white/20">
          <ShoppingCart size={20} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Abrir POS</span>
          <span className="block text-sm text-white/65">Cobrar ventas</span>
        </span>
        <ArrowRight
          size={18}
          className="text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white"
        />
      </Link>
      <Link
        href="/app/inventario"
        className="group card flex items-center gap-3 px-4 py-4 transition hover:border-[var(--brand)] hover:shadow-md"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Package size={20} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Inventario</span>
          <span className="block text-sm text-[var(--muted)]">
            {branchProducts.length} productos
          </span>
        </span>
        <ArrowRight
          size={18}
          className="text-[var(--muted)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]"
        />
      </Link>
    </>
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        isAdmin
          ? `${currentBranchName} · análisis completo`
          : `${currentBranchName} · resumen del día`
      }
    >
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 sm:gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <StatCard
            label="Ingresos hoy"
            value={formatMoney(todayTotal)}
            icon={TrendingUp}
            tone="accent"
            trend={{ up: changeUp, text: trendText }}
            footer={formatMoney(yesterdayTotal)}
          />
          <StatCard
            label="Valor inventario"
            value={formatMoney(stockValue)}
            icon={Boxes}
            tone="navy"
            footer={
              isAdmin
                ? `${branchProducts.length} prod. · margen ${formatMoney(weekProfit)}`
                : `${branchProducts.length} productos`
            }
          />
          <StatCard
            label="Ticket promedio"
            value={formatMoney(avgTicket)}
            icon={Receipt}
            tone="brand"
            footer={`${todaySales.length} tickets hoy`}
          />
          <StatCard
            label={isAdmin ? "Ventas semana" : "Mis ventas hoy"}
            value={isAdmin ? formatMoney(weekTotal) : formatMoney(myTodayTotal)}
            icon={Wallet}
            featured
            footer={
              isAdmin
                ? `Hoy ${formatMoney(todayTotal)} · mis ventas ${formatMoney(myTodayTotal)}`
                : `${myToday.length} tickets míos hoy`
            }
          />
        </div>

        {/* Ganancia y pérdida del inventario frente a las ventas */}
        <Panel>
          <SectionHeader
            icon={Scale}
            title="Ganancia y pérdida"
            hint={`Inventario vs ventas · ${currentBranchName}`}
          />
          <ProfitLossPanel summary={pnl} />
        </Panel>

        {isAdmin ? (
          <>
            <Panel>
              <SectionHeader
                icon={Store}
                title="Ventas por sucursal"
                hint="Comparativa de los últimos 7 días"
              />
              <BranchSalesChart branches={branchStats} />
            </Panel>

            <div className="grid gap-3 lg:grid-cols-5">
              <Panel className="min-w-0 lg:col-span-3">
                <SectionHeader
                  icon={LineChart}
                  title="Ventas de la semana"
                  hint="Últimos 7 días"
                />
                <SalesBarChart days={weekDays} />
              </Panel>
              <Panel className="min-w-0 lg:col-span-2">
                <SectionHeader
                  icon={Sparkles}
                  title="Salud del catálogo"
                  hint="Rotación de productos"
                />
                <div className="flex flex-wrap items-start justify-around gap-2 pt-1 sm:gap-3">
                  <DonutGauge
                    label="Con ventas"
                    value={soldShare}
                    percent={soldShare}
                    color="#22c55e"
                  />
                  <DonutGauge
                    label="Alto volumen"
                    value={strongShare}
                    percent={strongShare}
                    color="#2563eb"
                  />
                  <DonutGauge
                    label="A descartar"
                    value={discardShare}
                    percent={discardShare}
                    color="#eab308"
                  />
                </div>
              </Panel>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <Panel className="min-w-0 lg:col-span-3">
                <SectionHeader
                  icon={Trophy}
                  title="Top productos"
                  hint="Más vendidos esta semana"
                />
                <TopProductsChart products={tops} />
              </Panel>
              <Panel className="min-w-0 lg:col-span-2">
                <SectionHeader
                  icon={Clock}
                  title="Ventas por hora"
                  hint="Actividad de hoy"
                />
                <HourlySalesChart hours={hours} />
              </Panel>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Panel>
                <SectionHeader
                  icon={Users}
                  title="Ventas por vendedor"
                  hint="Comparativa semanal"
                />
                <SellerSalesChart sellers={sellers} />
              </Panel>
              <Panel>
                <SectionHeader
                  icon={TrendingUp}
                  title="Margen por día"
                  hint="Ganancia estimada"
                />
                <MarginChart points={margins} />
              </Panel>
            </div>

            <Panel>
              <SectionHeader
                icon={Package}
                title="Análisis de productos"
                hint="Recomendaciones por rotación"
              />
              <ProductAnalysis insights={insights} />
            </Panel>
          </>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <SectionHeader
                icon={Trophy}
                title="Top productos"
                hint="Más vendidos esta semana"
              />
              {tops.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  Aún no hay ventas esta semana.
                </p>
              ) : (
                topProductsList
              )}
            </Panel>

            <Panel>
              <SectionHeader
                icon={ReceiptText}
                title="Últimas ventas"
                action={
                  <Link
                    href="/app/reportes"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)] hover:underline"
                  >
                    Reportes <ArrowRight size={14} />
                  </Link>
                }
              />
              {recentSales.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  No hay ventas registradas.
                </p>
              ) : (
                recentSalesList
              )}
            </Panel>
          </div>
        )}

        {lowStock.length > 0 ? (
          <Panel>
            <SectionHeader
              icon={Package}
              title={`Stock bajo · ${lowStock.length}`}
              hint="Productos por reponer"
            />
            <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
              {lowStock.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex w-[9.5rem] shrink-0 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2.5"
                >
                  <ProductThumb src={p.image} alt={p.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs font-semibold text-[var(--accent)]">
                      {p.quantity} und
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {isAdmin ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <SectionHeader
                icon={ReceiptText}
                title="Últimas ventas"
                action={
                  <Link
                    href="/app/reportes"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)] hover:underline"
                  >
                    Reportes <ArrowRight size={14} />
                  </Link>
                }
              />
              {recentSales.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  No hay ventas registradas.
                </p>
              ) : (
                recentSalesList
              )}
            </Panel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {quickActions}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{quickActions}</div>
        )}
      </div>
    </AppShell>
  );
}
