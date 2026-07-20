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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-[var(--brand)]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--accent)]/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,35,28,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(20,35,28,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>
      <div className="relative w-full max-w-md animate-[fadeUp_0.5s_ease]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/25">
            <Store size={28} />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand)]">
            MI BARRIO
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Inventario, POS y control de sucursales en un solo lugar.
          </p>
        </div>
        <form
          method="post"
          action="/login"
          onSubmit={onSubmit}
          className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(20,35,28,0.08)]"
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
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
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
          <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-3 text-xs text-[var(--muted)]">
            <p className="font-medium text-[var(--ink)]">Accesos demo</p>
            <p className="mt-1">Admin: admin / admin123</p>
            <p>Vendedor: vendedor / vendedor123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
