"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import { decodeBarcodeFromFile, normalizeBarcode } from "@/lib/barcode";
type Props = {
  onDetected: (code: string) => void;
  children: (api: {
    openCamera: () => void;
    busy: boolean;
  }) => React.ReactNode;
};
/**
 * Abre la cámara nativa en el mismo clic del usuario (funciona en HTTP/PWA).
 * No muestra pantalla intermedia.
 */
export function BarcodeCapture({ onDetected, children }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  function openCamera() {
    setError(null);
    cameraRef.current?.click();
  }
  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const code = await decodeBarcodeFromFile(file);
      onDetected(code);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo leer el código. Intenta de nuevo.",
      );
      setManual("");
      setErrorOpen(true);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }
  function submitManual() {
    const code = normalizeBarcode(manual);
    if (!code) {
      setError("Escribe el código de barras.");
      return;
    }
    setErrorOpen(false);
    onDetected(code);
  }
  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {children({ openCamera, busy })}
      {busy ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--ink)]/45 px-6">
          <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
            <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-[var(--brand)]/25" />
            <p className="text-sm font-medium text-[var(--ink)]">
              Leyendo código de barras…
            </p>
          </div>
        </div>
      ) : null}
      {errorOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--ink)]/45"
            aria-label="Cerrar"
            onClick={() => setErrorOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--line)] bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                No se leyó el código
              </h2>
              <button
                type="button"
                className="rounded-xl p-2 text-[var(--muted)]"
                onClick={() => setErrorOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {error ? (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              className={`${buttonPrimary} mb-2 min-h-11 w-full`}
              onClick={() => {
                setErrorOpen(false);
                // pequeño delay para cerrar overlay y reabrir cámara en gesto válido
                setTimeout(() => openCamera(), 50);
              }}
            >
              Volver a tomar foto
            </button>
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                O escribe el código
              </p>
              <div className="flex gap-2">
                <input
                  className={`${inputClass} text-base`}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Ej. 7501055300162"
                  inputMode="numeric"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitManual();
                    }
                  }}
                />
                <button
                  type="button"
                  className={`${buttonSecondary} min-h-11 shrink-0 px-4`}
                  onClick={submitManual}
                >
                  Usar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
