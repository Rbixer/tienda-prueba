"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getNavItems, isNavActive, type NavItem } from "@/lib/nav";

const PRIMARY_ORDER = [
  "/app",
  "/app/pos",
  "/app/inventario",
  "/app/reportes",
] as const;

const shortLabel: Record<string, string> = {
  Inventario: "Stock",
  Reportes: "Ventas",
  Sucursales: "Locales",
  Usuarios: "Equipo",
  Configuración: "Config",
  Bodega: "Bodega",
  Proveedores: "Proveed.",
};

function splitNav(items: NavItem[]) {
  const byHref = new Map(items.map((i) => [i.href, i]));
  const preferred = PRIMARY_ORDER.map((h) => byHref.get(h)).filter(
    (i): i is NavItem => !!i,
  );
  const rest = items.filter((i) => !PRIMARY_ORDER.includes(i.href as (typeof PRIMARY_ORDER)[number]));
  const ordered = [...preferred, ...rest];

  if (ordered.length <= 4) {
    return { primary: ordered, more: [] as NavItem[] };
  }
  return {
    primary: ordered.slice(0, 3),
    more: ordered.slice(3),
  };
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const items = getNavItems(session);
  const { primary, more } = splitNav(items);
  const [openMore, setOpenMore] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const moreActive = more.some((i) => isNavActive(pathname, i.href));
  const cols = primary.length + (more.length ? 1 : 0);

  useEffect(() => {
    setOpenMore(false);
  }, [pathname]);

  useEffect(() => {
    if (!openMore) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMore(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMore]);

  function go(href: string) {
    setOpenMore(false);
    router.push(href);
  }

  return (
    <>
      {openMore ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setOpenMore(false)}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Más módulos"
            className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" />
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Más módulos
            </p>
            <ul className="grid grid-cols-2 gap-2 pb-2">
              {more.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <li key={href}>
                    <button
                      type="button"
                      onClick={() => go(href)}
                      className={`flex w-full min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                        active
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "border-[var(--line)] bg-[var(--bg-soft)] text-[var(--ink)]"
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                        <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav className="app-shell__bottom z-50 shrink-0 border-t border-[var(--line)] bg-white md:hidden">
        <ul
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.max(cols, 1)}, minmax(0, 1fr))`,
          }}
        >
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
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
                  <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                    {shortLabel[label] ?? label}
                  </span>
                </Link>
              </li>
            );
          })}
          {more.length > 0 ? (
            <li className="min-w-0">
              <button
                type="button"
                aria-expanded={openMore}
                aria-haspopup="dialog"
                onClick={() => setOpenMore(true)}
                className={`flex w-full min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-[0.97] ${
                  moreActive || openMore
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted)]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    moreActive || openMore ? "bg-[var(--brand-soft)]" : ""
                  }`}
                >
                  <Ellipsis size={17} strokeWidth={moreActive ? 2.4 : 2} />
                </span>
                <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                  Más
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}
