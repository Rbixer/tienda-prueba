"use client";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "tienda-barrio-install-dismiss-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
  return mq || !!ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chrome;
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }

    if (isIosSafari()) {
      setShowIos(true);
      setHidden(false);
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    setHidden(true);
    setShowAndroid(false);
    setShowIos(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
    dismiss();
  }

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:justify-end">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/15 bg-[var(--navy)] p-3.5 text-white shadow-[0_16px_40px_rgba(59,36,24,0.45)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12">
            <Download size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Instala TIENDA</p>
            {showAndroid ? (
              <p className="mt-1 text-xs text-white/75">
                Acceso rápido desde tu pantalla de inicio, como una app.
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                En iPhone: toca{" "}
                <span className="inline-flex items-center gap-0.5 font-semibold text-white">
                  <Share size={12} className="inline" /> Compartir
                </span>{" "}
                y luego <strong>Añadir a pantalla de inicio</strong>.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {showAndroid ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)]"
                >
                  Instalar app
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl border border-white/25 px-3 py-2 text-xs font-medium text-white/90"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
