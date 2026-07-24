"use client";
import type { ReactNode } from "react";

/**
 * Contenedor de layout para módulos admin.
 * La seguridad de sesión/permisos la maneja SecurityRedirect en /app/layout.
 */
export function GuardAdmin({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
