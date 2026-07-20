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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col p-3 md:flex">
      <div className="glass-dark flex h-full flex-col overflow-hidden rounded-3xl">
        <div className="border-b border-white/15 px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner">
              <Store size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                MI BARRIO
              </p>
              <p className="truncate text-xs text-white/60">Liquid commerce</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-1.5 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/75">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span>
              <span className="block font-medium text-white">
                {currentBranchName}
              </span>
              <span className="capitalize">{session?.role}</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-[var(--brand-dark)] shadow-lg shadow-black/10"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/15 p-3">
          <p className="mb-2 truncate px-2 text-xs text-white/55">
            {session?.name}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
