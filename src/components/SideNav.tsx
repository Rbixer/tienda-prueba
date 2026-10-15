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
  const companyName = data.settings?.companyName?.trim() || "FARMACIA";
  const primary = items.filter((i) => !i.adminModule);
  const admin = items.filter((i) => i.adminModule);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-[var(--navy)] text-white shadow-[8px_0_30px_rgba(11,61,50,0.16)] transition-[width] duration-200 md:flex ${
        collapsed ? "w-[4.6rem]" : "w-60"
      }`}
    >
      {/* Ambient glow */}
      <span
        className="pointer-events-none absolute -left-20 top-24 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-20 bottom-32 h-40 w-40 rounded-full bg-white/4 blur-3xl"
        aria-hidden
      />

      {/* Brand + toggle */}
      <div
        className={`relative border-b border-white/10 pb-3 pt-4 ${
          collapsed ? "px-2" : "px-4"
        }`}
      >
        <div
          className={`flex items-center gap-2 ${
            collapsed ? "flex-col" : "justify-between"
          }`}
        >
          <CompanyBrand
            variant="dark"
            size="md"
            showName={!collapsed}
            className="min-w-0 [&_span:last-child]:truncate"
          />
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expandir menú" : "Compactar menú"}
            aria-label={collapsed ? "Expandir menú" : "Compactar menú"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav
        className={`relative flex flex-1 flex-col gap-5 overflow-y-auto py-4 ${
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

      {/* User + logout */}
      <div
        className={`relative border-t border-white/10 ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        <div
          className={`mb-2 flex items-center gap-2.5 rounded-xl bg-white/[0.06] ring-1 ring-white/10 ${
            collapsed ? "justify-center px-1 py-2" : "px-2.5 py-2"
          }`}
          title={`${session?.name ?? "Usuario"} · ${session?.role ?? ""}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white shadow-sm">
            {(session?.name?.[0] ?? "U").toUpperCase()}
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {session?.name ?? "Usuario"}
              </p>
              <p className="truncate text-[11px] capitalize text-white/50">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} />
          {!collapsed ? "Cerrar sesión" : null}
        </button>
        {!collapsed ? (
          <p className="mt-2 truncate px-1 text-center text-[10px] text-white/30">
            {companyName}
          </p>
        ) : null}
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
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
          {label}
        </p>
      ) : (
        <span className="mx-auto mb-1.5 block h-px w-6 bg-white/15" aria-hidden />
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
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
      className={`group relative flex items-center gap-3 rounded-xl text-sm font-medium transition ${
        collapsed ? "justify-center px-0 py-2" : "px-3 py-2.5"
      } ${
        active
          ? "bg-[#f4fbf7] text-[var(--navy)] shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active && !collapsed ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--brand)]"
          aria-hidden
        />
      ) : null}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
          active
            ? "bg-[var(--brand-soft)] text-[var(--brand)]"
            : "bg-white/[0.07] text-white/75 group-hover:bg-white/12"
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.4 : 2} />
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
