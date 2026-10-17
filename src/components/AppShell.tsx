"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { AlertsButton } from "@/components/AlertsButton";
import { CashShiftPrompt } from "@/components/CashShiftPrompt";
import { BottomNav } from "@/components/BottomNav";
import { CompanyBrand } from "@/components/CompanyBrand";
import { SideNav } from "@/components/SideNav";

function ProfileMenu({
  compact = false,
  name,
  role,
  companyName,
  canConfig,
  onConfig,
  onLogout,
}: {
  compact?: boolean;
  name: string;
  role: string;
  companyName?: string;
  canConfig: boolean;
  onConfig: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className={
          compact
            ? "flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-soft)] p-1 pr-1.5"
            : "flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-1.5 transition hover:border-[var(--brand)]/40 hover:bg-white"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">
          {(name[0] ?? "U").toUpperCase()}
        </span>
        {!compact ? (
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-semibold">
              Hola, {name.split(" ")[0]}
            </p>
            <p className="truncate text-[10px] capitalize text-[var(--muted)]">
              {role}
            </p>
          </div>
        ) : null}
        <ChevronDown
          size={14}
          className={`text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
        >
          {compact ? (
            <div className="border-b border-[var(--line)] px-3 py-2">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="truncate text-[10px] capitalize text-[var(--muted)]">
                {role}
                {companyName ? ` · ${companyName}` : ""}
              </p>
            </div>
          ) : null}
          {canConfig ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--bg-soft)]"
              onClick={() => {
                setOpen(false);
                onConfig();
              }}
            >
              <Settings size={16} className="text-[var(--brand)]" />
              Configuración
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const {
    ready,
    session,
    logout,
    syncError,
    isOnline,
    pendingSync,
    pendingOfflineCount,
    offlineConflicts,
    lastFlushReport,
    flushSync,
    retryOfflineSale,
    discardOfflineSale,
    data,
  } = useAuth();
  const companyName = data.settings?.companyName?.trim() || "TIENDA";
  const canConfig = hasPermission(session, "configuracion");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [showConflictDetail, setShowConflictDetail] = useState(true);

  useEffect(() => {
    setNavCollapsed(localStorage.getItem("tb-nav-collapsed") === "1");
  }, []);

  function toggleNavCollapsed() {
    setNavCollapsed((v) => {
      const next = !v;
      localStorage.setItem("tb-nav-collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    if (ready && !session) {
      router.replace(
        `/login?next=${encodeURIComponent(window.location.pathname || "/app")}`,
      );
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--brand)]/20" />
      </div>
    );
  }

  function goConfig() {
    router.push("/app/configuracion");
  }

  function doLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="app-shell flex bg-[var(--bg)] text-[var(--ink)]">
      <SideNav collapsed={navCollapsed} onToggleCollapsed={toggleNavCollapsed} />
      <div
        className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
          navCollapsed ? "md:pl-[calc(4.6rem+1.5rem)]" : "md:pl-[calc(15rem+1.5rem)]"
        }`}
      >
        <header className="app-shell__header z-30 shrink-0 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
          {/* Móvil */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 md:hidden">
            <CompanyBrand variant="light" size="sm" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-[family-name:var(--font-display)] text-[1.05rem] font-semibold leading-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <ProfileMenu
              compact
              name={session.name}
              role={session.role}
              companyName={companyName}
              canConfig={canConfig}
              onConfig={goConfig}
              onLogout={doLogout}
            />
          </div>

          {/* Desktop */}
          <div className="hidden items-center justify-between gap-3 px-5 py-3 md:flex">
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ProfileMenu
                name={session.name}
                role={session.role}
                canConfig={canConfig}
                onConfig={goConfig}
                onLogout={doLogout}
              />
            </div>
          </div>
        </header>

        <main className="app-shell__main flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 pb-5 pt-3 sm:px-5 md:pb-5 md:pt-4">
          {!isOnline ? (
            <div className="mb-3 shrink-0 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-800">
              Sin conexión · el POS puede vender; los cambios se suben al
              reconectar
              {pendingOfflineCount > 0
                ? ` · ${pendingOfflineCount} venta(s) pendiente(s)`
                : ""}
            </div>
          ) : offlineConflicts.length > 0 ? (
            <div className="mb-3 shrink-0 space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {offlineConflicts.length} venta(s) con conflicto de stock
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-rose-800 px-2.5 py-1 font-semibold text-white"
                    onClick={() => void flushSync()}
                  >
                    Reintentar todas
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-rose-300 px-2.5 py-1 font-medium"
                    onClick={() => setShowConflictDetail((v) => !v)}
                  >
                    {showConflictDetail ? "Ocultar" : "Detalle"}
                  </button>
                </div>
              </div>
              {showConflictDetail
                ? offlineConflicts.map((item) => (
                    <div
                      key={item.saleId}
                      className="rounded-lg border border-rose-200/80 bg-white/70 px-2.5 py-2"
                    >
                      <p className="font-medium">
                        Venta {item.saleId.slice(-8)} · Q
                        {item.sale.total.toFixed(2)} · intento {item.attempts}
                      </p>
                      <p className="mt-0.5 text-[11px] text-rose-800">
                        {item.lastError}
                      </p>
                      {item.conflicts?.length ? (
                        <ul className="mt-1 list-inside list-disc text-[11px]">
                          {item.conflicts.map((c) => (
                            <li key={`${item.saleId}-${c.productId}`}>
                              {c.name}: pide {c.needed}, hay {c.available}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-rose-700 px-2 py-1 font-semibold text-white"
                          onClick={() => void retryOfflineSale(item.saleId)}
                        >
                          Reintentar
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-rose-300 px-2 py-1"
                          onClick={() => {
                            if (
                              window.confirm(
                                "¿Descartar esta venta offline? No se subirá al servidor.",
                              )
                            ) {
                              discardOfflineSale(item.saleId);
                            }
                          }}
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  ))
                : null}
              {lastFlushReport?.messages?.length ? (
                <p className="text-[10px] text-rose-800/80">
                  Último sync: {lastFlushReport.synced} ok ·{" "}
                  {lastFlushReport.conflicts} conflicto(s) ·{" "}
                  {lastFlushReport.failed} fallida(s)
                </p>
              ) : null}
            </div>
          ) : pendingSync ? (
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
              <span>
                Sincronización pendiente
                {pendingOfflineCount > 0
                  ? ` · ${pendingOfflineCount} venta(s) offline`
                  : ""}
              </span>
              <button
                type="button"
                className="rounded-md bg-sky-700 px-2.5 py-1 font-semibold text-white"
                onClick={() => void flushSync()}
              >
                Sincronizar ahora
              </button>
            </div>
          ) : syncError ? (
            <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {syncError}
            </div>
          ) : null}
          <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col">
            {children}
          </div>
        </main>
        <BottomNav />
        <AlertsButton />
        <CashShiftPrompt />
      </div>
    </div>
  );
}
