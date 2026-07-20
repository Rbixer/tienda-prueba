"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Field, buttonPrimary, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { ready, session, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (ready && session) router.replace("/app");
  }, [ready, session, router]);
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = login(username, password);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/app");
  }
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="liquid-orb -left-10 top-10 h-80 w-80 bg-[#2dd4bf]" />
        <div
          className="liquid-orb bottom-0 right-0 h-96 w-96 bg-[#22d3ee]"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="liquid-orb left-1/2 top-1/3 h-64 w-64 bg-[#0f766e]"
          style={{ animationDelay: "3s", opacity: 0.4 }}
        />
      </div>
      <div className="relative w-full max-w-md animate-[fadeUp_0.55s_ease]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#14b8a6,#22d3ee)] text-white shadow-[0_16px_40px_rgba(15,118,110,0.35)]">
            <Store size={28} />
          </div>
          <h1 className="bg-[linear-gradient(90deg,#0f766e,#14b8a6,#0891b2)] bg-clip-text font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-transparent">
            MI BARRIO
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Inventario, POS y sucursales con diseño liquid glass.
          </p>
        </div>
        <form
          method="post"
          action="/login"
          onSubmit={onSubmit}
          className="glass-strong space-y-4 rounded-3xl p-6"
        >
          <Field label="Usuario">
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? (
            <p className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className={`${buttonPrimary} w-full`}
            disabled={!ready}
          >
            {ready ? "Entrar" : "Cargando..."}
          </button>
          <div className="rounded-2xl border border-white/50 bg-white/35 px-3 py-3 text-xs text-[var(--muted)]">
            <p className="font-semibold text-[var(--ink)]">Accesos demo</p>
            <p className="mt-1">Admin: admin / admin123</p>
            <p>Vendedor: vendedor / vendedor123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
