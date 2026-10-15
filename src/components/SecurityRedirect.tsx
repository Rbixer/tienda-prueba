"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { firstAllowedPath, permissionForPath } from "@/lib/nav";

/**
 * Redirecciones de seguridad para todo /app/*:
 * - sin sesión → /login?next=...
 * - sin permiso para la ruta → el primer módulo que sí puede abrir
 */
export function SecurityRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const required = permissionForPath(pathname);
  const allowed =
    !required ||
    hasPermission(session, required) ||
    (required === "configuracion" && hasPermission(session, "usuarios"));

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      const next = encodeURIComponent(pathname || "/app");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!allowed) {
      const fallback = firstAllowedPath(session);
      if (fallback && fallback !== pathname) router.replace(fallback);
    }
  }, [ready, session, pathname, router, allowed]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--brand)]/20" />
      </div>
    );
  }

  if (!session || (!allowed && firstAllowedPath(session))) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--brand)]/20" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-6 text-center">
        <p className="max-w-sm text-sm text-[var(--muted)]">
          Este usuario no tiene módulos asignados. Un administrador puede
          activarlos en Configuración.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
