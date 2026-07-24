"use client";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import { SessionIdleWatcher } from "@/components/SessionIdleWatcher";
import { useEffect } from "react";
function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo (HTTP por IP) el SW puede cachear mal y romper el login
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration errors
    });
  }, []);
  return null;
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <PwaRegister />
        <SessionIdleWatcher />
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
