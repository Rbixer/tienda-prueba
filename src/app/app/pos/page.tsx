"use client";
import { useCallback, useMemo, useState } from "react";
import { Minus, Plus, ScanBarcode, ShoppingBag, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarcodeCapture } from "@/components/BarcodeCapture";
import { ProductThumb } from "@/components/ProductThumb";
import {
  Panel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { barcodesMatch, normalizeBarcode } from "@/lib/barcode";
import { formatMoney, formatDate } from "@/lib/store";
import type { SaleItem } from "@/lib/types";
export default function PosPage() {
  const { branchProducts, branchSales, checkout, currentBranchName } =
    useAuth();
  const [query, setQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branchProducts
      .filter((p) => p.quantity > 0)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      );
  }, [branchProducts, query]);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const addToCart = useCallback(
    (productId: string) => {
      const product = branchProducts.find((p) => p.id === productId);
      if (!product || product.quantity <= 0) return false;
      let ok = true;
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        const currentQty = existing?.quantity ?? 0;
        if (currentQty + 1 > product.quantity) {
          setError(`Stock insuficiente de ${product.name}`);
          ok = false;
          return prev;
        }
        setError(null);
        if (existing) {
          return prev.map((i) =>
            i.productId === productId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
          },
        ];
      });
      return ok;
    },
    [branchProducts],
  );
  const addByBarcode = useCallback(
    (code: string) => {
      const normalized = normalizeBarcode(code);
      if (!normalized) {
        setError("Código de barras vacío.");
        setMessage(null);
        return;
      }
      setBarcodeInput(normalized);
      const product = branchProducts.find((p) =>
        barcodesMatch(p.barcode, normalized),
      );
      if (!product) {
        setError(
          `No hay producto con código ${normalized}. Regístralo primero en Inventario.`,
        );
        setMessage(null);
        return;
      }
      if (product.quantity <= 0) {
        setError(`Sin stock de ${product.name}`);
        setMessage(null);
        return;
      }
      const ok = addToCart(product.id);
      if (ok) {
        setMessage(`Agregado: ${product.name}`);
        setError(null);
        setBarcodeInput("");
      }
    },
    [addToCart, branchProducts],
  );
  /** Solo llena el campo; no agrega hasta que se pulse Agregar. */
  const fillBarcodeFromScan = useCallback(
    (code: string) => {
      const normalized = normalizeBarcode(code);
      if (!normalized) {
        setError("Código de barras vacío.");
        setMessage(null);
        return;
      }
      setBarcodeInput(normalized);
      setError(null);
      setMessage(`Código leído: ${normalized}. Presiona Agregar.`);
    },
    [],
  );
  function changeQty(productId: string, delta: number) {
    const product = branchProducts.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const next = item.quantity + delta;
          if (product && next > product.quantity) {
            setError(`Stock insuficiente de ${item.name}`);
            return item;
          }
          setError(null);
          return { ...item, quantity: next };
        })
        .filter((item) => item.quantity > 0),
    );
  }
  function clearCart() {
    setCart([]);
    setError(null);
  }
  function onCheckout() {
    const err = checkout(cart);
    if (err) {
      setError(err);
      setMessage(null);
      return;
    }
    setMessage(`Venta registrada por ${formatMoney(total)}`);
    setError(null);
    setCart([]);
  }
  return (
    <BarcodeCapture onDetected={fillBarcodeFromScan}>
      {({ openCamera, busy }) => (
    <AppShell
      title="Punto de venta"
      subtitle={`POS sin facturación · ${currentBranchName}`}
    >
      <div className="grid min-h-0 flex-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel className="flex min-h-0 w-full flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Productos
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {available.length} disponibles
            </span>
          </div>
          {error ? (
            <p className="mb-3 shrink-0 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mb-3 shrink-0 border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)]">
              {message}
            </p>
          ) : null}
          <div className="mb-2 flex shrink-0 gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="Buscar nombre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mb-3 flex shrink-0 gap-2">
            <input
              className={`${inputClass} flex-1 font-mono text-base`}
              placeholder="O escribe el código y Enter"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addByBarcode(barcodeInput);
                }
              }}
            />
            <button
              type="button"
              className={`${buttonSecondary} min-h-11 shrink-0 px-4`}
              onClick={() => addByBarcode(barcodeInput)}
            >
              Agregar
            </button>
            <button
              type="button"
              className={`${buttonPrimary} min-h-11 w-11 shrink-0 px-0`}
              onClick={openCamera}
              disabled={busy}
              aria-label={busy ? "Leyendo código…" : "Escanear código de barras"}
              title={busy ? "Leyendo código…" : "Escanear código"}
            >
              <ScanBarcode size={20} />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {available.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  const ok = addToCart(product.id);
                  if (ok) setMessage(`Agregado: ${product.name}`);
                }}
                className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 text-left shadow-sm transition hover:border-[var(--brand)] hover:shadow-md active:scale-[0.99]"
              >
                <ProductThumb
                  src={product.image}
                  alt={product.name}
                  size="xl"
                />
                <span className="min-w-0 flex-1 self-center">
                  <p className="font-semibold leading-snug">{product.name}</p>
                  {product.barcode ? (
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {product.barcode}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-amber-700">
                      Sin código
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[var(--brand)]">
                      {formatMoney(product.price)}
                    </span>
                    <span className="text-[var(--muted)]">
                      Stock {product.quantity}
                    </span>
                  </div>
                </span>
              </button>
            ))}
            {available.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-[var(--muted)]">
                No hay productos disponibles.
              </p>
            ) : null}
          </div>
        </Panel>
        <aside className="flex min-h-0 w-full flex-col gap-3 self-start lg:sticky lg:top-3 lg:z-20 lg:max-h-[calc(100dvh-5.5rem)]">
          <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden !p-3 sm:!p-4">
            <div className="mb-2.5 flex shrink-0 items-center gap-2">
              <ShoppingBag size={18} className="text-[var(--brand)]" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Carrito
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ProductThumb
                      src={item.image}
                      alt={item.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatMoney(item.price)} c/u
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-white"
                      onClick={() => changeQty(item.productId, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-white"
                      onClick={() => changeQty(item.productId, 1)}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      className="ml-1 rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((i) => i.productId !== item.productId),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 ? (
                <div className="flex h-full min-h-24 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--bg-soft)]/60 px-3">
                  <p className="text-center text-sm text-[var(--muted)]">
                    Escanea un código o toca un producto.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-3 shrink-0 border-t border-[var(--line)] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Total</span>
                <span className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {formatMoney(total)}
                </span>
              </div>
              {error ? (
                <p className="mt-2 hidden rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 lg:block">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="mt-2 hidden rounded-md bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)] lg:block">
                  {message}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={`${buttonPrimary} min-h-11 flex-1`}
                  onClick={onCheckout}
                  disabled={cart.length === 0}
                >
                  Cobrar
                </button>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </Panel>
          <Panel className="shrink-0 !p-3 sm:!p-4">
            <h3 className="font-semibold">Últimas ventas</h3>
            <div className="mt-2 max-h-36 space-y-2 overflow-y-auto lg:max-h-40">
              {branchSales.slice(0, 6).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-soft)] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatMoney(sale.total)}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {sale.userName} · {formatDate(sale.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
                    {sale.items.length} ítems
                  </span>
                </div>
              ))}
              {branchSales.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Aún no hay ventas en esta sucursal.
                </p>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </AppShell>
      )}
    </BarcodeCapture>
  );
}
