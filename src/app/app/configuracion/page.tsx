"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  MapPin,
  Palette,
  Settings,
  Trash2,
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
import { compressImageFile } from "@/lib/image";
import { DEFAULT_PDF_STYLE, normalizePdfStyle } from "@/lib/store";
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
  const { data, session, updateUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    if (!session) return;
    const me = data.users.find((u) => u.id === session.userId);
    if (!me) {
      setError("No se encontró tu usuario.");
      return;
    }
    if (me.password !== current) {
      setError("La contraseña actual no es correcta.");
      return;
    }
    if (next.trim().length < 4) {
      setError("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    const err = updateUser(session.userId, { password: next.trim() });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setOk("Contraseña actualizada correctamente.");
    setCurrent("");
    setNext("");
    setConfirm("");
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
            placeholder="Mínimo 4 caracteres"
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

        <button type="submit" className={`${buttonPrimary} w-full`}>
          Actualizar contraseña
        </button>
      </form>
    </Panel>
  );
}

export default function ConfiguracionPage() {
  const { data, updateSettings } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [pdfStyle, setPdfStyle] = useState<PdfStyleSettings>(DEFAULT_PDF_STYLE);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    setCompanyName(data.settings?.companyName ?? "MI BARRIO");
    setSlogan(
      data.settings?.slogan ?? "Tu tienda de confianza en el barrio",
    );
    setAddress(data.settings?.address ?? "");
    setPhone(data.settings?.phone ?? "");
    setLogo(data.settings?.logo ?? null);
    setPdfStyle(normalizePdfStyle(data.settings?.pdfStyle));
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
    const err = updateSettings({
      companyName,
      slogan,
      address,
      phone,
      logo: logo ?? null,
      pdfStyle,
    });
    if (err) {
      setError(err);
      setOk(null);
      return;
    }
    setError(null);
    setOk("Configuración guardada. Se aplica en login, menú y PDFs.");
  }

  const previewContact = [address.trim(), phone.trim() ? `Tel. ${phone.trim()}` : ""]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <AppShell
      title="Configuración"
      subtitle="Datos de la empresa, contacto y estilos tipográficos para los PDFs."
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
                    required
                  />
                </Field>

                <Field label="Slogan">
                  <input
                    className={inputClass}
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Tu tienda de confianza en el barrio"
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
                      value={pdfStyle.accentColor ?? "#0b2545"}
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
                      value={pdfStyle.accentColor ?? "#0b2545"}
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
                  style={{ background: pdfStyle.accentColor ?? "#0b2545" }}
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
                        color: pdfStyle.companyName?.color ?? "#0b2545",
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
          value={style?.color ?? "#0b2545"}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-9 w-11 cursor-pointer rounded-lg border border-[var(--line)] bg-white p-1"
          title="Color"
        />
        <input
          className={`${inputClass} !py-2 max-w-[7.5rem] font-mono text-xs uppercase`}
          value={style?.color ?? "#0b2545"}
          onChange={(e) => onChange({ color: e.target.value })}
          maxLength={7}
        />
      </div>
    </div>
  );
}
