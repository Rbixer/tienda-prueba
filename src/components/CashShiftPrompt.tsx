"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { formatMoney, isCashDayClosed, isCashFloatLocked } from "@/lib/store";
import { buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

const OPEN_EVENT = "farmacia-open-cash";

export function requestCashOpen() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CashShiftPrompt() {
  const { session, data, openShift } = useAuth();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [forced, setForced] = useState(false);

  const canOpen = Boolean(session && hasPermission(session, "pos"));
  const locked = isCashFloatLocked(data.settings);
  const capital = locked ? data.settings.cashFloat : undefined;
  const shift = (data.cashShifts ?? []).find(
    (item) => item.branchId === session?.branchId && !item.closedAt,
  );
  const dayClosed = Boolean(
    session && isCashDayClosed(data.cashShifts, session.branchId),
  );

  useEffect(() => {
    const open = () => {
      setDismissed(false);
      setForced(true);
      setError(null);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (shift) {
      setDismissed(false);
      setForced(false);
      setAmount("");
      setError(null);
    }
  }, [shift]);

  if (!canOpen || shift || dayClosed || (dismissed && !forced)) {
    return null;
  }

  function submit() {
    if (locked && capital === undefined) {
      setError("La cuota fija no está definida. Configúrala en Configuración.");
      return;
    }
    const err = openShift(locked ? capital! : Number(amount || 0));
    if (err) {
      setError(err);
      return;
    }
    setForced(false);
    setDismissed(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--navy)]/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-open-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(11,61,50,0.28)]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Wallet size={20} />
          </span>
          <div>
            <h2
              id="cash-open-title"
              className="font-[family-name:var(--font-display)] text-lg font-semibold"
            >
              Apertura de caja
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {locked
                ? "La cuota está bloqueada. Hoy se confirma este monto."
                : "La apertura está libre. Indica el fondo de hoy."}
            </p>
          </div>
        </div>
        {locked && capital !== undefined ? (
          <p className="mt-4 rounded-xl bg-[var(--brand-soft)] px-4 py-3 text-sm font-semibold text-[var(--navy)]">
            Cuota fija {formatMoney(capital)}
          </p>
        ) : locked ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Falta la cuota fija. El administrador la define en Configuración.
          </p>
        ) : (
          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Fondo inicial
            </span>
            <input
              className={inputClass}
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </label>
        )}
        {error ? (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => {
              setForced(false);
              setDismissed(true);
            }}
          >
            Ahora no
          </button>
          <button
            type="button"
            className={buttonPrimary}
            onClick={submit}
            disabled={locked && capital === undefined}
          >
            Aperturar caja
          </button>
        </div>
      </div>
    </div>
  );
}
