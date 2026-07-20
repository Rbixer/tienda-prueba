"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GuardAdmin } from "@/components/GuardAdmin";
import {
  Field,
  Panel,
  buttonPrimary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";
export default function UsuariosPage() {
  const { data, createUser, deleteUser } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => {
    if (!branchId && data.branches[0]) {
      setBranchId(data.branches[0].id);
    }
  }, [branchId, data.branches]);
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = createUser({
      name,
      username,
      password,
      role,
      branchId,
    });
    if (err) {
      setError(err);
      setOk(null);
      return;
    }
    setError(null);
    setOk("Usuario creado correctamente.");
    setName("");
    setUsername("");
    setPassword("");
    setRole("vendedor");
  }
  return (
    <AppShell
      title="Usuarios"
      subtitle="Crea cuentas de administrador o vendedor y asígnalas a una sucursal."
    >
      <GuardAdmin>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Panel className="order-1 h-fit">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                <UserPlus size={18} />
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold sm:text-xl">
                Nuevo usuario
              </h2>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <Field label="Nombre completo">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Ana López"
                  autoComplete="name"
                  required
                />
              </Field>
              <Field label="Usuario">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label="Contraseña">
                <input
                  type="password"
                  className={`${inputClass} text-base sm:text-sm`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Rol">
                  <select
                    className={`${inputClass} min-h-11 text-base sm:text-sm`}
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </Field>
                <Field label="Sucursal">
                  <select
                    className={`${inputClass} min-h-11 text-base sm:text-sm`}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    {data.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {ok ? (
                <p className="rounded-md bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)]">
                  {ok}
                </p>
              ) : null}
              <button
                type="submit"
                className={`${buttonPrimary} min-h-11 w-full`}
              >
                Crear usuario
              </button>
            </form>
          </Panel>
          <Panel className="order-2 flex min-h-0 flex-col lg:h-full">
            <h2 className="shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold sm:text-xl">
              Equipo ({data.users.length})
            </h2>
            {/* Vista móvil: tarjetas */}
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto md:hidden">
              {data.users.map((user) => {
                const branch = data.branches.find(
                  (b) => b.id === user.branchId,
                );
                return (
                  <div
                    key={user.id}
                    className="rounded-md border border-[var(--line)] bg-[var(--bg-soft)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{user.name}</p>
                        <p className="mt-0.5 text-sm text-[var(--muted)]">
                          @{user.username}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium capitalize ${
                          user.role === "administrador"
                            ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "bg-white text-[var(--muted)]"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
                      <p className="truncate text-xs text-[var(--muted)]">
                        {branch?.name ?? "Sin sucursal"}
                      </p>
                      <button
                        type="button"
                        className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-red-600"
                        onClick={() => {
                          const err = deleteUser(user.id);
                          if (err) alert(err);
                        }}
                        aria-label="Eliminar usuario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {data.users.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">
                  No hay usuarios registrados.
                </p>
              ) : null}
            </div>
            {/* Vista escritorio: tabla */}
            <div className="mt-3 hidden min-h-0 flex-1 overflow-auto md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="pb-2 font-medium">Nombre</th>
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium">Rol</th>
                    <th className="pb-2 font-medium">Sucursal</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => {
                    const branch = data.branches.find(
                      (b) => b.id === user.branchId,
                    );
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-[var(--line)]/70 last:border-0"
                      >
                        <td className="py-3 font-medium">{user.name}</td>
                        <td className="py-3">{user.username}</td>
                        <td className="py-3 capitalize">{user.role}</td>
                        <td className="py-3">
                          {branch?.name ?? "Sin sucursal"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              const err = deleteUser(user.id);
                              if (err) alert(err);
                            }}
                            aria-label="Eliminar usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </GuardAdmin>
    </AppShell>
  );
}
