import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const dark = className.includes("glass-dark");
  return (
    <section
      className={`${dark ? "" : "glass "}rounded-2xl p-3.5 sm:p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2.5 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)] focus:bg-white/80 focus:ring-2 focus:ring-[var(--accent)]/25";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_52%,#22d3ee_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,118,110,0.28)] transition hover:brightness-110 hover:shadow-[0_14px_34px_rgba(15,118,110,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm font-medium text-[var(--ink)] backdrop-blur-md transition hover:border-[var(--brand)]/40 hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50";
