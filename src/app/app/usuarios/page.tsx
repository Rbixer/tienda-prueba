"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GuardAdmin } from "@/components/GuardAdmin";
import {
  Field,
  Panel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastContext";
import {
  PERMISSION_CATALOG,
  defaultPermissionsForRole,
} from "@/lib/permissions";
import type { Permission, Role, User } from "@/lib/types";

function BranchAccessPicker({
  stores,
  primaryId,
  value,
  onChangePrimary,
  onChangeAllowed,
  adminMode,
}: {
  stores: { id: string; name: string }[];
  primaryId: string;
  value: string[];
  onChangePrimary: (id: string) => void;
  onChangeAllowed: (ids: string[]) => void;
  adminMode?: boolean;
}) {
  const selected = new Set(value);

  function toggle(id: string) {
    if (adminMode) {
      // Admin: vacío = todas. Toggle agrega/quita restricciones.
      const next = selected.has(id)
        ? value.filter((x) => x !== id)
        : [...value, id];
      onChangeAllowed(next);
      if (next.length && !next.includes(primaryId)) {
        onChangePrimary(next[0]);
      }
      return;
    }
    // Vendedor: al menos una; la principal siempre queda incluida
    let next = selected.has(id)
      ? value.filter((x) => x !== id)
      : [...value, id];
    if (next.length === 0) next = [primaryId || id];
    if (!next.includes(primaryId) && primaryId) {
      // Si quitan la principal, cambia la principal a la primera restante
      if (id === primaryId) {
        onChangePrimary(next[0]);
      } else {
        next = [...next, primaryId];
      }
    }
    onChangeAllowed(Array.from(new Set(next)));
  }

  function setPrimary(id: string) {
    onChangePrimary(id);
    if (!adminMode && !selected.has(id)) {
      onChangeAllowed([...value, id]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Tiendas que puede ver
        </p>
        {adminMode ? (
          <span className="text-[10px] text-[var(--muted)]">
            Vacío = todas
          </span>
        ) : null}
      </div>
      <Field label="Sucursal principal">
        <select
          className={`${inputClass} min-h-11`}
          value={primaryId}
          onChange={(e) => setPrimary(e.target.value)}
        >
          {stores.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {stores.map((b) => {
          const on = adminMode
            ? value.length === 0 || selected.has(b.id)
            : selected.has(b.id);
          const isPrimary = b.id === primaryId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => toggle(b.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                on
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)]/30"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                  on
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--line)] bg-white text-transparent"
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {b.name}
                </span>
                {isPrimary ? (
                  <span className="text-[10px] font-medium text-[var(--brand)]">
                    Principal
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PermissionPicker({
  role,
  value,
  onChange,
  disabled,
}: {
  role: Role;
  value: Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
}) {
  const locked = role === "administrador" || disabled;
  const selected = new Set(
    role === "administrador" ? PERMISSION_CATALOG.map((p) => p.id) : value,
  );

  function toggle(id: Permission) {
    if (locked || id === "dashboard") return;
    const next = selected.has(id)
      ? value.filter((p) => p !== id)
      : [...value, id];
    if (!next.includes("dashboard")) next.unshift("dashboard");
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Permisos de módulos
        </p>
        {locked ? (
          <span className="rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
            Acceso total
          </span>
        ) : (
          <button
            type="button"
            className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
            onClick={() => onChange(defaultPermissionsForRole("vendedor"))}
          >
            Restaurar típicos
          </button>
        )}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {PERMISSION_CATALOG.map((perm) => {
          const on = selected.has(perm.id);
          const isDash = perm.id === "dashboard";
          return (
            <button
              key={perm.id}
              type="button"
              disabled={locked || isDash}
              onClick={() => toggle(perm.id)}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                on
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)]/30"
              } ${locked || isDash ? "cursor-default opacity-90" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                  on
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--line)] bg-white text-transparent"
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">
                  {perm.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted)]">
                  {perm.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { data, createUser, updateUser, deleteUser, storeBranches, session } =
    useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [branchId, setBranchId] = useState("");
  const [allowedBranchIds, setAllowedBranchIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>(
    defaultPermissionsForRole("vendedor"),
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("vendedor");
  const [editBranchId, setEditBranchId] = useState("");
  const [editAllowedBranchIds, setEditAllowedBranchIds] = useState<string[]>(
    [],
  );
  const [editPassword, setEditPassword] = useState("");
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (!branchId && storeBranches[0]) {
      setBranchId(storeBranches[0].id);
      setAllowedBranchIds([storeBranches[0].id]);
    }
  }, [branchId, storeBranches]);

  function onRoleChange(next: Role) {
    setRole(next);
    setPermissions(defaultPermissionsForRole(next));
    if (next === "administrador") {
      setAllowedBranchIds([]);
    } else if (allowedBranchIds.length === 0 && branchId) {
      setAllowedBranchIds([branchId]);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = createUser({
      name,
      username,
      password,
      role,
      branchId,
      allowedBranchIds:
        role === "administrador" ? allowedBranchIds : allowedBranchIds,
      permissions,
    });
    if (err) {
      setError(err);
      setOk(null);
      toast.error(err, "Usuarios");
      return;
    }
    setError(null);
    setOk("Usuario creado correctamente.");
    toast.success("Usuario creado correctamente.", "Usuarios");
    setName("");
    setUsername("");
    setPassword("");
    setRole("vendedor");
    setPermissions(defaultPermissionsForRole("vendedor"));
    if (storeBranches[0]) {
      setBranchId(storeBranches[0].id);
      setAllowedBranchIds([storeBranches[0].id]);
    }
  }

  function openEdit(user: User) {
    setEditing(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditBranchId(user.branchId);
    setEditAllowedBranchIds(
      user.allowedBranchIds?.length
        ? [...user.allowedBranchIds]
        : user.role === "administrador"
          ? []
          : [user.branchId],
    );
    setEditPassword("");
    setEditPermissions(
      user.permissions?.length
        ? [...user.permissions]
        : defaultPermissionsForRole(user.role),
    );
  }

  function onEditRoleChange(next: Role) {
    setEditRole(next);
    setEditPermissions(defaultPermissionsForRole(next));
    if (next === "administrador") {
      setEditAllowedBranchIds([]);
    } else if (editAllowedBranchIds.length === 0 && editBranchId) {
      setEditAllowedBranchIds([editBranchId]);
    }
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const err = updateUser(editing.id, {
      name: editName,
      role: editRole,
      branchId: editBranchId,
      allowedBranchIds: editAllowedBranchIds,
      password: editPassword || undefined,
      permissions: editPermissions,
    });
    if (err) {
      toast.error(err, "Usuarios");
      return;
    }
    toast.success(`Permisos de “${editName}” actualizados.`, "Usuarios");
    setEditing(null);
  }

  async function askDeleteUser(userId: string, userName: string) {
    const accepted = await toast.confirm({
      title: "Eliminar usuario",
      message: `¿Eliminar a “${userName}” del sistema?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!accepted) return;
    const err = deleteUser(userId);
    if (err) {
      toast.error(err, "Usuarios");
      return;
    }
    toast.success(`“${userName}” eliminado.`, "Usuarios");
  }

  function permissionLabels(user: User) {
    if (user.role === "administrador") return "Todos";
    const list = user.permissions ?? [];
    if (list.length === 0) return "Sin permisos";
    return list
      .map((id) => PERMISSION_CATALOG.find((p) => p.id === id)?.label ?? id)
      .join(", ");
  }

  function storeLabels(user: User) {
    if (user.role === "administrador" && !user.allowedBranchIds?.length) {
      return "Todas";
    }
    const ids = user.allowedBranchIds?.length
      ? user.allowedBranchIds
      : [user.branchId];
    return ids
      .map((id) => data.branches.find((b) => b.id === id)?.name ?? id)
      .join(", ");
  }

  const canCreateAdmin = session?.role === "administrador";

  return (
    <AppShell
      title="Usuarios"
      subtitle="Crea cuentas y asigna permisos por módulo a cada persona."
    >
      <GuardAdmin>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,24rem)_1fr]">
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
                    onChange={(e) => onRoleChange(e.target.value as Role)}
                  >
                    <option value="vendedor">Vendedor</option>
                    {canCreateAdmin ? (
                      <option value="administrador">Administrador</option>
                    ) : null}
                  </select>
                </Field>
              </div>

              <BranchAccessPicker
                stores={storeBranches}
                primaryId={branchId}
                value={allowedBranchIds}
                onChangePrimary={setBranchId}
                onChangeAllowed={setAllowedBranchIds}
                adminMode={role === "administrador"}
              />

              <PermissionPicker
                role={role}
                value={permissions}
                onChange={setPermissions}
              />

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

            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto md:hidden">
              {data.users.map((user) => {
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
                    <p className="mt-2 line-clamp-2 text-[11px] text-[var(--muted)]">
                      {permissionLabels(user)}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
                      <p className="truncate text-xs text-[var(--muted)]">
                        {storeLabels(user)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-[var(--brand)]"
                          onClick={() => openEdit(user)}
                          aria-label="Editar permisos"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-red-600"
                          onClick={() => {
                            void askDeleteUser(user.id, user.name);
                          }}
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

            <div className="mt-3 hidden min-h-0 flex-1 overflow-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="pb-2 font-medium">Nombre</th>
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium">Rol</th>
                    <th className="pb-2 font-medium">Permisos</th>
                    <th className="pb-2 font-medium">Tiendas</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => {
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-[var(--line)]/70 last:border-0"
                      >
                        <td className="py-3 font-medium">{user.name}</td>
                        <td className="py-3">{user.username}</td>
                        <td className="py-3 capitalize">{user.role}</td>
                        <td className="max-w-[14rem] py-3 text-xs text-[var(--muted)]">
                          <span className="line-clamp-2">
                            {permissionLabels(user)}
                          </span>
                        </td>
                        <td className="max-w-[12rem] py-3 text-xs text-[var(--muted)]">
                          <span className="line-clamp-2">
                            {storeLabels(user)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                            onClick={() => openEdit(user)}
                            aria-label="Editar permisos"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              void askDeleteUser(user.id, user.name);
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

        {editing ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
            <form
              onSubmit={saveEdit}
              className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl sm:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Editar usuario
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    @{editing.username}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-soft)]"
                  onClick={() => setEditing(null)}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <Field label="Nombre completo">
                  <input
                    className={inputClass}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Rol">
                    <select
                      className={inputClass}
                      value={editRole}
                      onChange={(e) =>
                        onEditRoleChange(e.target.value as Role)
                      }
                      disabled={
                        editing.id === "usr-admin" ||
                        (!canCreateAdmin && editing.role === "administrador")
                      }
                    >
                      <option value="vendedor">Vendedor</option>
                      {canCreateAdmin || editRole === "administrador" ? (
                        <option value="administrador">Administrador</option>
                      ) : null}
                    </select>
                  </Field>
                </div>

                <BranchAccessPicker
                  stores={storeBranches}
                  primaryId={editBranchId}
                  value={editAllowedBranchIds}
                  onChangePrimary={setEditBranchId}
                  onChangeAllowed={setEditAllowedBranchIds}
                  adminMode={editRole === "administrador"}
                />

                <Field label="Nueva contraseña (opcional)">
                  <input
                    type="password"
                    className={inputClass}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                    autoComplete="new-password"
                  />
                </Field>

                <PermissionPicker
                  role={editRole}
                  value={editPermissions}
                  onChange={setEditPermissions}
                  disabled={editing.id === "usr-admin"}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className={`${buttonSecondary} flex-1`}
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={`${buttonPrimary} flex-1`}>
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </GuardAdmin>
    </AppShell>
  );
}
