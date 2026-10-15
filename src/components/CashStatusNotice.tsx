"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatMoney, isCashDayClosed, isCashFloatLocked } from "@/lib/store";
import { buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import { requestCashOpen } from "@/components/CashShiftPrompt";

export function CashStatusNotice() {
  const { session, data, closeShift } = useAuth();
  const [counted, setCounted] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!session || !hasPermission(session, "pos")) return null;

  const shift = (data.cashShifts ?? []).find(
    (item) => item.branchId === session.branchId && !item.closedAt,
  );
  const locked = isCashFloatLocked(data.settings);
  const capital = locked ? data.settings.cashFloat : undefined;
  const dayClosed = isCashDayClosed(data.cashShifts, session.branchId);

  if (!shift) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {dayClosed ? "Día cerrado" : "La caja no está abierta"}
            </p>
            <p className="text-xs text-amber-900/80">
              {dayClosed
                ? locked && capital !== undefined
                  ? `El corte quedó registrado. Mañana se apertura con la cuota fija de ${formatMoney(capital)}.`
                  : "El corte quedó registrado. Mañana se puede aperturar con el monto del día."
                : locked && capital !== undefined
                  ? `Hoy se apertura con la cuota fija de ${formatMoney(capital)}.`
                  : locked
                    ? "Falta la cuota fija. Defínela en Configuración."
                    : "Hay que indicar el fondo al aperturar."}
            </p>
          </div>
        </div>
        {dayClosed ? null : (
          <button type="button" className={buttonPrimary} onClick={requestCashOpen}>
            Aperturar caja
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold">Caja abierta</p>
            <p className="text-xs text-[var(--muted)]">
              {locked ? "Cuota fija" : "Fondo"} {formatMoney(shift.openingAmount)}
              {" · "}
              {locked ? "bloqueada" : "apertura libre"}
              {" · "}
              {shift.userName} · {formatDate(shift.openedAt)}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="Efectivo contado"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
          <button
            type="button"
            className={`${buttonSecondary} shrink-0`}
            onClick={() => {
              const raw = counted.trim();
              const err = closeShift(raw === "" ? undefined : Number(raw));
              if (err) {
                setError(err);
                return;
              }
              setError(null);
              setCounted("");
            }}
          >
            Cerrar caja
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
