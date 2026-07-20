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
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#14b8a6,#22d3ee)] opacity-70" />
      </div>
    );
  }
  return (
    <div className="relative flex min-h-dvh text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="liquid-orb -left-16 top-24 h-64 w-64 bg-[#2dd4bf]" />
        <div
          className="liquid-orb right-0 top-40 h-72 w-72 bg-[#22d3ee]"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="liquid-orb bottom-10 left-1/3 h-56 w-56 bg-[#0f766e]"
          style={{ animationDelay: "4s", opacity: 0.35 }}
        />
      </div>
      <SideNav />
      <div className="relative flex min-h-dvh w-full min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-30 shrink-0 glass-strong border-b border-white/40 md:hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="bg-[linear-gradient(90deg,#0f766e,#14b8a6,#0891b2)] bg-clip-text font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-transparent">
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/40 px-2.5 py-2 text-sm text-[var(--muted)] backdrop-blur-md"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="relative flex min-h-0 flex-1 flex-col px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 md:px-5 md:pb-5 md:pt-5">
          {syncError ? (
            <div className="mb-3 shrink-0 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 backdrop-blur-md">
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
