"use client";
import Link from "next/link";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatMoney, getCostPrice } from "@/lib/store";
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export default function HomePage() {
  const {
    session,
    branchProducts,
    branchSales,
    currentBranchName,
    data,
  } = useAuth();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const todaySales = branchSales.filter((s) =>
    isSameDay(new Date(s.createdAt), now),
  );
  const weekSales = branchSales.filter(
    (s) => new Date(s.createdAt).getTime() >= weekAgo.getTime(),
  );
  const myTodaySales = todaySales.filter((s) => s.userId === session?.userId);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const weekTotal = weekSales.reduce((sum, s) => sum + s.total, 0);
  const myTodayTotal = myTodaySales.reduce((sum, s) => sum + s.total, 0);
  const avgTicket =
    todaySales.length > 0 ? todayTotal / todaySales.length : 0;
  const lowStock = branchProducts.filter((p) => p.quantity <= 5).length;
  const stockValue = branchProducts.reduce(
    (sum, p) => sum + getCostPrice(p) * p.quantity,
    0,
  );
  const recentSales = branchSales.slice(0, 5);
  const links = [
    {
      href: "/app/pos",
      title: "Abrir POS",
      desc: "Cobrar ventas sin facturación",
      icon: ShoppingCart,
    },
    {
      href: "/app/inventario",
      title: "Inventario",
      desc: "Alta, listado y PDF",
      icon: Package,
    },
    {
      href: "/app/reportes",
      title: "Reportes",
      desc: "Consulta ventas realizadas",
      icon: BarChart3,
    },
    ...(session?.role === "administrador"
      ? [
          {
            href: "/app/sucursales",
            title: "Sucursales",
            desc: "Administra las 3 ubicaciones",
            icon: Store,
          },
          {
            href: "/app/usuarios",
            title: "Usuarios",
            desc: "Crea admin y vendedores",
            icon: Users,
          },
        ]
      : []),
  ];
  return (
    <AppShell
      title={`Hola, ${session?.name.split(" ")[0] ?? ""}`}
      subtitle={`Dashboard de ${currentBranchName}. Resumen de ingresos e inventario.`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Wallet size={18} className="text-[var(--brand)]" />
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Ingresos
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Panel className="col-span-2 bg-[var(--brand)] text-white xl:col-span-1">
            <p className="text-xs uppercase tracking-wide text-white/75">
              Ingresos hoy
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">
              {formatMoney(todayTotal)}
            </p>
            <p className="mt-1 text-sm text-white/80">
              {todaySales.length} ticket
              {todaySales.length === 1 ? "" : "s"}
            </p>
          </Panel>
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Últimos 7 días
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--brand)] sm:text-2xl">
              {formatMoney(weekTotal)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {weekSales.length} ventas
            </p>
          </Panel>
          <Panel>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Mis ventas hoy
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold sm:text-2xl">
              {formatMoney(myTodayTotal)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {myTodaySales.length} ticket
              {myTodaySales.length === 1 ? "" : "s"} tuyos
            </p>
          </Panel>
          <Panel>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]">
              <TrendingUp size={12} />
              Ticket promedio
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold sm:text-2xl">
              {formatMoney(avgTicket)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">Del día de hoy</p>
          </Panel>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Productos
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {branchProducts.length}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {lowStock > 0
              ? `${lowStock} con stock bajo`
              : "Stock en buen nivel"}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Valor inventario (costo)
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {formatMoney(stockValue)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Según precios actuales
          </p>
        </Panel>
      </div>
      <Panel className="min-h-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Últimas ventas
          </h2>
          <Link
            href="/app/reportes"
            className="text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Ver reportes
          </Link>
        </div>
        <div className="space-y-2">
          {recentSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-soft)] px-3 py-2.5"
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
              Aún no hay ventas en esta sucursal. Usa el POS para registrar la
              primera.
            </p>
          ) : null}
        </div>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[0_12px_30px_rgba(31,107,79,0.12)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:bg-[var(--brand)] group-hover:text-white">
              <Icon size={20} />
            </span>
            <span>
              <span className="block font-semibold text-[var(--ink)]">
                {title}
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
      {session?.role === "administrador" ? (
        <Panel>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Red de sucursales
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.branches.map((branch) => {
              const count = data.products.filter(
                (p) => p.branchId === branch.id,
              ).length;
              const active = session.branchId === branch.id;
              return (
                <div
                  key={branch.id}
                  className={`rounded-xl border px-3 py-3 ${
                    active
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--line)] bg-[var(--bg-soft)]"
                  }`}
                >
                  <p className="font-medium">{branch.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {branch.address}
                  </p>
                  <p className="mt-2 text-sm text-[var(--brand)]">
                    {count} productos
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}
      </div>
    </AppShell>
  );
}
