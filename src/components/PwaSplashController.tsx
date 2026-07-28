"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Splash controlado por React (no muta nodos del layout hidratado).
 * Evita NotFoundError insertBefore/removeChild.
 */
export function PwaSplashController() {
  const { ready } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setExiting(true);
    document.documentElement.classList.remove("pwa-splash-pending");
    const t = window.setTimeout(() => setVisible(false), 280);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    // Fallback: nunca dejar el splash eterno
    const t = window.setTimeout(() => {
      setExiting(true);
      document.documentElement.classList.remove("pwa-splash-pending");
      window.setTimeout(() => setVisible(false), 280);
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className={`pwa-boot-splash${exiting ? " pwa-boot-splash--hide" : ""}`}
      aria-hidden="true"
    >
      <div className="pwa-boot-splash__mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={72} height={72} />
      </div>
      <p className="pwa-boot-splash__name">MI BARRIO</p>
    </div>,
    document.body,
  );
}
