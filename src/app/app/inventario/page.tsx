"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, ImagePlus, Pencil, Plus, ScanBarcode, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarcodeCapture } from "@/components/BarcodeCapture";
import { ProductThumb } from "@/components/ProductThumb";
import {
  Field,
  Panel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastContext";
import { compressImageFile } from "@/lib/image";
import { downloadInventoryExcel, parseInventoryExcel } from "@/lib/excel";
import { formatMoney, getCostPrice } from "@/lib/store";
import { downloadInventoryPdf } from "@/lib/pdf";
import {
  PHARMACY_CATEGORIES,
  PRESENTATION_SUGGESTIONS,
  categoryLabel,
  expiryBadge,
  productSearchText,
  productSubtitle,
  type PharmacyCategory,
} from "@/lib/pharmacy";
import type { Product } from "@/lib/types";

function ExcelLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="3" y="2" width="18" height="20" rx="2.5" fill="#217346" />
      <path
        d="M7.2 7.2h9.6v1.6H7.2V7.2Zm0 4h9.6v1.6H7.2v-1.6Zm0 4h6.4v1.6H7.2v-1.6Z"
        fill="#fff"
        opacity="0.35"
      />
      <path
        d="M8.1 7.4 12 12l-3.9 4.6h2.2L12.9 13l2.5 3.9h2.2L13.7 12l3.9-4.6h-2.2L12.9 11 10.3 7.4H8.1Z"
        fill="#fff"
      />
    </svg>
  );
}

function PdfLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        fill="#E11D48"
      />
      <path d="M14 2v4h4" fill="#FB7185" />
      <path
        d="M7.5 15.5V9.2h2.1c1.2 0 1.9.6 1.9 1.55 0 .95-.7 1.55-1.9 1.55H8.7v3.2H7.5Zm1.2-4.3h.8c.45 0 .75-.2.75-.55s-.3-.55-.75-.55h-.8v1.1Zm4.15 4.3c-1.25 0-2-.75-2-1.95v-2.4c0-1.2.75-1.95 2-1.95s2 .75 2 1.95v2.4c0 1.2-.75 1.95-2 1.95Zm0-1.1c.45 0 .75-.35.75-.85v-2.4c0-.5-.3-.85-.75-.85s-.75.35-.75.85v2.4c0 .5.3.85.75.85Zm3.05 1.1V9.2h1.2v5.2c0 1.05.45 1.35 1.15 1.35.15 0 .35 0 .5-.05v1.05c-.2.05-.45.1-.7.1-1.35 0-2.15-.7-2.15-2.15Z"
        fill="#fff"
      />
    </svg>
  );
}
export default function InventarioPage() {
  const {
    branchProducts,
    currentBranchName,
    addProduct,
    addLot,
    updateProduct,
    deleteProduct,
    importProducts,
    session,
    data,
  } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [genericName, setGenericName] = useState("");
  const [presentation, setPresentation] = useState("");
  const [concentration, setConcentration] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [lot, setLot] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [category, setCategory] = useState<PharmacyCategory | "">("");
  const [minStock, setMinStock] = useState("5");
  const [unitsPerBox, setUnitsPerBox] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitsPerBlister, setUnitsPerBlister] = useState("");
  const [blisterPrice, setBlisterPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branchProducts;
    return branchProducts.filter((p) => productSearchText(p).includes(q));
  }, [branchProducts, query]);
  function closeModal() {
    setOpen(false);
    setName("");
    setBarcode("");
    setCostPrice("");
    setPrice("");
    setQuantity("");
    setGenericName("");
    setPresentation("");
    setConcentration("");
    setLaboratory("");
    setLot("");
    setExpiresAt("");
    setCategory("");
    setMinStock("5");
    setUnitsPerBox("");
    setUnitPrice("");
    setUnitsPerBlister("");
    setBlisterPrice("");
    setImage(null);
    setEditing(null);
    setError(null);
    setLoadingImage(false);
  }
  function openCreate() {
    setEditing(null);
    setName("");
    setBarcode("");
    setCostPrice("");
    setPrice("");
    setQuantity("");
    setGenericName("");
    setPresentation("");
    setConcentration("");
    setLaboratory("");
    setLot("");
    setExpiresAt("");
    setCategory("");
    setMinStock("5");
    setUnitsPerBox("");
    setUnitPrice("");
    setUnitsPerBlister("");
    setBlisterPrice("");
    setImage(null);
    setError(null);
    setOpen(true);
  }
  function startEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setBarcode(product.barcode ?? "");
    setCostPrice(String(getCostPrice(product)));
    setPrice(String(product.price));
    setQuantity(String(product.quantity));
    setGenericName(product.genericName ?? "");
    setPresentation(product.presentation ?? "");
    setConcentration(product.concentration ?? "");
    setLaboratory(product.laboratory ?? "");
    setLot(product.lot ?? "");
    setExpiresAt(product.expiresAt ?? "");
    setCategory(product.category ?? "");
    setMinStock(String(product.minStock ?? 5));
    setUnitsPerBox(product.unitsPerBox ? String(product.unitsPerBox) : "");
    setUnitPrice(product.unitPrice !== undefined ? String(product.unitPrice) : "");
    setUnitsPerBlister(
      product.unitsPerBlister ? String(product.unitsPerBlister) : "",
    );
    setBlisterPrice(
      product.blisterPrice !== undefined ? String(product.blisterPrice) : "",
    );
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
    if (!barcode.trim()) {
      setError("Escanea o escribe el código de barras del producto.");
      return;
    }
    const duplicate = editing
      ? undefined
      : branchProducts.find((product) => product.barcode === barcode.trim());
    const extras = {
      minStock: Number(minStock || 5),
      unitsPerBox: unitsPerBox ? Number(unitsPerBox) : undefined,
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      unitsPerBlister: unitsPerBlister ? Number(unitsPerBlister) : undefined,
      blisterPrice: blisterPrice ? Number(blisterPrice) : undefined,
      controlled: false,
    };
    const payload = {
      name,
      barcode: barcode.trim(),
      costPrice: Number(costPrice),
      price: Number(price),
      quantity: Number(quantity),
      genericName,
      presentation,
      concentration,
      laboratory,
      lot,
      expiresAt,
      category: category || undefined,
      requiresPrescription: false,
      image,
      ...extras,
    };
    const err = duplicate
      ? addLot(duplicate.id, {
          lot,
          expiresAt,
          quantity: Number(quantity),
          costPrice: Number(costPrice),
        })
      : editing
        ? updateProduct(editing.id, payload)
        : addProduct(payload);
    if (err) {
      setError(err);
      return;
    }
    closeModal();
  }
  async function onDownloadPdf() {
    setDownloading("pdf");
    try {
      await downloadInventoryPdf({
        products: branchProducts,
        branchName: currentBranchName,
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
        logoDataUrl: data.settings?.logo,
        pdfStyle: data.settings?.pdfStyle,
      });
    } finally {
      setDownloading(null);
    }
  }
  async function onDownloadExcel() {
    setDownloading("excel");
    try {
      await downloadInventoryExcel(branchProducts, currentBranchName, {
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
      });
    } finally {
      setDownloading(null);
    }
  }
  async function onImportExcel(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const { rows } = await parseInventoryExcel(file);
      const result = importProducts(rows);
      if (result.error) {
        setImportMsg(result.error);
        toast.error(result.error, "Importación");
        return;
      }
      const msg = `Importado: ${result.created} nuevo(s), ${result.updated} actualizado(s).`;
      setImportMsg(msg);
      toast.success(msg, "Inventario");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo leer el Excel.";
      setImportMsg(msg);
      toast.error(msg, "Importación");
    } finally {
      setImporting(false);
      if (excelImportRef.current) excelImportRef.current.value = "";
    }
  }

  async function askDelete(product: Product) {
    const ok = await toast.confirm({
      title: "Eliminar producto",
      message: `¿Eliminar “${product.name}” del inventario? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (ok) {
      deleteProduct(product.id);
      toast.success(`“${product.name}” eliminado.`, "Inventario");
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
    <BarcodeCapture
      onDetected={(code) => {
        setBarcode(code);
        setError(null);
      }}
    >
      {({ openCamera, busy }) => (
    <AppShell
      title="Inventario"
      subtitle="Productos, existencias y vencimientos."
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={excelImportRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => onImportExcel(e.target.files?.[0])}
            />
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--bg-soft)] disabled:opacity-50 sm:px-3.5"
              onClick={() => excelImportRef.current?.click()}
              disabled={importing || !!downloading}
              title="Subir Excel al inventario"
              aria-label="Subir Excel"
            >
              <ExcelLogo size={20} />
              <span className="hidden sm:inline">
                {importing ? "Importando..." : "Subir"}
              </span>
            </button>

            <div
              className="relative inline-flex min-h-11 min-w-[10.5rem] flex-1 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-soft)] p-1 sm:flex-none sm:min-w-[11.5rem]"
              role="group"
              aria-label="Descargar inventario"
            >
              <span
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm ring-1 ring-[var(--line)] transition-transform duration-300 ease-out ${
                  exportFormat === "pdf"
                    ? "translate-x-[calc(100%+0.25rem)]"
                    : "translate-x-0"
                }`}
                aria-hidden
              />
              <button
                type="button"
                className={`relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors ${
                  exportFormat === "excel"
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)]"
                }`}
                disabled={!!downloading || importing}
                onClick={() => {
                  setExportFormat("excel");
                  void onDownloadExcel();
                }}
              >
                <ExcelLogo size={16} />
                <span>
                  {downloading === "excel" ? "..." : "Excel"}
                </span>
              </button>
              <button
                type="button"
                className={`relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors ${
                  exportFormat === "pdf"
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)]"
                }`}
                disabled={
                  !!downloading ||
                  importing ||
                  branchProducts.length === 0
                }
                onClick={() => {
                  setExportFormat("pdf");
                  void onDownloadPdf();
                }}
              >
                <PdfLogo size={15} />
                <span>{downloading === "pdf" ? "..." : "PDF"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] lg:inline-flex"
              aria-label="Agregar producto"
              title="Agregar producto"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>
        {importMsg ? (
          <p
            className={`mb-3 shrink-0 rounded-xl px-3 py-2 text-sm ${
              importMsg.startsWith("Importado")
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {importMsg}
          </p>
        ) : null}
        <input
          className={`${inputClass} mb-3 shrink-0 text-base sm:text-sm`}
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-24 lg:hidden">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="rounded-md border border-[var(--line)] bg-[var(--bg-soft)] p-3"
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
                      {productSubtitle(product) ? (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {productSubtitle(product)}
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {product.category ? (
                          <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                            {categoryLabel(product.category)}
                          </span>
                        ) : null}
                        {expiryBadge(product.expiresAt) ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${expiryBadge(product.expiresAt)?.className}`}
                          >
                            {expiryBadge(product.expiresAt)?.label}
                          </span>
                        ) : null}
                      </div>
                      {product.barcode ? (
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
                          {product.barcode}
                          {product.lot ? ` · Lote ${product.lot}` : ""}
                        </p>
                      ) : null}
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
                        void askDelete(product);
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
        <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
          <table className="w-full text-left text-sm">
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
                      <span>
                        <span className="block font-medium">{product.name}</span>
                        {productSubtitle(product) ? (
                          <span className="block text-xs text-[var(--muted)]">
                            {productSubtitle(product)}
                          </span>
                        ) : null}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {product.category ? (
                            <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                              {categoryLabel(product.category)}
                            </span>
                          ) : null}
                          {expiryBadge(product.expiresAt) ? (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${expiryBadge(product.expiresAt)?.className}`}
                            >
                              {expiryBadge(product.expiresAt)?.label}
                            </span>
                          ) : null}
                          {product.lot ? (
                            <span className="text-[11px] text-[var(--muted)]">
                              Lote {product.lot}
                            </span>
                          ) : null}
                        </span>
                        {product.barcode ? (
                          <span className="font-mono text-[11px] text-[var(--muted)]">
                            {product.barcode}
                          </span>
                        ) : null}
                      </span>
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
                            void askDelete(product);
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
      {!open ? (
        <button
          type="button"
          onClick={openCreate}
          className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-md bg-[var(--brand)] text-white transition hover:bg-[var(--brand-dark)] lg:hidden"
          style={{
            right: "calc(5.5rem + env(safe-area-inset-right, 0px))",
            bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
          }}
          aria-label="Agregar producto"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      ) : null}
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
            className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto animate-[fadeUp_0.25s_ease] border border-[var(--line)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="producto-modal-title"
                  className="font-[family-name:var(--font-display)] text-xl font-semibold"
                >
                  {editing ? "Editar producto" : "Ingreso de inventario"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Ficha del producto. El lote y el vencimiento son opcionales.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
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
                <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--bg-soft)] p-3">
                  {image ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt="Vista previa"
                        className="h-20 w-20 rounded-md object-cover ring-1 ring-[var(--line)]"
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
                      className="flex w-full flex-col items-center gap-2 rounded-md px-3 py-6 text-center transition hover:bg-white"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-[var(--brand)] shadow-sm">
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
                        Opcional. Puedes registrar el producto sin foto.
                      </span>
                    </button>
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="Categoría">
                  <select
                    className={`${inputClass} text-base sm:text-sm`}
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as PharmacyCategory | "")
                    }
                    required
                  >
                    <option value="">Selecciona</option>
                    {PHARMACY_CATEGORIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Mínimo">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </Field>
                <Field label="Unid. por caja">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="number"
                    min={0}
                    value={unitsPerBox}
                    onChange={(e) => setUnitsPerBox(e.target.value)}
                    placeholder="10"
                  />
                </Field>
                <Field label="Precio unidad">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unid. por paquete">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="number"
                    min={0}
                    value={unitsPerBlister}
                    onChange={(e) => setUnitsPerBlister(e.target.value)}
                    placeholder="10"
                  />
                </Field>
                <Field label="Precio paquete">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={blisterPrice}
                    onChange={(e) => setBlisterPrice(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Nombre">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Arroz precocido"
                  required
                />
              </Field>
              <Field label="Marca">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="Ej. Diana"
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Presentación">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    value={presentation}
                    onChange={(e) => setPresentation(e.target.value)}
                    placeholder="Bolsa, botella, caja…"
                    list="presentaciones"
                  />
                  <datalist id="presentaciones">
                    {PRESENTATION_SUGGESTIONS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Contenido">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    value={concentration}
                    onChange={(e) => setConcentration(e.target.value)}
                    placeholder="1 lb"
                  />
                </Field>
              </div>
              <Field label="Proveedor">
                <input
                  className={`${inputClass} text-base sm:text-sm`}
                  value={laboratory}
                  onChange={(e) => setLaboratory(e.target.value)}
                  placeholder="Ej. Distribuidora local"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lote">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    value={lot}
                    onChange={(e) => setLot(e.target.value)}
                    placeholder="L24081"
                  />
                </Field>
                <Field label="Vencimiento">
                  <input
                    className={`${inputClass} text-base sm:text-sm`}
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Código de barras">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className={`${inputClass} text-base sm:text-sm`}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Obligatorio"
                      inputMode="numeric"
                      required
                    />
                    <button
                      type="button"
                      className={`${buttonPrimary} min-h-11 w-11 shrink-0 px-0`}
                      onClick={openCamera}
                      disabled={busy}
                      aria-label={busy ? "Leyendo código…" : "Escanear código de barras"}
                      title={busy ? "Leyendo código…" : "Escanear código"}
                    >
                      <ScanBarcode size={18} />
                    </button>
                  </div>
                  {barcode ? (
                    <p className="rounded-md bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)]">
                      Código listo: <span className="font-mono font-semibold">{barcode}</span>
                    </p>
                  ) : null}
                </div>
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
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
      )}
    </BarcodeCapture>
  );
}
