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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)] md:hidden"
      style={{
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingRight: "max(0px, env(safe-area-inset-right))",
        paddingBottom: "max(6px, env(safe-area-inset-bottom))",
      }}
    >
      <ul
        className="grid w-full items-stretch"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          const text = compact ? shortLabel[label] ?? label : label;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={`relative flex h-full min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-0.5 py-2 transition ${
                  active
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted)] active:bg-[var(--bg-soft)]"
                }`}
              >
                {active ? (
                  <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-[var(--brand)]" />
                ) : null}
                <Icon
                  size={compact ? 18 : 20}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                  className="shrink-0"
                />
                <span
                  className={`w-full truncate text-center leading-tight ${
                    compact ? "text-[9px]" : "text-[10px]"
                  } font-semibold tracking-tight`}
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
