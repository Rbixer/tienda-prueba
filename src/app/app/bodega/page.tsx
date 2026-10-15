"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GuardAdmin } from "@/components/GuardAdmin";
import {
  Panel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { ProductThumb } from "@/components/ProductThumb";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastContext";
import {
  BODEGA_CENTRAL_ID,
  formatDate,
  formatMoney,
  getCostPrice,
} from "@/lib/store";
import type { Product } from "@/lib/types";

type CartLine = { product: Product; quantity: number };

export default function BodegaPage() {
  const router = useRouter();
  const { data, transferStock, setActiveBranch } = useAuth();
  const toast = useToast();
  const storeOptions = useMemo(
    () => data.branches.filter((b) => !b.isWarehouse),
    [data.branches],
  );
  const originOptions = data.branches;

  const [fromId, setFromId] = useState(BODEGA_CENTRAL_ID);
  const [toId, setToId] = useState(() => storeOptions[0]?.id ?? "suc-1");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const destinationOptions = useMemo(
    () => storeOptions.filter((b) => b.id !== fromId),
    [storeOptions, fromId],
  );

  useEffect(() => {
    if (destinationOptions.length === 0) return;
    if (!destinationOptions.some((b) => b.id === toId)) {
      setToId(destinationOptions[0].id);
    }
  }, [destinationOptions, toId]);

  const fromBranch = data.branches.find((b) => b.id === fromId);
  const toBranch = data.branches.find((b) => b.id === toId);

  const warehouseStock = useMemo(
    () =>
      data.products
        .filter((p) => p.branchId === BODEGA_CENTRAL_ID)
        .reduce((n, p) => n + p.quantity, 0),
    [data.products],
  );

  const fromProducts = useMemo(() => {
    const list = data.products
      .filter((p) => p.branchId === fromId && p.quantity > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [data.products, fromId, query]);

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = data.products.find((p) => p.id === id);
        if (!product || quantity <= 0) return null;
        return { product, quantity };
      })
      .filter((x): x is CartLine => !!x);
  }, [cart, data.products]);

  const cartUnits = cartLines.reduce((n, l) => n + l.quantity, 0);
  const cartSkus = cartLines.length;

  const transfers = useMemo(
    () =>
      [...(data.transfers ?? [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [data.transfers],
  );

  function branchName(id: string) {
    return data.branches.find((b) => b.id === id)?.name ?? id;
  }

  function setQty(product: Product, next: number) {
    const qty = Math.max(0, Math.min(product.quantity, Math.floor(next)));
    setCart((prev) => {
      const copy = { ...prev };
      if (qty <= 0) delete copy[product.id];
      else copy[product.id] = qty;
      return copy;
    });
    setError(null);
    setOk(null);
  }

  function addOne(product: Product) {
    const current = cart[product.id] ?? 0;
    if (current >= product.quantity) return;
    setQty(product, current + 1);
  }

  function clearCart() {
    setCart({});
    setNote("");
    setError(null);
    setOk(null);
  }

  function confirmTransfer() {
    const destination = destinationOptions.find((b) => b.id === toId);
    if (!destination) {
      setError("No hay destino para el traslado.");
      setOk(null);
      toast.error("No hay destino para el traslado.", "Traslado");
      return;
    }
    if (fromId === toId) {
      setError("Origen y destino deben ser diferentes.");
      toast.error("Origen y destino deben ser diferentes.", "Traslado");
      return;
    }
    const items = cartLines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
    }));
    const err = transferStock({
      fromBranchId: fromId,
      toBranchId: toId,
      items,
      note,
    });
    if (err) {
      setError(err);
      setOk(null);
      toast.error(err, "Traslado");
      return;
    }
    const msg = `Traslado listo: ${items.length} producto(s), ${cartUnits} und. → ${destination.name}`;
    setError(null);
    setOk(msg);
    toast.success(msg, "Bodega");
    setCart({});
    setNote("");
  }

  return (
    <AppShell
      title="Bodega Central"
      subtitle="Arma el traslado: elige productos, cantidad y confirma."
    >
      <GuardAdmin>
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 pb-3">
          {/* Ruta origen → destino */}
          <Panel className="!p-3 sm:!p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
                <label className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Origen
                  </span>
                  <select
                    className={`${inputClass} font-semibold`}
                    value={fromId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFromId(next);
                      setCart({});
                      setQuery("");
                      setError(null);
                      setOk(null);
                      if (next === toId) {
                        const alt = storeOptions.find((b) => b.id !== next);
                        if (alt) setToId(alt.id);
                      }
                    }}
                  >
                    {originOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.isWarehouse ? " · Bodega" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end justify-center pb-0.5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <ArrowRight size={18} />
                  </span>
                </div>

                <label className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Destino
                  </span>
                  <select
                    className={`${inputClass} font-semibold`}
                    value={toId}
                    onChange={(e) => {
                      setToId(e.target.value);
                      setCart({});
                      setError(null);
                      setOk(null);
                    }}
                  >
                    {destinationOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="rounded-lg bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
                  Bodega:{" "}
                  <strong className="text-[var(--ink)]">{warehouseStock}</strong>{" "}
                  und.
                </span>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => {
                    setActiveBranch(BODEGA_CENTRAL_ID);
                    router.push("/app/inventario");
                  }}
                >
                  <Package size={16} />
                  Inventario bodega
                </button>
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-[var(--navy)] px-3 py-2.5 text-sm text-white">
              <span className="min-w-0 flex-1 truncate font-semibold">
                {fromBranch?.name ?? "Origen"}
              </span>
              <ArrowRight size={16} className="shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {toBranch?.name ?? "Destino"}
              </span>
              {cartSkus > 0 ? (
                <span className="ml-auto shrink-0 rounded-md bg-white/15 px-2 py-0.5 text-xs">
                  {cartSkus} ítem · {cartUnits} und.
                </span>
              ) : null}
            </div>
          </Panel>

          {/*
            Móvil: stack estricto (productos → traslado → historial).
            Desktop: 2 columnas.
          */}
          <div className="flex w-full min-w-0 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.75fr)] lg:items-start">
            {/* 1) Productos */}
            <section className="card relative z-0 order-1 w-full min-w-0 overflow-hidden p-3 sm:p-4 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-hidden lg:flex lg:flex-col">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold sm:text-lg">
                    Productos en origen
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Toca + para agregar al traslado
                  </p>
                </div>
                <span className="rounded-md bg-[var(--bg-soft)] px-2 py-1 text-xs font-medium text-[var(--muted)]">
                  {fromProducts.length}
                </span>
              </div>

              <div className="relative mb-3 shrink-0">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Buscar nombre o código..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[min(48dvh,26rem)] space-y-0 overflow-y-auto overscroll-y-contain lg:max-h-none lg:min-h-0 lg:flex-1">
                {fromProducts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-sm text-[var(--muted)]">
                    <Package size={32} className="opacity-35" />
                    No hay stock en este origen.
                  </div>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {fromProducts.map((p) => {
                      const inCart = cart[p.id] ?? 0;
                      const remaining = p.quantity - inCart;
                      return (
                        <li
                          key={p.id}
                          className={`rounded-xl border bg-white p-3 transition ${
                            inCart > 0
                              ? "border-[var(--brand)] shadow-sm"
                              : "border-[var(--line)]"
                          }`}
                        >
                          <div className="flex gap-2.5">
                            <ProductThumb
                              src={p.image}
                              alt={p.name}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug">
                                {p.name}
                              </p>
                              <p className="mt-1 text-[11px] text-[var(--muted)]">
                                Disp. {p.quantity}
                                {inCart > 0 ? ` · En traslado ${inCart}` : ""}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                                {formatMoney(getCostPrice(p))} →{" "}
                                {formatMoney(p.price)}
                              </p>
                            </div>
                          </div>

                          {inCart === 0 ? (
                            <button
                              type="button"
                              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-40"
                              disabled={remaining <= 0}
                              onClick={() => addOne(p)}
                            >
                              <Plus size={16} strokeWidth={2.5} />
                              Agregar
                            </button>
                          ) : (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] text-[var(--ink)]"
                                onClick={() => setQty(p, inCart - 1)}
                                aria-label="Quitar uno"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={p.quantity}
                                className={`${inputClass} h-11 flex-1 py-0 text-center font-semibold`}
                                value={inCart}
                                onChange={(e) =>
                                  setQty(p, Number(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-[var(--brand)] text-white disabled:opacity-40"
                                disabled={inCart >= p.quantity}
                                onClick={() => setQty(p, inCart + 1)}
                                aria-label="Agregar uno"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* 2) Traslado — debajo en móvil (sin sticky/z-index) */}
            <section className="card relative z-0 order-2 w-full min-w-0 overflow-hidden p-3 sm:p-4 lg:sticky lg:top-3 lg:z-10 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-hidden lg:flex lg:flex-col">
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold sm:text-lg">
                    Traslado
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    {cartSkus === 0
                      ? "Vacío — agrega productos de arriba"
                      : `${cartSkus} producto(s) · ${cartUnits} und.`}
                  </p>
                </div>
                {cartSkus > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
                    title="Vaciar"
                    onClick={clearCart}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>

              <div className="max-h-52 overflow-y-auto overscroll-y-contain lg:max-h-none lg:min-h-0 lg:flex-1">
                {cartLines.length === 0 ? (
                  <div className="flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] px-4 text-center text-sm text-[var(--muted)]">
                    <ArrowRight size={22} className="opacity-40" />
                    Selecciona productos{" "}
                    <span className="lg:hidden">arriba</span>
                    <span className="hidden lg:inline">a la izquierda</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {cartLines.map(({ product, quantity }) => (
                      <li
                        key={product.id}
                        className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-2"
                      >
                        <ProductThumb
                          src={product.image}
                          alt={product.name}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">
                            Máx. {product.quantity}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--line)] bg-white"
                            onClick={() => setQty(product, quantity - 1)}
                            aria-label="Restar"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-[var(--brand)] text-white disabled:opacity-40"
                            disabled={quantity >= product.quantity}
                            onClick={() => setQty(product, quantity + 1)}
                            aria-label="Sumar"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 shrink-0 space-y-2 border-t border-[var(--line)] pt-3">
                <input
                  className={inputClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota (opcional)"
                />
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
                  type="button"
                  className={`${buttonPrimary} w-full`}
                  disabled={cartSkus === 0}
                  onClick={confirmTransfer}
                >
                  <Check size={18} />
                  Confirmar traslado
                </button>
              </div>
            </section>
          </div>

          {/* 3) Historial */}
          <Panel className="relative z-0 order-3 !p-0 overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-[var(--bg-soft)]"
              onClick={() => setShowHistory((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                  <History size={16} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Historial</span>
                  <span className="text-xs text-[var(--muted)]">
                    {transfers.length} traslado
                    {transfers.length === 1 ? "" : "s"}
                  </span>
                </span>
              </span>
              {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showHistory ? (
              <div className="max-h-64 space-y-2 overflow-auto border-t border-[var(--line)] px-4 py-3">
                {transfers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted)]">
                    Aún no hay traslados registrados.
                  </p>
                ) : (
                  transfers.map((t) => {
                    const units = t.items.reduce((n, i) => n + i.quantity, 0);
                    return (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {branchName(t.fromBranchId)} →{" "}
                            {branchName(t.toBranchId)}
                          </p>
                          <span className="shrink-0 text-[10px] text-[var(--muted)]">
                            {formatDate(t.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {t.items.length} producto(s) · {units} und. ·{" "}
                          {t.userName}
                        </p>
                        {t.note ? (
                          <p className="mt-1 text-xs italic">{t.note}</p>
                        ) : null}
                        <ul className="mt-1.5 space-y-0.5 text-[11px] text-[var(--muted)]">
                          {t.items.slice(0, 5).map((item, idx) => (
                            <li key={`${t.id}-${idx}`}>
                              {item.quantity}× {item.name}
                            </li>
                          ))}
                          {t.items.length > 5 ? (
                            <li>+{t.items.length - 5} más…</li>
                          ) : null}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </Panel>
        </div>
      </GuardAdmin>
    </AppShell>
  );
}
