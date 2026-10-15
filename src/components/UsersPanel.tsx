"use client";
import { useState, type FormEvent } from "react";
import { Check, Pencil, Trash2, UserPlus, X } from "lucide-react";
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
  canManageUsers,
  defaultPermissionsForRole,
} from "@/lib/permissions";
import type { Permission, Role, User } from "@/lib/types";

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
    if (locked) return;
    const next = selected.has(id)
      ? value.filter((p) => p !== id)
      : [...value, id];
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
          return (
            <button
              key={perm.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(perm.id)}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                on
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)]/30"
              } ${locked ? "cursor-default opacity-90" : ""}`}
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

export function UsersPanel() {
  const { data, createUser, updateUser, deleteUser, session } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [permissions, setPermissions] = useState<Permission[]>(
    defaultPermissionsForRole("vendedor"),
  );
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("vendedor");
  const [editPassword, setEditPassword] = useState("");
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);

  if (!canManageUsers(session)) return null;

  const storeId =
    data.branches.find((b) => !b.isWarehouse)?.id ?? session?.branchId ?? "";
  const canCreateAdmin = session?.role === "administrador";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = createUser({
      name,
      username,
      password,
      role,
      branchId: storeId,
      allowedBranchIds: role === "administrador" ? [] : [storeId],
      permissions,
    });
    if (err) {
      setError(err);
      toast.error(err, "Usuarios");
      return;
    }
    setError(null);
    toast.success("Usuario creado correctamente.", "Usuarios");
    setName("");
    setUsername("");
    setPassword("");
    setRole("vendedor");
    setPermissions(defaultPermissionsForRole("vendedor"));
  }

  function openEdit(user: User) {
    setEditing(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword("");
    setEditPermissions(
      user.permissions?.length
        ? [...user.permissions]
        : defaultPermissionsForRole(user.role),
    );
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const err = updateUser(editing.id, {
      name: editName,
      role: editRole,
      branchId: storeId,
      allowedBranchIds: editRole === "administrador" ? [] : [storeId],
      password: editPassword || undefined,
      permissions: editPermissions,
    });
    if (err) {
      toast.error(err, "Usuarios");
      return;
    }
    toast.success(`“${editName}” actualizado.`, "Usuarios");
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

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
          <UserPlus size={18} />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Usuarios
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Cuentas y permisos del equipo
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ana López"
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Usuario">
          <input
            className={inputClass}
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
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Rol">
          <select
            className={`${inputClass} min-h-11`}
            value={role}
            onChange={(e) => {
              const next = e.target.value as Role;
              setRole(next);
              setPermissions(defaultPermissionsForRole(next));
            }}
          >
            <option value="vendedor">Vendedor</option>
            {canCreateAdmin ? (
              <option value="administrador">Administrador</option>
            ) : null}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <PermissionPicker
            role={role}
            value={permissions}
            onChange={setPermissions}
          />
        </div>
        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className={buttonPrimary}>
            Crear usuario
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {data.users.map((user) => (
          <div
            key={user.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{user.name}</p>
              <p className="text-sm text-[var(--muted)]">@{user.username}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">
                <span className="capitalize">{user.role}</span>
                {" · "}
                {permissionLabels(user)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-[var(--brand)]"
                onClick={() => openEdit(user)}
                aria-label="Editar usuario"
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
        ))}
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
                <p className="text-sm text-[var(--muted)]">@{editing.username}</p>
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
              <Field label="Rol">
                <select
                  className={inputClass}
                  value={editRole}
                  onChange={(e) => {
                    const next = e.target.value as Role;
                    setEditRole(next);
                    setEditPermissions(defaultPermissionsForRole(next));
                  }}
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
    </Panel>
  );
}
