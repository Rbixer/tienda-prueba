"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MapPin, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getNavItems, isNavActive } from "@/lib/nav";
export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, currentBranchName } = useAuth();
  const items = getNavItems(session?.role);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--line)] bg-[var(--surface)] md:flex">
      <div className="border-b border-[var(--line)] px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
            <Store size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--brand)]">
              MI BARRIO
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              Sistema de gestión
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-xs text-[var(--muted)]">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          <span>
            <span className="block font-medium text-[var(--ink)]">
              {currentBranchName}
            </span>
            <span className="capitalize">{session?.role}</span>
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--brand)] text-white shadow-sm shadow-[var(--brand)]/25"
                  : "text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--line)] p-3">
        <p className="mb-2 truncate px-2 text-xs text-[var(--muted)]">
          {session?.name}
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
