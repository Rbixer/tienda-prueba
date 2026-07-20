"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, Download, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductThumb } from "@/components/ProductThumb";
import {
  Field,
  Panel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { compressImageFile } from "@/lib/image";
import { formatMoney, getCostPrice } from "@/lib/store";
import { downloadInventoryPdf } from "@/lib/pdf";
import type { Product } from "@/lib/types";
export default function InventarioPage() {
  const {
    branchProducts,
    currentBranchName,
    addProduct,
    updateProduct,
    deleteProduct,
    session,
  } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branchProducts;
    return branchProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [branchProducts, query]);
  function closeModal() {
    setOpen(false);
    setName("");
    setCostPrice("");
    setPrice("");
    setQuantity("");
    setImage(null);
    setEditing(null);
    setError(null);
    setLoadingImage(false);
  }
  function openCreate() {
    setEditing(null);
    setName("");
    setCostPrice("");
    setPrice("");
    setQuantity("");
    setImage(null);
    setError(null);
    setOpen(true);
  }
  function startEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setCostPrice(String(getCostPrice(product)));
    setPrice(String(product.price));
    setQuantity(String(product.quantity));
    setImage(product.image ?? null);
    setError(null);
    setOpen(true);
  }
  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setLoadingImage(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      setImage(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar la foto.",
      );
    } finally {
      setLoadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!image) {
      setError("Agrega una fotografía del producto.");
      return;
    }
    const payload = {
      name,
      costPrice: Number(costPrice),
      price: Number(price),
      quantity: Number(quantity),
      image,
    };
    const err = editing
      ? updateProduct(editing.id, payload)
      : addProduct(payload);
    if (err) {
      setError(err);
      return;
    }
    closeModal();
  }
  async function onDownload() {
    setDownloading(true);
    try {
      await downloadInventoryPdf(branchProducts, currentBranchName);
    } finally {
      setDownloading(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <AppShell
      title="Inventario"
      subtitle={`Control de productos en ${currentBranchName}. Listado y descarga PDF.`}
    >
      <Panel className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold sm:text-xl">
              Listado
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {filtered.length} producto
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${buttonSecondary} min-h-11 flex-1 sm:flex-none`}
              onClick={onDownload}
              disabled={downloading || branchProducts.length === 0}
            >
              <Download size={16} />
              <span className="hidden sm:inline">
                {downloading ? "Generando..." : "Descargar PDF"}
              </span>
              <span className="sm:hidden">
                {downloading ? "..." : "PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] sm:px-4"
              aria-label="Agregar producto"
              title="Agregar producto"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>
        <input
          className={`${inputClass} mb-3 shrink-0 text-base sm:text-sm`}
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto md:hidden">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)] p-3"
            >
              <div className="flex items-start gap-3">
                <ProductThumb
                  src={product.image}
                  alt={product.name}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--brand)]">
                        Venta {formatMoney(product.price)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Costo {formatMoney(getCostPrice(product))}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                        product.quantity <= 5
                          ? "bg-amber-100 text-amber-800"
                          : "bg-white text-[var(--muted)]"
                      }`}
                    >
                      Stock {product.quantity}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
                <p className="text-xs text-[var(--muted)]">
                  Valor costo:{" "}
                  {formatMoney(getCostPrice(product) * product.quantity)}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-[var(--brand)]"
                    onClick={() => startEdit(product)}
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  {session?.role === "administrador" ? (
                    <button
                      type="button"
                      className="rounded-lg bg-white p-2.5 text-[var(--muted)] shadow-sm hover:text-red-600"
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar "${product.name}" del inventario?`,
                          )
                        ) {
                          deleteProduct(product.id);
                        }
                      }}
                      aria-label="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No hay productos para mostrar.
            </p>
          ) : null}
        </div>
        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium">Costo</th>
                <th className="pb-2 font-medium">Venta</th>
                <th className="pb-2 font-medium">Cant.</th>
                <th className="pb-2 font-medium">Valor costo</th>
                <th className="pb-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--line)]/70 last:border-0"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb
                        src={product.image}
                        alt={product.name}
                        size="sm"
                      />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    {formatMoney(getCostPrice(product))}
                  </td>
                  <td className="py-3 font-medium text-[var(--brand)]">
                    {formatMoney(product.price)}
                  </td>
                  <td className="py-3">
                    <span
                      className={
                        product.quantity <= 5
                          ? "rounded-md bg-amber-100 px-2 py-0.5 text-amber-800"
                          : ""
                      }
                    >
                      {product.quantity}
                    </span>
                  </td>
                  <td className="py-3">
                    {formatMoney(getCostPrice(product) * product.quantity)}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                        onClick={() => startEdit(product)}
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      {session?.role === "administrador" ? (
                        <button
                          type="button"
                          className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            if (
                              confirm(
                                `¿Eliminar "${product.name}" del inventario?`,
                              )
                            ) {
                              deleteProduct(product.id);
                            }
                          }}
                          aria-label="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[var(--muted)]"
                  >
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      <button
        type="button"
        onClick={openCreate}
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30 transition hover:bg-[var(--brand-dark)] md:hidden"
        style={{
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "calc(5.25rem + env(safe-area-inset-bottom))",
        }}
        aria-label="Agregar producto"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-[2px]"
            aria-label="Cerrar"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="producto-modal-title"
            className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto animate-[fadeUp_0.25s_ease] rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="producto-modal-title"
                  className="font-[family-name:var(--font-display)] text-xl font-semibold"
                >
                  {editing ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Foto, costo, venta y cantidad.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <Field label="Fotografía">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] p-3">
                  {image ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt="Vista previa"
                        className="h-20 w-20 rounded-xl object-cover ring-1 ring-[var(--line)]"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm text-[var(--muted)]">
                          Foto lista. Puedes cambiarla si quieres.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={buttonSecondary}
                            onClick={() => fileRef.current?.click()}
                            disabled={loadingImage}
                          >
                            <Camera size={16} />
                            Cambiar
                          </button>
                          <button
                            type="button"
                            className={buttonSecondary}
                            onClick={() => setImage(null)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={loadingImage}
                      className="flex w-full flex-col items-center gap-2 rounded-xl px-3 py-6 text-center transition hover:bg-white"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--brand)] shadow-sm">
                        {loadingImage ? (
                          <span className="h-5 w-5 animate-pulse rounded-full bg-[var(--brand)]/30" />
                        ) : (
                          <ImagePlus size={22} />
                        )}
                      </span>
                      <span className="text-sm font-medium text-[var(--ink)]">
                        {loadingImage
                          ? "Procesando foto..."
                          : "Tomar o subir fotografía"}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        Obligatoria para registrar el producto
                      </span>
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Nombre del producto">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Aceite 1L"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio costo (Q)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--muted)]">
                      Q
                    </span>
                    <input
                      className={`${inputClass} pl-8 text-base sm:text-sm`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </Field>
                <Field label="Precio venta (Q)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--muted)]">
                      Q
                    </span>
                    <input
                      className={`${inputClass} pl-8 text-base sm:text-sm`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </Field>
              </div>
              <Field label="Cantidad">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </Field>
              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button
                  type="submit"
                  className={`${buttonPrimary} min-h-11 w-full sm:flex-1`}
                  disabled={loadingImage}
                >
                  {editing ? "Guardar cambios" : "Agregar producto"}
                </button>
                <button
                  type="button"
                  className={`${buttonSecondary} min-h-11 w-full sm:w-auto`}
                  onClick={closeModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
