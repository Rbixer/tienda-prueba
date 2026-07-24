"use client";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CompanyBrand } from "@/components/CompanyBrand";
import { safeAppPath } from "@/lib/nav";
import { REMEMBER_LOGIN_KEY } from "@/lib/store";

function loadRemembered(): {
  username: string;
  password: string;
  remember: boolean;
} {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) {
      return { username: "admin", password: "admin123", remember: false };
    }
    const parsed = JSON.parse(raw) as {
      username?: string;
      password?: string;
    };
    return {
      username: parsed.username ?? "",
      password: parsed.password ?? "",
      remember: true,
    };
  } catch {
    return { username: "admin", password: "admin123", remember: false };
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, session, login, data } = useAuth();
  const companyName = data.settings?.companyName ?? "MI BARRIO";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPath = safeAppPath(searchParams.get("next"));

  useEffect(() => {
    const saved = loadRemembered();
    setUsername(saved.username);
    setPassword(saved.password);
    setRemember(saved.remember);
  }, []);

  useEffect(() => {
    if (ready && session) router.replace(nextPath);
  }, [ready, session, router, nextPath]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = login(username, password);
    if (err) {
      setError(err);
      return;
    }
    try {
      if (remember) {
        localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({
            username: username.trim(),
            password,
          }),
        );
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
    } catch {
      // ignore storage errors
    }
    router.replace(nextPath);
  }

  return (
    <div className="login-unity">
      <div className="login-unity__bg" aria-hidden>
        <span className="login-unity__orb login-unity__orb--1" />
        <span className="login-unity__orb login-unity__orb--2" />
        <span className="login-unity__mesh" />
      </div>

      <div className="login-unity__frame">
        <header className="login-unity__brand login-unity-rise">
          <CompanyBrand
            variant="dark"
            size="xl"
            layout="stack"
            showName
            plain
          />
          <p className="login-unity__tagline">
            Ventas, inventario y sucursales en un solo lugar.
          </p>
        </header>

        <form
          method="post"
          action="/login"
          onSubmit={onSubmit}
          className="login-unity__form login-unity-slide"
        >
          <div className="login-unity__form-head">
            <h2>Iniciar sesión</h2>
            <p>Continúa en {companyName} con tu usuario</p>
          </div>

          <label className="login-unity__field">
            <span>Usuario</span>
            <span className="login-unity__input">
              <UserRound size={17} aria-hidden />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="Tu usuario"
              />
            </span>
          </label>

          <label className="login-unity__field">
            <span>Contraseña</span>
            <span className="login-unity__input">
              <Lock size={17} aria-hidden />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={remember ? "current-password" : "off"}
                required
                placeholder="••••••••"
              />
            </span>
          </label>

          <label className="login-unity__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                const on = e.target.checked;
                setRemember(on);
                if (!on) {
                  try {
                    localStorage.removeItem(REMEMBER_LOGIN_KEY);
                  } catch {
                    // ignore
                  }
                }
              }}
            />
            <span>Recordar usuario y contraseña</span>
          </label>

          {error ? (
            <p className="login-unity__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="login-unity__submit"
            disabled={!ready}
          >
            <span>{ready ? "Entrar" : "Cargando..."}</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>

          <div className="login-unity__demo">
            <p>
              <strong>Admin</strong> admin / admin123
            </p>
            <p>
              <strong>Vendedor</strong> vendedor / vendedor123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--navy)]">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/15" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
