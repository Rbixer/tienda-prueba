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
  Configuración: "Config",
  Bodega: "Bodega",
};

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const items = getNavItems(session);
  // En móvil siempre scroll horizontal si hay más de 4, para que no se aplaste
  const scroll = items.length > 4;

  return (
    <nav className="app-shell__bottom z-50 shrink-0 border-t border-[var(--line)] bg-white md:hidden">
      <ul
        className={`bottom-nav-scroll w-full ${
          scroll
            ? "flex items-stretch gap-0.5 overflow-x-auto overscroll-x-contain px-1 py-0.5"
            : "grid"
        }`}
        style={
          scroll
            ? undefined
            : {
                gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
              }
        }
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          const text = scroll ? (shortLabel[label] ?? label) : label;
          return (
            <li
              key={href}
              className={scroll ? "w-[4.5rem] shrink-0" : "min-w-0"}
            >
              <Link
                href={href}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-[0.97] ${
                  active ? "text-[var(--brand)]" : "text-[var(--muted)]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    active ? "bg-[var(--brand-soft)]" : ""
                  }`}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="w-full truncate text-center text-[9px] font-semibold leading-tight">
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
