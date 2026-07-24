"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastContext";
import { SESSION_IDLE_MS } from "@/lib/store";

/**
 * Cierra la sesión por inactividad y muestra un toast al instante.
 */
export function SessionIdleWatcher() {
  const { ready, session, logout } = useAuth();
  const toast = useToast();
  const logoutRef = useRef(logout);
  const toastRef = useRef(toast);

  useEffect(() => {
    logoutRef.current = logout;
    toastRef.current = toast;
  }, [logout, toast]);

  useEffect(() => {
    if (!ready || !session) return;

    let timer: number | undefined;

    const expire = () => {
      toastRef.current.push({
        title: "Descanso",
        message: "Ya me voy a descansar, regresaré cuando me lo pidas.",
        tone: "info",
        duration: 6500,
      });
      logoutRef.current();
    };

    const bump = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(expire, SESSION_IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    bump();
    for (const ev of events) {
      window.addEventListener(ev, bump, { passive: true });
    }
    document.addEventListener("visibilitychange", bump);

    return () => {
      if (timer) window.clearTimeout(timer);
      for (const ev of events) {
        window.removeEventListener(ev, bump);
      }
      document.removeEventListener("visibilitychange", bump);
    };
  }, [ready, session]);

  return null;
}
