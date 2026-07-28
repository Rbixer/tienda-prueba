"use client";
import { useState, type FormEvent } from "react";
import { Check, MapPin, Pencil, Plus, Store, Trash2, X } from "lucide-react";
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
import { hasPermission } from "@/lib/permissions";
import { formatMoney, getCostPrice } from "@/lib/store";
import type { Branch } from "@/lib/types";

export default function SucursalesPage() {
  const {
    data,
    session,
    setActiveBranch,
    visibleBranches,
    createBranch,
    updateBranch,
    deleteBranch,
  } = useAuth();
  const toast = useToast();
  const canManage = hasPermission(session, "sucursales");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setName(branch.name);
    setAddress(branch.address);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = editing
      ? updateBranch(editing.id, { name, address })
      : createBranch({ name, address });
    if (err) {
      setFormError(err);
      return;
    }
    toast.success(
      editing ? "Sucursal actualizada." : "Sucursal creada.",
      "Sucursales",
    );
    closeForm();
  }

  function onDelete(branch: Branch) {
    if (
      !window.confirm(
        `¿Eliminar “${branch.name}”? Debe estar sin stock y sin usuarios principales.`,
      )
    ) {
      return;
    }
    const err = deleteBranch(branch.id);
    if (err) {
      toast.error(err, "Sucursales");
      return;
    }
    toast.success("Sucursal eliminada.", "Sucursales");
  }

  return (
    <AppShell
      title="Sucursales"
      subtitle="Administra las sucursales y cambia la ubicación activa para operar inventario y POS."
    >
      <GuardAdmin>
        {canManage ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted)]">
              Alta, edición y baja de tiendas de venta.
            </p>
            <button
              type="button"
              className={`${buttonPrimary} inline-flex items-center gap-1.5`}
              onClick={openCreate}
            >
              <Plus size={16} />
              Nueva sucursal
            </button>
          </div>
        ) : null}

        {showForm && canManage ? (
          <Panel className="mb-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                {editing ? "Editar sucursal" : "Nueva sucursal"}
              </h2>
              <button
                type="button"
                className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                onClick={closeForm}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Field label="Nombre">
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sucursal Oriente"
                  required
                />
              </Field>
              <Field label="Dirección">
                <input
                  className={inputClass}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, colonia, referencia"
                  required
                />
              </Field>
              {formError ? (
                <p className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" className={buttonPrimary}>
                  {editing ? "Guardar cambios" : "Crear sucursal"}
                </button>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={closeForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Panel>
        ) : null}

        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBranches.length === 0 ? (
            <Panel className="sm:col-span-2 xl:col-span-3">
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                No tienes tiendas asignadas. Pide al administrador que te dé
                acceso.
              </p>
            </Panel>
          ) : null}
          {visibleBranches.map((branch) => {
            const products = data.products.filter(
              (p) => p.branchId === branch.id,
            );
            const users = data.users.filter(
              (u) =>
                u.branchId === branch.id ||
                u.allowedBranchIds?.includes(branch.id),
            );
            const sales = data.sales.filter((s) => s.branchId === branch.id);
            const stockValue = products.reduce(
              (sum, p) => sum + getCostPrice(p) * p.quantity,
              0,
            );
            const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);
            const active = session?.branchId === branch.id;
            return (
              <Panel
                key={branch.id}
                className={`relative flex h-full min-w-0 flex-col transition ${
                  active ? "border-[var(--brand)]" : ""
                }`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--bg-soft)] text-[var(--brand)]">
                      <Store size={18} />
                    </div>
                    <div className="flex items-center gap-1">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                            onClick={() => openEdit(branch)}
                            aria-label={`Editar ${branch.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-red-700"
                            onClick={() => onDelete(branch)}
                            aria-label={`Eliminar ${branch.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : null}
                      {active ? (
                        <span className="inline-flex items-center gap-1 bg-[var(--brand)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          <Check size={11} />
                          Activa
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <h2 className="mt-3 break-words text-lg font-semibold">
                    {branch.name}
                  </h2>
                  <p className="mt-1 flex min-w-0 items-start gap-1.5 text-sm text-[var(--muted)]">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words">{branch.address}</span>
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Productos
                      </dt>
                      <dd className="mt-0.5 font-semibold">{products.length}</dd>
                    </div>
                    <div className="min-w-0 border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Usuarios
                      </dt>
                      <dd className="mt-0.5 font-semibold">{users.length}</dd>
                    </div>
                    <div className="min-w-0 border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Inventario
                      </dt>
                      <dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">
                        {formatMoney(stockValue)}
                      </dd>
                    </div>
                    <div className="min-w-0 border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Ventas
                      </dt>
                      <dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">
                        {formatMoney(salesTotal)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`${buttonPrimary} mt-auto w-full`}
                    disabled={active}
                    onClick={() => setActiveBranch(branch.id)}
                  >
                    {active ? "Sucursal en uso" : "Operar aquí"}
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          La Bodega Central se gestiona desde el módulo Bodega (traslados).
        </p>
      </GuardAdmin>
    </AppShell>
  );
}
