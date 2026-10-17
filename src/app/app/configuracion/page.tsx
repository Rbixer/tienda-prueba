"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  MapPin,
  Palette,
  Search,
  Settings,
  Trash2,
  Wallet,
} from "lucide-react";
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
import { UsersPanel } from "@/components/UsersPanel";
import { compressImageFile } from "@/lib/image";
import { DEFAULT_PDF_STYLE, isCashFloatLocked, normalizePdfStyle } from "@/lib/store";
import type { PdfStyleSettings, PdfTextStyle } from "@/lib/types";

function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`${inputClass} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        required
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ChangePasswordPanel() {
  const { session } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    setError(null);
    if (!session) return;
    if (next.trim().length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setSaving(true);
    try {
      const { apiChangePassword } = await import("@/lib/sync");
      await apiChangePassword(current, next.trim());
      setOk("Contraseña actualizada correctamente.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="mx-auto w-full max-w-lg">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
          <KeyRound size={18} />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Mi cuenta
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Cambia tu contraseña de acceso ({session?.username ?? ""})
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Contraseña actual">
          <PasswordField value={current} onChange={setCurrent} />
        </Field>
        <Field label="Nueva contraseña">
          <PasswordField
            value={next}
            onChange={setNext}
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <Field label="Confirmar nueva contraseña">
          <PasswordField value={confirm} onChange={setConfirm} />
        </Field>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {ok}
          </p>
        ) : null}

        <button
          type="submit"
          className={`${buttonPrimary} w-full`}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Actualizar contraseña"}
        </button>
      </form>
    </Panel>
  );
}

export default function ConfiguracionPage() {
  const { data, updateSettings, saveSatCredentials } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [nit, setNit] = useState("");
  const [invoiceSeries, setInvoiceSeries] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [pdfStyle, setPdfStyle] = useState<PdfStyleSettings>(DEFAULT_PDF_STYLE);
  const [cashMode, setCashMode] = useState<"fija" | "libre">("libre");
  const [cashAmount, setCashAmount] = useState("");
  const [satUsuario, setSatUsuario] = useState("");
  const [satClave, setSatClave] = useState("");
  const [satSaving, setSatSaving] = useState(false);
  const [satError, setSatError] = useState<string | null>(null);
  const [satOk, setSatOk] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    setCompanyName(data.settings?.companyName ?? "");
    setSlogan(data.settings?.slogan ?? "");
    setAddress(data.settings?.address ?? "");
    setPhone(data.settings?.phone ?? "");
    setNit(data.settings?.nit ?? "");
    setInvoiceSeries(data.settings?.invoiceSeries ?? "");
    setLogo(data.settings?.logo ?? null);
    setPdfStyle(normalizePdfStyle(data.settings?.pdfStyle));
    setCashMode(isCashFloatLocked(data.settings ?? {}) ? "fija" : "libre");
    setCashAmount(
      typeof data.settings?.cashFloat === "number"
        ? String(data.settings.cashFloat)
        : "",
    );
    setSatUsuario(data.settings?.satUsuario ?? "");
    setHydrated(true);
  }, [data.settings, hydrated]);

  function patchTextStyle(
    key: "companyName" | "slogan" | "contact",
    patch: Partial<PdfTextStyle>,
  ) {
    setPdfStyle((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  async function onPickLogo(file: File | undefined) {
    if (!file) return;
    setLoadingImage(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file, 360, 0.85);
      setLogo(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el logo.");
    } finally {
      setLoadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const quota = Number(cashAmount);
    if (cashMode === "fija" && (!cashAmount.trim() || !Number.isFinite(quota) || quota < 0)) {
      setError("Indica la cuota fija de la caja.");
      setOk(null);
      return;
    }
    const err = updateSettings({
      companyName,
      slogan,
      address,
      phone,
      nit,
      invoiceSeries,
      logo: logo ?? null,
      pdfStyle,
      cashFloatMode: cashMode,
      cashFloat: cashMode === "fija" ? quota : undefined,
    });
    if (err) {
      setError(err);
      setOk(null);
      return;
    }
    setError(null);
    setOk("Configuración guardada. Se aplica en login, menú y PDFs.");
  }

  async function onSaveSat() {
    setSatSaving(true);
    setSatError(null);
    setSatOk(null);
    const err = await saveSatCredentials({
      usuario: satUsuario,
      clave: satClave,
    });
    setSatSaving(false);
    if (err) {
      setSatError(err);
      return;
    }
    setSatClave("");
    setSatOk(
      satUsuario.trim()
        ? "Consulta de NIT guardada. En el cobro el nombre se llena solo."
        : "Consulta de NIT desactivada.",
    );
  }

  const previewContact = [address.trim(), phone.trim() ? `Tel. ${phone.trim()}` : ""]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <AppShell
      title="Configuración"
      subtitle="Empresa, caja y documentos."
    >
      <GuardAdmin>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Panel>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Settings size={18} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Empresa
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Nombre, slogan y logo
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Nombre de la empresa">
                  <input
                    className={inputClass}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nombre de la tienda"
                  />
                </Field>

                <Field label="Slogan">
                  <input
                    className={inputClass}
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Lo del día, cerca de ti"
                    maxLength={80}
                  />
                </Field>

                <Field label="Logo">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt="Logo"
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <ImagePlus size={24} className="text-[var(--muted)]" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onPickLogo(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className={buttonSecondary}
                        disabled={loadingImage}
                        onClick={() => fileRef.current?.click()}
                      >
                        <ImagePlus size={16} />
                        {loadingImage ? "Cargando..." : "Subir logo"}
                      </button>
                      {logo ? (
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() => setLogo(null)}
                        >
                          <Trash2 size={16} />
                          Quitar logo
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Wallet size={18} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Apertura de caja
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Cuota fija bloqueada o monto libre cada día
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--slate-soft)] p-1 ring-1 ring-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setCashMode("fija")}
                  className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    cashMode === "fija"
                      ? "bg-[var(--navy)] text-white shadow-[0_2px_8px_rgba(59,36,24,0.25)]"
                      : "text-[var(--muted)] hover:text-[var(--navy)]"
                  }`}
                >
                  Cuota fija
                </button>
                <button
                  type="button"
                  onClick={() => setCashMode("libre")}
                  className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    cashMode === "libre"
                      ? "bg-[var(--navy)] text-white shadow-[0_2px_8px_rgba(59,36,24,0.25)]"
                      : "text-[var(--muted)] hover:text-[var(--navy)]"
                  }`}
                >
                  Libre
                </button>
              </div>
              {cashMode === "fija" ? (
                <div className="mt-4">
                  <Field label="Cuota fija">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      required
                    />
                  </Field>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Este monto queda bloqueado. Al aperturar solo se confirma y no se puede cambiar.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--muted)]">
                  Cada día se escribe el fondo al aperturar. El monto no queda bloqueado.
                </p>
              )}
            </Panel>

            <Panel>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--slate-soft)] text-[var(--navy)]">
                  <MapPin size={18} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Contacto
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Aparece bajo el slogan en los PDFs
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dirección">
                  <input
                    className={inputClass}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, zona, municipio"
                    maxLength={120}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    className={inputClass}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 5555-1234"
                    maxLength={40}
                  />
                </Field>
                <Field label="NIT emisor">
                  <input
                    className={inputClass}
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="NIT del establecimiento"
                    maxLength={20}
                  />
                </Field>
                <Field label="Serie de factura">
                  <input
                    className={inputClass}
                    value={invoiceSeries}
                    onChange={(e) => setInvoiceSeries(e.target.value)}
                    placeholder="A"
                    maxLength={8}
                  />
                </Field>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                La factura es un comprobante interno. No sustituye la factura electrónica certificada por la SAT hasta contratar un certificador.
              </p>
            </Panel>

            <Panel>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Search size={18} />
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                      Consulta de NIT
                    </h2>
                    <p className="text-xs text-[var(--muted)]">
                      {data.settings?.satConfigured
                        ? "Activa. El cobro busca el nombre en la SAT."
                        : "Modo de prueba: el cobro llena «Contribuyente de prueba» hasta que guardes el usuario y la clave."}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Usuario Infile">
                    <input
                      className={inputClass}
                      value={satUsuario}
                      onChange={(e) => setSatUsuario(e.target.value)}
                      placeholder="Código de emisor"
                      autoComplete="off"
                      maxLength={80}
                    />
                  </Field>
                  <Field label="Clave de consulta">
                    <PasswordField
                      value={satClave}
                      onChange={setSatClave}
                      placeholder={
                        data.settings?.satConfigured
                          ? "Dejar en blanco para no cambiar"
                          : "Clave del servicio de NIT"
                      }
                    />
                  </Field>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Usa el usuario y la clave del servicio de consulta de NIT de Infile. Ese servicio devuelve el nombre registrado en la SAT. No es la contraseña de Agencia Virtual y no certifica la factura. Deja el usuario vacío para desactivar la búsqueda.
                </p>
                {satError ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {satError}
                  </p>
                ) : null}
                {satOk ? (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {satOk}
                  </p>
                ) : null}
                <button
                  type="button"
                  className={`${buttonPrimary} w-full sm:w-auto`}
                  disabled={satSaving}
                  onClick={() => void onSaveSat()}
                >
                  {satSaving ? "Guardando..." : "Guardar consulta de NIT"}
                </button>
              </div>
            </Panel>

            <Panel>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--amber-soft)] text-[var(--amber)]">
                  <Palette size={18} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Estilos del PDF
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Negrita, cursiva y color para el encabezado
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <Field label="Color de acento (barra y títulos)">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pdfStyle.accentColor ?? "#e06a1f"}
                      onChange={(e) =>
                        setPdfStyle((p) => ({
                          ...p,
                          accentColor: e.target.value,
                        }))
                      }
                      className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-white p-1"
                    />
                    <input
                      className={`${inputClass} max-w-[9rem] font-mono uppercase`}
                      value={pdfStyle.accentColor ?? "#e06a1f"}
                      onChange={(e) =>
                        setPdfStyle((p) => ({
                          ...p,
                          accentColor: e.target.value,
                        }))
                      }
                      maxLength={7}
                    />
                  </div>
                </Field>
              </div>

              <div className="space-y-3">
                <StyleRow
                  label="Nombre de la empresa"
                  style={pdfStyle.companyName}
                  onChange={(patch) => patchTextStyle("companyName", patch)}
                />
                <StyleRow
                  label="Slogan"
                  style={pdfStyle.slogan}
                  onChange={(patch) => patchTextStyle("slogan", patch)}
                />
                <StyleRow
                  label="Dirección y teléfono"
                  style={pdfStyle.contact}
                  onChange={(patch) => patchTextStyle("contact", patch)}
                />
              </div>

              {/* Vista previa */}
              <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                <div
                  className="h-1.5 w-full"
                  style={{ background: pdfStyle.accentColor ?? "#e06a1f" }}
                />
                <div className="flex gap-3 p-4">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--muted)]">
                      <ImagePlus size={18} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p
                      className="truncate text-lg leading-tight"
                      style={{
                        color: pdfStyle.companyName?.color ?? "#3b2418",
                        fontWeight: pdfStyle.companyName?.bold ? 700 : 500,
                        fontStyle: pdfStyle.companyName?.italic
                          ? "italic"
                          : "normal",
                      }}
                    >
                      {companyName || "Nombre"}
                    </p>
                    <p
                      className="mt-0.5 truncate text-sm"
                      style={{
                        color: pdfStyle.slogan?.color ?? "#64748b",
                        fontWeight: pdfStyle.slogan?.bold ? 700 : 400,
                        fontStyle: pdfStyle.slogan?.italic ? "italic" : "normal",
                      }}
                    >
                      {slogan || "Slogan"}
                    </p>
                    {previewContact ? (
                      <p
                        className="mt-1 truncate text-xs"
                        style={{
                          color: pdfStyle.contact?.color ?? "#334155",
                          fontWeight: pdfStyle.contact?.bold ? 700 : 400,
                          fontStyle: pdfStyle.contact?.italic
                            ? "italic"
                            : "normal",
                        }}
                      >
                        {previewContact}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Agrega dirección o teléfono para verlos aquí
                      </p>
                    )}
                  </div>
                </div>
                <p className="border-t border-[var(--line)] bg-[var(--bg-soft)] px-4 py-2 text-[11px] text-[var(--muted)]">
                  Vista previa del encabezado del PDF
                </p>
              </div>
            </Panel>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {ok ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {ok}
              </p>
            ) : null}

            <button type="submit" className={`${buttonPrimary} w-full sm:w-auto`}>
              Guardar cambios
            </button>
          </form>

          <UsersPanel />
          <ChangePasswordPanel />
        </div>
      </GuardAdmin>
    </AppShell>
  );
}

function StyleRow({
  label,
  style,
  onChange,
}: {
  label: string;
  style?: PdfTextStyle;
  onChange: (patch: Partial<PdfTextStyle>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="Negrita"
          onClick={() => onChange({ bold: !style?.bold })}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition ${
            style?.bold
              ? "border-[var(--navy)] bg-[var(--navy)] text-white"
              : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--navy)]/40"
          }`}
        >
          B
        </button>
        <button
          type="button"
          title="Cursiva"
          onClick={() => onChange({ italic: !style?.italic })}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm italic transition ${
            style?.italic
              ? "border-[var(--navy)] bg-[var(--navy)] text-white"
              : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--navy)]/40"
          }`}
        >
          I
        </button>
        <input
          type="color"
          value={style?.color ?? "#3b2418"}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-9 w-11 cursor-pointer rounded-lg border border-[var(--line)] bg-white p-1"
          title="Color"
        />
        <input
          className={`${inputClass} !py-2 max-w-[7.5rem] font-mono text-xs uppercase`}
          value={style?.color ?? "#3b2418"}
          onChange={(e) => onChange({ color: e.target.value })}
          maxLength={7}
        />
      </div>
    </div>
  );
}
