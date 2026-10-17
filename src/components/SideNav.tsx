"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { useAuth } from "@/context/AuthContext";
import { getNavItems, isNavActive } from "@/lib/nav";

export function SideNav({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, data } = useAuth();
  const items = getNavItems(session);
  const companyName = data.settings?.companyName?.trim() || "TIENDA";
  const slogan = data.settings?.slogan?.trim();
  const primary = items.filter((i) => !i.adminModule);
  const admin = items.filter((i) => i.adminModule);
  const shiftOpen = (data.cashShifts ?? []).some(
    (shift) => shift.branchId === session?.branchId && !shift.closedAt,
  );

  return (
    <aside
      className={`fixed top-3 bottom-3 left-3 z-40 hidden text-white transition-[width] duration-200 md:block ${
        collapsed ? "w-[4.6rem]" : "w-60"
      }`}
    >
      <div className="side-rail absolute inset-0 overflow-hidden rounded-[1.6rem]">
        <span className="side-rail__mesh pointer-events-none absolute inset-0" aria-hidden />
        <span
          className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-amber-200/20 blur-3xl"
          aria-hidden
        />
        <span
          className="side-rail__filament pointer-events-none absolute top-8 bottom-8 right-0 w-px"
          aria-hidden
        />
      </div>
      <div className="relative flex h-full min-h-0 flex-col">

      <div className={`relative ${collapsed ? "px-2 pt-4" : "px-4 pt-5"}`}>
        <div className={`flex gap-3 ${collapsed ? "flex-col items-center" : "items-start"}`}>
          <CompanyBrand
            variant="dark"
            size="md"
            showName={false}
            className="[&>span]:bg-white/10 [&>span]:shadow-[0_8px_20px_rgba(0,0,0,0.18)] [&>span]:ring-white/20"
          />
          {!collapsed ? (
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate font-[family-name:var(--font-display)] text-[1.05rem] font-semibold leading-tight tracking-tight">
                {companyName}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-amber-100/55">
                {slogan || "Mostrador"}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expandir menú" : "Compactar menú"}
            aria-label={collapsed ? "Expandir menú" : "Compactar menú"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white ${
              collapsed ? "" : "-mr-1"
            }`}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>

        <div
          className={`mt-4 flex items-center gap-2 rounded-full bg-black/20 ring-1 ring-white/10 ${
            collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1.5"
          }`}
          title={shiftOpen ? "Caja abierta" : "Caja cerrada"}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              shiftOpen
                ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]"
                : "bg-amber-300"
            }`}
            aria-hidden
          />
          {!collapsed ? (
            <span className="truncate text-[11px] font-medium tracking-wide text-white/75">
              {shiftOpen ? "Caja abierta" : "Caja cerrada"}
            </span>
          ) : null}
        </div>
      </div>

      <nav
        className={`relative mt-4 flex flex-1 flex-col gap-5 overflow-y-auto pb-4 ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        <NavGroup label="Principal" collapsed={collapsed}>
          {primary.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isNavActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </NavGroup>

        {admin.length > 0 ? (
          <NavGroup label="Administración" collapsed={collapsed}>
            {admin.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </NavGroup>
        ) : null}
      </nav>

      <div className={`relative ${collapsed ? "p-2" : "p-3"}`}>
        <div
          className={`flex items-center gap-2.5 rounded-2xl bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-sm ${
            collapsed ? "justify-center px-1 py-2" : "px-2.5 py-2.5"
          }`}
          title={`${session?.name ?? "Usuario"} · ${session?.role ?? ""}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-500 text-xs font-bold text-[#3b2418] shadow-[0_6px_16px_rgba(0,0,0,0.25)]">
            {(session?.name?.[0] ?? "U").toUpperCase()}
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {session?.name ?? "Usuario"}
              </p>
              <p className="truncate text-[11px] capitalize text-amber-100/55">
                {session?.role ?? ""}
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          title="Cerrar sesión"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white ${
            collapsed ? "px-0 py-2.5" : "px-3 py-2.5"
          }`}
        >
          <LogOut size={16} />
          {!collapsed ? "Cerrar sesión" : null}
        </button>
      </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {!collapsed ? (
        <p className="mb-2 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100/40">
          <span className="h-px flex-1 bg-white/10" aria-hidden />
          {label}
          <span className="h-px w-3 bg-white/10" aria-hidden />
        </p>
      ) : (
        <span className="mx-auto mb-2 block h-px w-5 bg-white/15" aria-hidden />
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center rounded-2xl text-sm font-medium transition duration-200 ${
        collapsed ? "justify-center px-0 py-2" : "gap-3 px-2 py-2"
      } ${
        active
          ? "bg-[#fff6ec] text-[#3b2418] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
          active
            ? "bg-[#e06a1f] text-white shadow-[0_4px_10px_rgba(224,106,31,0.4)]"
            : "text-amber-50/80 group-hover:text-white"
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.4 : 2} />
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
