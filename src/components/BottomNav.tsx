"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getNavItems, isNavActive } from "@/lib/nav";

const shortLabel: Record<string, string> = {
  Inventario: "Stock",
  Reportes: "Ventas",
  Sucursales: "Locales",
  Usuarios: "Equipo",
};

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const items = getNavItems(session?.role);
  const compact = items.length > 4;
  return (
    <nav
      className="fixed inset-x-2 bottom-2 z-50 rounded-2xl glass-strong md:hidden"
      style={{
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingRight: "max(0px, env(safe-area-inset-right))",
        paddingBottom: "max(4px, env(safe-area-inset-bottom))",
      }}
    >
      <ul
        className="grid w-full items-stretch"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          const text = compact ? (shortLabel[label] ?? label) : label;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={`relative flex h-full min-h-[3.4rem] flex-col items-center justify-center gap-0.5 px-0.5 py-2 transition ${
                  active
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted)] active:bg-white/30"
                }`}
              >
                {active ? (
                  <span className="absolute inset-x-3 top-1 h-1 rounded-full bg-[linear-gradient(90deg,#14b8a6,#22d3ee)]" />
                ) : null}
                <Icon
                  size={compact ? 18 : 20}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                  className="shrink-0"
                />
                <span
                  className={`w-full truncate text-center font-semibold tracking-tight leading-tight ${
                    compact ? "text-[9px]" : "text-[10px]"
                  }`}
                >
                  {text}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
