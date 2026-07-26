"use client";
import { useMemo, useState, type FormEvent } from "react";
import {
  Banknote,
  FileText,
  History,
  Pencil,
  Phone,
  Plus,
  Printer,
  Trash2,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GuardAdmin } from "@/components/GuardAdmin";
import {
  Field,
  Panel,
  buttonPrimary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastContext";
import {
  downloadSupplierPaymentPdf,
  downloadSupplierPaymentsHistoryPdf,
  printSupplierPaymentTicket,
} from "@/lib/pdf";
import { formatDate, formatMoney } from "@/lib/store";
import type { Supplier, SupplierPayment, SupplierPaymentMethod } from "@/lib/types";

const METHODS: { id: SupplierPaymentMethod; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "cheque", label: "Cheque" },
  { id: "otro", label: "Otro" },
];

function PdfIconButton({
  title,
  onClick,
  disabled,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[#E11D48] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <FileText size={15} strokeWidth={2.2} />
    </button>
  );
}

type Tone = "slate" | "teal" | "amber";

const toneStyles: Record<Tone, { badge: string; bar: string; value: string }> = {
  slate: {
    badge: "bg-[var(--slate-soft)] text-[var(--slate)]",
    bar: "bg-[var(--slate)]/45",
    value: "text-[var(--ink)]",
  },
  teal: {
    badge: "bg-[var(--teal-soft)] text-[var(--teal)]",
    bar: "bg-[var(--teal)]/50",
    value: "text-[var(--teal)]",
  },
  amber: {
    badge: "bg-[var(--amber-soft)] text-[var(--amber)]",
    bar: "bg-[var(--amber)]/45",
    value: "text-[var(--amber)]",
  },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "slate",
  featured = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--navy)] via-[var(--navy-soft)] to-[#1b4a7e] p-4 text-white shadow-[0_12px_30px_rgba(11,37,69,0.3)] ring-1 ring-white/10 sm:p-5">
        <span
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[var(--accent)]/20 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/65">
            {label}
          </p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300 ring-1 ring-white/15">
            <Icon size={18} />
          </span>
        </div>
        <p className="relative mt-4 truncate font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>
        {hint ? (
          <p className="relative mt-1.5 truncate text-xs text-white/55">{hint}</p>
        ) : null}
      </section>
    );
  }

  const style = toneStyles[tone];
  return (
    <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span
        className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] ${style.bar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.badge}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p
        className={`mt-4 truncate font-[family-name:var(--font-display)] text-2xl font-bold leading-none tracking-tight sm:text-[1.7rem] ${style.value}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </section>
  );
}

function emptyForm() {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    balance: "",
  };
}

export default function ProveedoresPage() {
  const {
    data,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierPayment,
    deleteSupplierPayment,
  } = useAuth();
  const toast = useToast();

  const suppliers = useMemo(
    () =>
      [...(data.suppliers ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      ),
    [data.suppliers],
  );
  const payments = data.supplierPayments ?? [];

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] =
    useState<SupplierPaymentMethod>("efectivo");
  const [payNote, setPayNote] = useState("");
  const [printTicket, setPrintTicket] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;
  const selectedPayments = useMemo(
    () =>
      payments
        .filter((p) => p.supplierId === selectedId)
        .sort(
          (a, b) =>
            new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        ),
    [payments, selectedId],
  );

  const allPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      ),
    [payments],
  );

  const supplierById = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const s of suppliers) map.set(s.id, s);
    return map;
  }, [suppliers]);

  const totalDebt = suppliers.reduce((n, s) => n + s.balance, 0);
  const totalPaid = payments.reduce((n, p) => n + p.amount, 0);

  function companyPdfMeta() {
    return {
      companyName: data.settings?.companyName,
      slogan: data.settings?.slogan,
      address: data.settings?.address,
      phone: data.settings?.phone,
      logoDataUrl: data.settings?.logo,
      pdfStyle: data.settings?.pdfStyle,
    };
  }

  async function printPayment(payment: SupplierPayment) {
    const supplier = supplierById.get(payment.supplierId);
    if (!supplier) {
      toast.error("No se encontró el proveedor de este pago.", "PDF");
      return;
    }
    setPdfBusy(payment.id);
    try {
      await downloadSupplierPaymentPdf({
        payment,
        supplier,
        ...companyPdfMeta(),
      });
    } finally {
      setPdfBusy(null);
    }
  }

  async function printPaymentTicket(payment: SupplierPayment) {
    const supplier = supplierById.get(payment.supplierId);
    if (!supplier) {
      toast.error("No se encontró el proveedor de este pago.", "Ticket");
      return;
    }
    setPdfBusy(`ticket-${payment.id}`);
    try {
      await printSupplierPaymentTicket({
        payment,
        supplier,
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
        alsoDownload: true,
      });
      toast.info("Ticket listo para imprimir.", "Comprobante");
    } catch {
      toast.error("No se pudo generar el ticket.", "Comprobante");
    } finally {
      setPdfBusy(null);
    }
  }

  async function printFullHistory() {
    if (allPayments.length === 0) {
      toast.error("No hay pagos para exportar.", "PDF");
      return;
    }
    setPdfBusy("all");
    try {
      await downloadSupplierPaymentsHistoryPdf({
        payments: allPayments,
        suppliers,
        ...companyPdfMeta(),
      });
    } finally {
      setPdfBusy(null);
    }
  }

  function resetForm() {
    setForm(emptyForm());
    setEditing(null);
    setError(null);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setSelectedId(supplier.id);
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
      balance: String(supplier.balance),
    });
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes,
      balance: Number(form.balance) || 0,
    };
    const err = editing
      ? updateSupplier(editing.id, payload)
      : createSupplier(payload);
    if (err) {
      setError(err);
      toast.error(err, "Proveedores");
      return;
    }
    toast.success(
      editing ? "Proveedor actualizado." : "Proveedor registrado.",
      "Proveedores",
    );
    resetForm();
  }

  async function askDelete(supplier: Supplier) {
    const accepted = await toast.confirm({
      title: "Eliminar proveedor",
      message: `¿Eliminar a “${supplier.name}” y su historial de pagos?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!accepted) return;
    const err = deleteSupplier(supplier.id);
    if (err) {
      toast.error(err, "Proveedores");
      return;
    }
    if (selectedId === supplier.id) setSelectedId(null);
    if (editing?.id === supplier.id) resetForm();
    toast.success("Proveedor eliminado.", "Proveedores");
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amountNum = Number(payAmount);
    const result = addSupplierPayment({
      supplierId: selected.id,
      amount: amountNum,
      method: payMethod,
      note: payNote,
    });
    if (result.error || !result.payment || !result.supplier) {
      toast.error(result.error ?? "No se pudo registrar el pago.", "Pagos");
      return;
    }
    toast.success(
      `Pago de ${formatMoney(amountNum)} registrado.`,
      "Pagos",
    );
    setPayAmount("");
    setPayNote("");
    setPayMethod("efectivo");

    if (!printTicket) return;

    setPdfBusy(result.payment.id);
    try {
      await printSupplierPaymentTicket({
        payment: result.payment,
        supplier: result.supplier,
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
        alsoDownload: true,
      });
      toast.info("Ticket listo para imprimir.", "Comprobante");
    } catch {
      toast.error("No se pudo generar el ticket.", "Comprobante");
    } finally {
      setPdfBusy(null);
    }
  }

  async function askDeletePayment(id: string, amount: number) {
    const accepted = await toast.confirm({
      title: "Eliminar pago",
      message: `¿Eliminar el pago de ${formatMoney(amount)}? El saldo del proveedor se restaurará.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!accepted) return;
    const err = deleteSupplierPayment(id);
    if (err) {
      toast.error(err, "Pagos");
      return;
    }
    toast.success("Pago eliminado.", "Pagos");
  }

  return (
    <AppShell
      title="Proveedores"
      subtitle="Registra proveedores y controla los pagos pendientes."
    >
      <GuardAdmin>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid shrink-0 gap-3 sm:grid-cols-3">
            <KpiCard
              featured
              label="Proveedores"
              value={String(suppliers.length)}
              icon={Truck}
              hint="Activos en el sistema"
            />
            <KpiCard
              label="Saldo pendiente"
              value={formatMoney(totalDebt)}
              icon={Wallet}
              hint="Por pagar a proveedores"
              tone="amber"
            />
            <KpiCard
              label="Pagos registrados"
              value={formatMoney(totalPaid)}
              icon={Banknote}
              hint={`${allPayments.length} movimiento${allPayments.length === 1 ? "" : "s"}`}
              tone="teal"
            />
          </div>

          <div className="grid min-h-0 flex-1 items-start gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
            {/* Formulario */}
            <Panel className="h-fit !p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                    {editing ? <Pencil size={16} /> : <Plus size={16} />}
                  </span>
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                    {editing ? "Editar proveedor" : "Nuevo proveedor"}
                  </h2>
                </div>
                {editing ? (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg-soft)]"
                    onClick={resetForm}
                    title="Cancelar edición"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <form onSubmit={onSubmit} className="space-y-3">
                <Field label="Nombre">
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                    placeholder="Ej. Distribuidora del Sur"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Teléfono">
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="5555-0000"
                    />
                  </Field>
                  <Field label="Saldo adeudado">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={form.balance}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, balance: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </Field>
                </div>
                <Field label="Correo">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="correo@ejemplo.com"
                  />
                </Field>
                <Field label="Dirección">
                  <input
                    className={inputClass}
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Notas">
                  <textarea
                    className={`${inputClass} min-h-[4.5rem] resize-y`}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Condiciones, días de crédito…"
                  />
                </Field>
                {error ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}
                <button type="submit" className={`${buttonPrimary} w-full`}>
                  {editing ? "Guardar cambios" : "Registrar proveedor"}
                </button>
              </form>
            </Panel>

            {/* Listado */}
            <Panel className="flex min-h-0 flex-col !p-0">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-[var(--navy)]" />
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                    Listado
                  </h2>
                </div>
                <span className="rounded-lg bg-[var(--bg-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
                  {suppliers.length}
                </span>
              </div>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {suppliers.map((s) => {
                  const active = selectedId === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-[var(--navy)]/30 bg-[var(--slate-soft)] shadow-sm"
                            : "border-[var(--line)] bg-white hover:border-[var(--navy)]/20"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--navy)] text-sm font-bold text-white">
                          {s.name[0]?.toUpperCase() ?? "P"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-[var(--ink)]">
                            {s.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                            {s.phone ? (
                              <>
                                <Phone size={11} />
                                {s.phone}
                              </>
                            ) : (
                              "Sin teléfono"
                            )}
                          </span>
                          <span
                            className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              s.balance > 0
                                ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                                : "bg-[var(--teal-soft)] text-[var(--teal)]"
                            }`}
                          >
                            {s.balance > 0
                              ? `Debe ${formatMoney(s.balance)}`
                              : "Al día"}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col gap-1">
                          <span
                            role="button"
                            tabIndex={0}
                            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white hover:text-[var(--navy)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(s);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                openEdit(s);
                              }
                            }}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              void askDelete(s);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                void askDelete(s);
                              }
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {suppliers.length === 0 ? (
                  <li className="px-4 py-12 text-center text-sm text-[var(--muted)]">
                    Aún no hay proveedores. Registra el primero a la izquierda.
                  </li>
                ) : null}
              </ul>
            </Panel>

            {/* Pagos */}
            <aside className="flex min-h-0 w-full flex-col gap-3 self-start lg:sticky lg:top-3 lg:max-h-[calc(100dvh-5.5rem)]">
              <Panel className="flex max-h-[inherit] min-h-0 flex-col overflow-hidden !p-4">
                <div className="mb-3 flex shrink-0 items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal-soft)] text-[var(--teal)]">
                    <Wallet size={16} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                      Pagos
                    </h2>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {selected
                        ? selected.name
                        : "Selecciona un proveedor"}
                    </p>
                  </div>
                </div>

                {selected ? (
                  <>
                    <div className="mb-3 shrink-0 rounded-xl bg-[var(--bg-soft)] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Saldo actual
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-[var(--ink)]">
                        {formatMoney(selected.balance)}
                      </p>
                    </div>

                    <form
                      onSubmit={onPay}
                      className="mb-3 shrink-0 space-y-2 border-b border-[var(--line)] pb-3"
                    >
                      <Field label="Monto a pagar">
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          className={inputClass}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          required
                          placeholder="0.00"
                        />
                      </Field>
                      <Field label="Método">
                        <select
                          className={inputClass}
                          value={payMethod}
                          onChange={(e) =>
                            setPayMethod(e.target.value as SupplierPaymentMethod)
                          }
                        >
                          {METHODS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Nota">
                        <input
                          className={inputClass}
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Opcional"
                        />
                      </Field>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--teal)]"
                          checked={printTicket}
                          onChange={(e) => setPrintTicket(e.target.checked)}
                        />
                        <Printer size={15} className="shrink-0 text-[var(--muted)]" />
                        <span>Imprimir ticket al registrar</span>
                      </label>
                      <button
                        type="submit"
                        className={`${buttonPrimary} w-full`}
                        disabled={Boolean(pdfBusy)}
                      >
                        <Banknote size={16} />
                        {printTicket ? "Registrar e imprimir" : "Registrar pago"}
                      </button>
                    </form>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Historial
                      </p>
                      <ul className="space-y-2">
                        {selectedPayments.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[var(--teal)]">
                                {formatMoney(p.amount)}
                              </p>
                              <p className="text-[11px] text-[var(--muted)]">
                                {METHODS.find((m) => m.id === p.method)?.label}{" "}
                                · {formatDate(p.paidAt)}
                              </p>
                              <p className="truncate text-[11px] text-[var(--muted)]">
                                {p.userName}
                                {p.note ? ` · ${p.note}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--slate-soft)] hover:text-[var(--navy)] disabled:opacity-50"
                              disabled={
                                pdfBusy === p.id ||
                                pdfBusy === `ticket-${p.id}`
                              }
                              onClick={() => void printPaymentTicket(p)}
                              title="Imprimir ticket"
                            >
                              <Printer size={14} />
                            </button>
                            <PdfIconButton
                              title="Descargar PDF"
                              disabled={
                                pdfBusy === p.id ||
                                pdfBusy === `ticket-${p.id}`
                              }
                              onClick={() => void printPayment(p)}
                            />
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                void askDeletePayment(p.id, p.amount)
                              }
                              title="Eliminar pago"
                            >
                              <Trash2 size={14} />
                            </button>
                            </div>
                          </li>
                        ))}
                        {selectedPayments.length === 0 ? (
                          <li className="py-6 text-center text-xs text-[var(--muted)]">
                            Sin pagos registrados
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm text-[var(--muted)]">
                    <Wallet size={28} className="opacity-40" />
                    Elige un proveedor para ver y registrar pagos
                  </div>
                )}
              </Panel>
            </aside>
          </div>

          {/* Historial general de pagos */}
          <Panel className="shrink-0 !p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--slate-soft)] text-[var(--navy)]">
                  <History size={16} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight">
                    Historial de pagos registrados
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    {allPayments.length} pago
                    {allPayments.length === 1 ? "" : "s"} · Total{" "}
                    {formatMoney(totalPaid)}
                  </p>
                </div>
              </div>
              <PdfIconButton
                title="Imprimir historial completo en PDF"
                disabled={pdfBusy === "all" || allPayments.length === 0}
                onClick={() => void printFullHistory()}
              />
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
              {/* Móvil: cards */}
              <ul className="space-y-2 p-3 md:hidden">
                {allPayments.map((p) => {
                  const supplier = supplierById.get(p.supplierId);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {supplier?.name ?? "Proveedor"}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {METHODS.find((m) => m.id === p.method)?.label} ·{" "}
                          {formatDate(p.paidAt)}
                        </p>
                        <p className="font-semibold text-[var(--teal)]">
                          {formatMoney(p.amount)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--slate-soft)] hover:text-[var(--navy)] disabled:opacity-50"
                          disabled={
                            pdfBusy === p.id || pdfBusy === `ticket-${p.id}`
                          }
                          onClick={() => void printPaymentTicket(p)}
                          title="Imprimir ticket"
                        >
                          <Printer size={14} />
                        </button>
                        <PdfIconButton
                          title="Descargar PDF"
                          disabled={
                            pdfBusy === p.id || pdfBusy === `ticket-${p.id}`
                          }
                          onClick={() => void printPayment(p)}
                        />
                      </div>
                    </li>
                  );
                })}
                {allPayments.length === 0 ? (
                  <li className="py-10 text-center text-sm text-[var(--muted)]">
                    Aún no hay pagos registrados.
                  </li>
                ) : null}
              </ul>

              {/* Desktop: tabla */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-4 py-2.5 font-semibold">Fecha</th>
                      <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                      <th className="px-4 py-2.5 font-semibold">Método</th>
                      <th className="px-4 py-2.5 font-semibold">Registró</th>
                      <th className="px-4 py-2.5 font-semibold text-right">
                        Monto
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((p) => {
                      const supplier = supplierById.get(p.supplierId);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-[var(--line)]/70 last:border-0"
                        >
                          <td className="px-4 py-2.5 text-[var(--muted)]">
                            {formatDate(p.paidAt)}
                          </td>
                          <td className="px-4 py-2.5 font-medium">
                            {supplier?.name ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 capitalize text-[var(--muted)]">
                            {METHODS.find((m) => m.id === p.method)?.label ??
                              p.method}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--muted)]">
                            {p.userName}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--teal)]">
                            {formatMoney(p.amount)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--slate-soft)] hover:text-[var(--navy)] disabled:opacity-50"
                                disabled={
                                  pdfBusy === p.id ||
                                  pdfBusy === `ticket-${p.id}`
                                }
                                onClick={() => void printPaymentTicket(p)}
                                title="Imprimir ticket"
                              >
                                <Printer size={14} />
                              </button>
                              <PdfIconButton
                                title="Descargar PDF"
                                disabled={
                                  pdfBusy === p.id ||
                                  pdfBusy === `ticket-${p.id}`
                                }
                                onClick={() => void printPayment(p)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {allPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-[var(--muted)]"
                        >
                          Aún no hay pagos registrados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>
      </GuardAdmin>
    </AppShell>
  );
}
