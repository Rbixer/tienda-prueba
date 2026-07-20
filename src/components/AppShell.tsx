"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const { ready, session, logout, currentBranchName, syncError } = useAuth();
  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);
  if (!ready || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--brand)]/30" />
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <SideNav />
      <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--brand)]">
                MI BARRIO
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <MapPin size={11} />
                <span className="truncate">{currentBranchName}</span>
                <span className="opacity-40">·</span>
                <span className="truncate capitalize">{session.role}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm text-[var(--muted)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 md:px-5 md:pb-5 md:pt-5">
          {syncError ? (
            <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {syncError}
            </div>
          ) : null}
          <div className="mb-3 shrink-0 md:mb-4">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight text-[var(--ink)] md:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
