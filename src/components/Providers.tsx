"use client";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import { SessionIdleWatcher } from "@/components/SessionIdleWatcher";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { PwaSplashController } from "@/components/PwaSplashController";
import { useEffect } from "react";

const SW_URL = "/sw.js?v=11";

function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      // Nuevo SW: recarga una vez para salir de caches viejos rotos
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker
      .register(SW_URL)
      .then((reg) => {
        reg.update().catch(() => undefined);
        // Limpia SW antiguos sin ?v=
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => {
            const script = r.active?.scriptURL || r.installing?.scriptURL || "";
            if (script.includes("/sw.js") && !script.includes("v=11")) {
              r.unregister().catch(() => undefined);
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <PwaRegister />
        <PwaSplashController />
        <SessionIdleWatcher />
        <InstallAppPrompt />
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
