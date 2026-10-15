"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buildAlerts } from "@/lib/alerts";

export function AlertsButton() {
  const { branchProducts, data } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const alerts = useMemo(
    () => buildAlerts(branchProducts, data.purchaseOrders ?? []),
    [branchProducts, data.purchaseOrders],
  );
  const count = alerts.length;

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[44] bg-transparent"
          aria-label="Cerrar alertas"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="fixed right-4 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-[45] md:bottom-6">
        {open ? (
          <div className="absolute bottom-[4.25rem] right-0 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_16px_40px_rgba(11,61,50,0.18)]">
            <div className="border-b border-[var(--line)] px-3 py-2.5">
              <p className="text-sm font-semibold">Alertas</p>
              <p className="text-[11px] text-[var(--muted)]">
                Vencimientos, stock mínimo y pedidos
              </p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                  No hay alertas por ahora.
                </li>
              ) : (
                alerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      className="flex w-full gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-soft)]"
                      onClick={() => {
                        setOpen(false);
                        router.push(alert.href);
                      }}
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          alert.tone === "danger"
                            ? "bg-red-600"
                            : alert.tone === "warn"
                              ? "bg-amber-500"
                              : "bg-[var(--brand)]"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-snug">
                          {alert.title}
                        </span>
                        <span className="block text-[11px] text-[var(--muted)]">
                          {alert.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--navy)] text-white shadow-lg shadow-[var(--navy)]/30"
          aria-label={count ? `${count} alertas` : "Alertas"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Bell size={22} />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </button>
      </div>
    </>
  );
}
