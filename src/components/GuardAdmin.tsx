"use client";
import type { ReactNode } from "react";

/**
 * Contenedor de layout para módulos admin.
 * No fuerza altura flex: en móvil el contenido debe fluir y scrollear
 * en AppShell (si no, los paneles se solapan).
 */
export function GuardAdmin({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-0">{children}</div>;
}
