"use client";
import { useAuth } from "@/context/AuthContext";
export function GuardAdmin({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session || session.role !== "administrador") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
        Esta sección solo está disponible para administradores.
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">{children}</div>
  );
}
