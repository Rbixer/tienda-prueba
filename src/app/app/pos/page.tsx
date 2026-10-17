"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Printer,
  ScanBarcode,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
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
import { barcodesMatch, normalizeBarcode } from "@/lib/barcode";
import { downloadInvoicePdf, printSaleTicket } from "@/lib/pdf";
import { customerNameFromSales, isConsumerFinal, nitKey } from "@/lib/sat";
import { formatMoney } from "@/lib/store";
import {
  canSellBlister,
  canSellUnit,
  commitSaleItem,
  packName,
  packPrice,
  packStock,
  sellableBlisters,
  sellableBoxes,
  sellableUnits,
  type SalePack,
} from "@/lib/stock";
import {
  PHARMACY_CATEGORIES,
  categoryLabel,
  expiryBadge,
  expiryTone,
  formatExpiry,
  productSearchText,
  productSubtitle,
} from "@/lib/pharmacy";
import type { PaymentMethod, PharmacyCategory, Product, Sale, SaleItem } from "@/lib/types";

function lineKey(item: { productId: string; saleUnit?: string }) {
  return `${item.productId}:${item.saleUnit ?? "caja"}`;
}

function cartFits(product: Product, nextCart: SaleItem[]) {
  let stock = product;
  for (const line of nextCart.filter((item) => item.productId === product.id)) {
    const result = commitSaleItem(stock, line);
    if (result.error) return false;
    stock = result.product;
  }
  return true;
}

function CartQtyInput({
  value,
  max,
  onCommit,
  className = "",
}: {
  value: number;
  max: number;
  onCommit: (qty: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={max}
      className={`h-10 w-12 border-x border-y-0 border-[var(--line)] bg-transparent text-center text-base font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
      value={text}
      aria-label="Cantidad"
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = Math.floor(Number(text));
        if (!Number.isFinite(n) || text.trim() === "") {
          setText(String(value));
          return;
        }
        onCommit(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export default function PosPage() {
  const {
    branchProducts,
    checkout,
    currentBranchName,
    session,
    data,
  } = useAuth();
  const [query, setQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ticketSale, setTicketSale] = useState<Sale | null>(null);
  const [printing, setPrinting] = useState(false);
  const [category, setCategory] = useState<PharmacyCategory | "todos">("todos");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNit, setCustomerNit] = useState("");
  const [nitStatus, setNitStatus] = useState<string | null>(null);
  const [nitTest, setNitTest] = useState(false);
  const [nitBusy, setNitBusy] = useState(false);
  const nitRequest = useRef(0);
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [rxNumber, setRxNumber] = useState("");
  const [rxDoctor, setRxDoctor] = useState("");
  const [rxPatient, setRxPatient] = useState("");
  const [rxDate, setRxDate] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickUnit, setPickUnit] = useState<SalePack>("caja");
  const [pickQty, setPickQty] = useState(1);

  const openShiftRow = (data.cashShifts ?? []).find(
    (shift) => shift.branchId === session?.branchId && !shift.closedAt,
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branchProducts
      .filter(
        (p) =>
          sellableBoxes(p) > 0 ||
          (canSellBlister(p) && sellableBlisters(p) > 0) ||
          (canSellUnit(p) && sellableUnits(p) > 0),
      )
      .filter((p) => category === "todos" || p.category === category)
      .filter((p) => !q || productSearchText(p).includes(q));
  }, [branchProducts, query, category]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartUnits = cart.reduce((n, item) => n + item.quantity, 0);
  const receivedAmount = Number(received);
  const cashCovers =
    payMethod !== "efectivo" ||
    (Number.isFinite(receivedAmount) && receivedAmount + 0.001 >= total);
  const change =
    payMethod === "efectivo" && cashCovers ? receivedAmount - total : 0;

  const lookupNit = useCallback(
    async (raw: string, manual = false) => {
      const nit = raw.trim();
      if (!nit || isConsumerFinal(nit) || nitKey(nit).length < (manual ? 2 : 5)) {
        setNitBusy(false);
        setNitTest(false);
        setNitStatus(
          manual && isConsumerFinal(nit)
            ? "Consumidor final no se consulta en la SAT."
            : null,
        );
        return;
      }
      const requestId = ++nitRequest.current;
      const remembered = customerNameFromSales(data.sales ?? [], nit);
      if (remembered) setCustomerName(remembered);
      setNitBusy(true);
      setNitTest(false);
      setNitStatus(remembered ? "Verificando en la SAT…" : "Buscando en la SAT…");
      try {
        const res = await fetch("/api/sat/nit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nit }),
        });
        const body = (await res.json().catch(() => null)) as {
          name?: string;
          error?: string;
          test?: boolean;
        } | null;
        if (requestId !== nitRequest.current) return;
        if (res.ok && body?.name) {
          setCustomerName(body.name);
          setNitTest(Boolean(body.test));
          setNitStatus(
            body.test
              ? "Modo de prueba. Este nombre no viene de la SAT."
              : "Nombre registrado en la SAT.",
          );
          return;
        }
        setNitTest(false);
        setNitStatus(body?.error || "No se encontró ese NIT en la SAT.");
      } catch {
        if (requestId !== nitRequest.current) return;
        setNitTest(false);
        setNitStatus(
          remembered
            ? "Sin conexión con la SAT. Quedó el nombre de una venta anterior."
            : "No se pudo conectar con la consulta de NIT.",
        );
      } finally {
        if (requestId === nitRequest.current) setNitBusy(false);
      }
    },
    [data.sales],
  );

  useEffect(() => {
    if (!checkoutOpen) return;
    const nit = customerNit.trim();
    if (!nit || isConsumerFinal(nit) || nitKey(nit).length < 5) {
      setNitStatus(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void lookupNit(nit);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [checkoutOpen, customerNit, lookupNit]);

  const openProduct = useCallback((productId: string) => {
    const product = branchProducts.find((item) => item.id === productId);
    const boxes = product ? sellableBoxes(product) : 0;
    const blisters = product ? sellableBlisters(product) : 0;
    const nextUnit: SalePack =
      boxes > 0
        ? "caja"
        : product && canSellBlister(product) && blisters > 0
          ? "blister"
          : "unidad";
    setPickedId(productId);
    setPickUnit(nextUnit);
    setPickQty(1);
    setError(null);
  }, [branchProducts]);

  const addToCart = useCallback(
    (productId: string, saleUnit: SalePack = "caja", amount = 1) => {
      const quantity = Math.max(1, Math.floor(amount));
      const product = branchProducts.find((p) => p.id === productId);
      if (!product) return false;
      if (saleUnit === "unidad" && !canSellUnit(product)) {
        setError(`${product.name} no se vende por unidad.`);
        setMessage(null);
        return false;
      }
      if (saleUnit === "blister" && !canSellBlister(product)) {
        setError(`${product.name} no se vende por paquete.`);
        setMessage(null);
        return false;
      }
      const sellable = packStock(product, saleUnit);
      if (sellable <= 0) {
        setError(
          expiryTone(product.expiresAt) === "expired"
            ? `${product.name} está vencido (${formatExpiry(product.expiresAt)}). No se puede dispensar.`
            : `Sin stock de ${product.name}`,
        );
        setMessage(null);
        return false;
      }
      let ok = true;
      setCart((prev) => {
        const key = `${productId}:${saleUnit}`;
        const existing = prev.find((item) => lineKey(item) === key);
        const next = existing
          ? prev.map((item) =>
              lineKey(item) === key
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          : [
              ...prev,
              {
                productId: product.id,
                name: product.name,
                price: packPrice(product, saleUnit),
                quantity,
                image: product.image,
                saleUnit,
              },
            ];
        if (!cartFits(product, next)) {
          setError(`Stock insuficiente de ${product.name}`);
          ok = false;
          return prev;
        }
        setError(null);
        return next;
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
      if (sellableBoxes(product) <= 0 && sellableUnits(product) <= 0) {
        setError(`Sin stock de ${product.name}`);
        setMessage(null);
        return;
      }
      openProduct(product.id);
      setError(null);
      setMessage(null);
      setBarcodeInput("");
    },
    [branchProducts, openProduct],
  );

  /** Solo llena el campo; no agrega hasta que se pulse Agregar. */
  const fillBarcodeFromScan = useCallback((code: string) => {
    const normalized = normalizeBarcode(code);
    if (!normalized) {
      setError("Código de barras vacío.");
      setMessage(null);
      return;
    }
    setBarcodeInput(normalized);
    setError(null);
    setMessage(`Código leído: ${normalized}. Presiona Agregar.`);
  }, []);

  function changeQty(key: string, delta: number) {
    const productId = key.split(":")[0];
    const product = branchProducts.find((p) => p.id === productId);
    setCart((prev) => {
      const next = prev
        .map((item) =>
          lineKey(item) === key
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0);
      if (product && !cartFits(product, next)) {
        setError(`Stock insuficiente de ${product.name}`);
        return prev;
      }
      setError(null);
      return next;
    });
  }

  function setQty(key: string, nextQty: number) {
    const productId = key.split(":")[0];
    const product = branchProducts.find((p) => p.id === productId);
    if (!product) return;
    const qty = Math.floor(Number(nextQty));
    if (!Number.isFinite(qty) || qty <= 0) {
      setCart((prev) => prev.filter((item) => lineKey(item) !== key));
      setError(null);
      return;
    }
    setCart((prev) => {
      const next = prev.map((item) =>
        lineKey(item) === key ? { ...item, quantity: qty } : item,
      );
      if (!cartFits(product, next)) {
        setError(`Stock insuficiente de ${product.name}.`);
        return prev;
      }
      setError(null);
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    setError(null);
    setCheckoutOpen(false);
  }

  async function onCheckout() {
    if (payMethod === "efectivo" && !cashCovers) {
      setError("El efectivo recibido no cubre el total.");
      setMessage(null);
      return;
    }
    if (!openShiftRow) {
      setError("La caja no está abierta. Apérturala desde el inicio.");
      setMessage(null);
      return;
    }
    const needsRx = cart.some(
      (item) => branchProducts.find((p) => p.id === item.productId)?.controlled,
    );
    if (needsRx && (!rxNumber.trim() || !rxDoctor.trim() || !rxPatient.trim() || !rxDate)) {
      setError("Completa la receta del medicamento controlado.");
      setMessage(null);
      return;
    }
    if (issueInvoice && (!customerNit.trim() || !customerName.trim())) {
      setError("La factura necesita NIT y nombre del receptor.");
      setMessage(null);
      return;
    }
    const saleTotal = total;
    const result = checkout(
      cart,
      {
        method: payMethod,
        amountReceived: payMethod === "efectivo" ? receivedAmount : undefined,
      },
      {
        customerName,
        customerPhone,
        customerNit,
        issueInvoice,
        shiftId: openShiftRow.id,
        prescription: needsRx
          ? {
              number: rxNumber.trim(),
              doctor: rxDoctor.trim(),
              patient: rxPatient.trim(),
              date: rxDate,
            }
          : undefined,
      },
    );
    if (result.error || !result.sale) {
      setError(result.error ?? "No se pudo completar la venta.");
      setMessage(null);
      return;
    }
    setMessage(
      result.offline
        ? `Venta offline por ${formatMoney(saleTotal)} · se sincronizará al recuperar red`
        : `Venta registrada por ${formatMoney(saleTotal)}`,
    );
    setError(null);
    setCart([]);
    setReceived("");
    setCartOpen(false);
    setCheckoutOpen(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNit("");
    setNitStatus(null);
    setNitTest(false);
    setIssueInvoice(false);
    setRxNumber("");
    setRxDoctor("");
    setRxPatient("");
    setRxDate("");

    const invoice = result.invoice;
    if (invoice && result.sale) {
      try {
        await downloadInvoicePdf({
          invoice,
          sale: result.sale,
          companyName: data.settings?.companyName,
          address: data.settings?.address,
          phone: data.settings?.phone,
        });
      } catch {
        setError("La venta se registró, pero no se pudo generar la factura.");
      }
    }

    setTicketSale(result.sale);
  }

  async function printPendingTicket() {
    if (!ticketSale) return;
    const sale = ticketSale;
    setPrinting(true);
    try {
      await printSaleTicket({
        sale,
        branchName: currentBranchName,
        companyName: data.settings?.companyName,
        slogan: data.settings?.slogan,
        address: data.settings?.address,
        phone: data.settings?.phone,
        alsoDownload: true,
      });
      setTicketSale(null);
    } catch {
      setError("La venta se registró, pero no se pudo imprimir el ticket.");
      setTicketSale(null);
    } finally {
      setPrinting(false);
    }
  }

  function renderCartBody(opts?: { showMessages?: boolean }) {
    const showMessages = opts?.showMessages ?? true;
    return (
      <>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {cart.map((item) => (
            <div
              key={lineKey(item)}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-2"
            >
              <div className="flex items-start gap-2">
                <ProductThumb src={item.image} alt={item.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((i) => lineKey(i) !== lineKey(item)),
                        )
                      }
                      aria-label="Quitar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {packName(item.saleUnit)} · {formatMoney(item.price)}
                    {branchProducts.find((p) => p.id === item.productId)
                      ?.requiresPrescription
                      ? " · Receta"
                      : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-lg border border-[var(--line)] bg-white">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-l-lg hover:bg-[var(--bg-soft)]"
                    onClick={() => changeQty(lineKey(item), -1)}
                    aria-label="Restar"
                  >
                    <Minus size={16} />
                  </button>
                  <CartQtyInput
                    value={item.quantity}
                    max={999}
                    onCommit={(qty) => setQty(lineKey(item), qty)}
                  />
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-r-lg hover:bg-[var(--bg-soft)]"
                    onClick={() => changeQty(lineKey(item), 1)}
                    aria-label="Sumar"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-sm font-bold tabular-nums">
                  {formatMoney(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
          {cart.length === 0 ? (
            <div className="flex min-h-[8.5rem] items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)]/60 px-3">
              <p className="text-center text-sm text-[var(--muted)]">
                Escanea un código o toca un producto.
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-3 shrink-0 border-t border-[var(--line)] pt-3 lg:pr-16">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">Total</span>
            <span className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {formatMoney(total)}
            </span>
          </div>
          {showMessages && error && !checkoutOpen ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={`${buttonPrimary} min-h-11 flex-1`}
              onClick={() => {
                setError(null);
                setCheckoutOpen(true);
              }}
              disabled={cart.length === 0 || printing}
            >
              Cobrar
            </button>
            <button
              type="button"
              className={buttonSecondary}
              onClick={clearCart}
              disabled={cart.length === 0 || printing}
            >
              Limpiar
            </button>
          </div>
        </div>
      </>
    );
  }

  const needsRx = cart.some(
    (item) => branchProducts.find((product) => product.id === item.productId)?.controlled,
  );

  const picked = branchProducts.find((product) => product.id === pickedId) ?? null;
  const pickedCanUnit = Boolean(picked && canSellUnit(picked));
  const pickedCanBlister = Boolean(picked && canSellBlister(picked));
  const pickedMax = picked ? packStock(picked, pickUnit) : 0;

  return (
    <BarcodeCapture onDetected={fillBarcodeFromScan}>
      {({ openCamera, busy }) => (
        <AppShell
          title="Punto de venta"
          subtitle="Cobro en mostrador"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
            <Panel className="flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:max-h-[calc(100dvh-5.5rem)]">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Productos
                </h2>
                <span className="text-xs text-[var(--muted)]">
                  {available.length} disponibles
                </span>
              </div>
              {error && !cartOpen ? (
                <p className="mb-3 shrink-0 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 lg:hidden">
                  {error}
                </p>
              ) : null}
              {error ? (
                <p className="mb-3 hidden shrink-0 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 lg:block">
                  {error}
                </p>
              ) : null}
              {message && !cartOpen ? (
                <p className="mb-3 shrink-0 border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)] lg:hidden">
                  {message}
                </p>
              ) : null}
              {message ? (
                <p className="mb-3 hidden shrink-0 border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)] lg:block">
                  {message}
                </p>
              ) : null}
              <div className="mb-2 flex shrink-0 gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Nombre, marca o código…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="mb-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === "todos"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--bg-soft)] text-[var(--muted)]"
                  }`}
                  onClick={() => setCategory("todos")}
                >
                  Todos
                </button>
                {PHARMACY_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      category === item.id
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--bg-soft)] text-[var(--muted)]"
                    }`}
                    onClick={() => setCategory(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
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
                  aria-label={
                    busy ? "Leyendo código…" : "Escanear código de barras"
                  }
                  title={busy ? "Leyendo código…" : "Escanear código"}
                >
                  <ScanBarcode size={20} />
                </button>
              </div>
              <div className="grid min-h-0 flex-1 content-start items-stretch gap-3 overflow-y-auto pb-20 sm:grid-cols-2 lg:pb-0 xl:grid-cols-3 2xl:grid-cols-4">
                {available.map((product) => {
                  const expired = expiryTone(product.expiresAt) === "expired";
                  const badge = expiryBadge(product.expiresAt);
                  const boxes = sellableBoxes(product);
                  const sellsUnit = canSellUnit(product);
                  const sellsBlister = canSellBlister(product);
                  const stockLabel = `${boxes} ${boxes === 1 ? "caja" : "cajas"}${
                    product.looseUnits ? ` · ${product.looseUnits} sueltas` : ""
                  }`;
                  return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={
                      expired ||
                      (boxes <= 0 &&
                        !(sellsBlister && sellableBlisters(product) > 0) &&
                        !(sellsUnit && sellableUnits(product) > 0))
                    }
                    onClick={() => openProduct(product.id)}
                    className={`flex h-full min-h-[12.5rem] flex-col rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:border-[var(--brand)]/40 ${
                      expired
                        ? "border-red-200 opacity-70"
                        : "border-[var(--line)]"
                    }`}
                  >
                    <span className="flex min-w-0 gap-3">
                      <ProductThumb
                        src={product.image}
                        alt={product.name}
                        size="md"
                      />
                      <span className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-5">
                          {product.name}
                        </p>
                        <p className="mt-0.5 h-4 truncate text-[11px] text-[var(--muted)]">
                          {productSubtitle(product) || "\u00a0"}
                        </p>
                        <span className="mt-1.5 flex h-5 items-center gap-1 overflow-hidden">
                          {product.category ? (
                            <span className="shrink-0 rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                              {categoryLabel(product.category)}
                            </span>
                          ) : null}
                          {product.requiresPrescription || product.controlled ? (
                            <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                              {product.controlled ? "Controlado" : "Receta"}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`mt-2 block h-4 truncate text-[10px] font-semibold leading-4 ${
                        badge
                          ? `${badge.className} w-fit max-w-full rounded px-1`
                          : "text-transparent"
                      }`}
                    >
                      {badge?.label || "\u00a0"}
                    </span>
                    <span className="mt-auto grid grid-cols-3 gap-1 pt-2">
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Caja
                        </span>
                        <span className="block text-sm font-bold tabular-nums text-[var(--brand)]">
                          {formatMoney(product.price)}
                        </span>
                      </span>
                      <span className="text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Paquete
                        </span>
                        <span className="block text-sm font-bold tabular-nums text-[var(--ink)]">
                          {sellsBlister ? formatMoney(product.blisterPrice!) : "—"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Unidad
                        </span>
                        <span className="block text-sm font-bold tabular-nums text-[var(--ink)]">
                          {sellsUnit ? formatMoney(product.unitPrice!) : "—"}
                        </span>
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-medium text-[var(--muted)]">
                      {stockLabel}
                    </span>
                  </button>
                  );
                })}
                {available.length === 0 ? (
                  <p className="col-span-full py-10 text-center text-sm text-[var(--muted)]">
                    No hay productos disponibles.
                  </p>
                ) : null}
              </div>
            </Panel>

            {/* Desktop: columna sticky */}
            <aside className="hidden h-[calc(100dvh-8rem)] min-h-0 w-full lg:sticky lg:top-3 lg:z-20 lg:block">
              <Panel className="flex h-full min-h-0 flex-col overflow-hidden !p-3 sm:!p-4">
                <div className="mb-2.5 flex shrink-0 items-center gap-2">
                  <ShoppingBag size={18} className="text-[var(--brand)]" />
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Carrito
                  </h2>
                </div>
                {renderCartBody({ showMessages: true })}
              </Panel>
            </aside>
          </div>

          {/* Móvil: solo ícono del carrito */}
          <button
            type="button"
            className="fixed right-[5.5rem] z-[55] flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30 transition active:scale-95 lg:hidden"
            style={{
              bottom:
                "calc(3.75rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
            }}
            onClick={() => setCartOpen(true)}
            aria-label="Abrir carrito"
          >
            <ShoppingBag size={24} />
            {cartUnits > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--navy)] px-1.5 text-[11px] font-bold leading-none text-white">
                {cartUnits > 99 ? "99+" : cartUnits}
              </span>
            ) : null}
          </button>

          {/* Móvil: panel del carrito */}
          {cartOpen ? (
            <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--bg)] lg:hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[var(--brand)]" />
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
                      Carrito
                    </h2>
                    <p className="text-[11px] text-[var(--muted)]">
                      {cartUnits === 0
                        ? "Vacío"
                        : `${cartUnits} ítem${cartUnits === 1 ? "" : "s"} · ${formatMoney(total)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--bg-soft)]"
                  onClick={() => setCartOpen(false)}
                  aria-label="Cerrar carrito"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden !p-3">
                  {renderCartBody({ showMessages: true })}
                </Panel>
              </div>
            </div>
          ) : null}

          {checkoutOpen ? (
            <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[var(--navy)]/55 p-2 sm:items-center sm:p-8">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-title"
                className="flex max-h-[94dvh] min-h-[min(40rem,94dvh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(11,37,32,0.35)]"
              >
                <header className="flex items-center gap-4 bg-[var(--navy)] px-5 py-4 text-white sm:px-7 sm:py-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      Punto de venta
                    </p>
                    <h2
                      id="checkout-title"
                      className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight"
                    >
                      Cobro
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      Total a cobrar
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
                      {formatMoney(total)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                    onClick={() => setCheckoutOpen(false)}
                    aria-label="Cerrar"
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                  <section className="border-b border-[var(--line)] px-5 py-5 sm:px-7 lg:border-b-0 lg:border-r">
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Detalle
                      </h3>
                      <span className="text-sm text-[var(--muted)]">
                        {cartUnits} {cartUnits === 1 ? "línea" : "líneas"}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
                      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] gap-3 bg-[var(--bg-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        <span>Cant.</span>
                        <span>Producto</span>
                        <span className="text-right">Importe</span>
                      </div>
                      <ul className="max-h-80 divide-y divide-[var(--line)] overflow-y-auto">
                        {cart.map((item) => (
                          <li
                            key={lineKey(item)}
                            className="grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 px-4 py-3"
                          >
                            <span className="text-sm font-semibold tabular-nums">
                              {item.quantity} {packName(item.saleUnit)}
                            </span>
                            <span className="min-w-0 truncate text-sm">{item.name}</span>
                            <span className="text-right text-sm font-semibold tabular-nums">
                              {formatMoney(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {error ? (
                      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </p>
                    ) : null}
                  </section>

                  <section className="space-y-5 bg-[var(--bg)] px-5 py-5 sm:px-6">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Cliente
                      </h3>
                      <div className="grid gap-3">
                        <Field label="Nombre">
                          <input
                            className={inputClass}
                            placeholder="Consumidor final"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                          />
                        </Field>
                        <Field label="NIT">
                          <div className="flex gap-2">
                            <input
                              className={`${inputClass} min-w-0 flex-1`}
                              placeholder="CF"
                              value={customerNit}
                              onChange={(e) => setCustomerNit(e.target.value)}
                              onBlur={() => void lookupNit(customerNit)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void lookupNit(customerNit, true);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className={`${buttonSecondary} shrink-0 px-3`}
                              disabled={nitBusy}
                              onClick={() => void lookupNit(customerNit, true)}
                            >
                              {nitBusy ? "…" : "SAT"}
                            </button>
                          </div>
                        </Field>
                        {nitStatus ? (
                          <p
                            className={`text-xs ${
                              nitTest ? "font-medium text-amber-800" : "text-[var(--muted)]"
                            }`}
                          >
                            {nitStatus}
                          </p>
                        ) : null}
                        <Field label="Teléfono">
                          <input
                            className={inputClass}
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--brand)]"
                            checked={issueInvoice}
                            onChange={(e) => setIssueInvoice(e.target.checked)}
                          />
                          Emitir factura
                        </label>
                      </div>
                    </div>

                    {needsRx ? (
                      <div className="grid gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-rose-800">
                          Receta de controlado
                        </h3>
                        <Field label="Número">
                          <input
                            className={inputClass}
                            value={rxNumber}
                            onChange={(e) => setRxNumber(e.target.value)}
                          />
                        </Field>
                        <Field label="Médico">
                          <input
                            className={inputClass}
                            value={rxDoctor}
                            onChange={(e) => setRxDoctor(e.target.value)}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Paciente">
                            <input
                              className={inputClass}
                              value={rxPatient}
                              onChange={(e) => setRxPatient(e.target.value)}
                            />
                          </Field>
                          <Field label="Fecha">
                            <input
                              type="date"
                              className={inputClass}
                              value={rxDate}
                              onChange={(e) => setRxDate(e.target.value)}
                            />
                          </Field>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Pago
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            ["efectivo", "Efectivo"],
                            ["tarjeta", "Tarjeta"],
                            ["transferencia", "Transferencia"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className={`min-h-11 rounded-xl border text-sm font-semibold ${
                              payMethod === id
                                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                                : "border-[var(--line)] bg-white text-[var(--muted)]"
                            }`}
                            onClick={() => setPayMethod(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {payMethod === "efectivo" ? (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Field label="Recibido">
                            <input
                              className={inputClass}
                              inputMode="decimal"
                              value={received}
                              placeholder="0.00"
                              onChange={(e) => setReceived(e.target.value)}
                            />
                          </Field>
                          <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                              Vuelto
                            </p>
                            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-[var(--brand)]">
                              {cashCovers ? formatMoney(Math.max(change, 0)) : "—"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {payMethod === "efectivo" ? (
                        <button
                          type="button"
                          className={`${buttonSecondary} mt-3 min-h-10 w-full`}
                          onClick={() => setReceived(total.toFixed(2))}
                        >
                          Pago exacto
                        </button>
                      ) : null}
                    </div>
                  </section>
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-[var(--line)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                  <button
                    type="button"
                    className={`${buttonSecondary} min-h-12 px-6`}
                    onClick={() => setCheckoutOpen(false)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className={`${buttonPrimary} min-h-12 px-8`}
                    onClick={() => void onCheckout()}
                    disabled={cart.length === 0 || printing || !cashCovers}
                  >
                    {printing ? "Imprimiendo…" : `Cobrar ${formatMoney(total)}`}
                  </button>
                </footer>
              </div>
            </div>
          ) : null}

          {ticketSale ? (
            <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[var(--navy)]/50 p-3 sm:items-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ticket-ask-title"
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(11,61,50,0.28)] sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Printer size={20} />
                  </span>
                  <div>
                    <h2
                      id="ticket-ask-title"
                      className="font-[family-name:var(--font-display)] text-lg font-semibold"
                    >
                      ¿Imprimir el ticket?
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      La venta de {formatMoney(ticketSale.total)} ya quedó registrada.
                      El ticket solo se imprime si lo confirmas.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={`${buttonSecondary} min-h-11 px-5`}
                    onClick={() => setTicketSale(null)}
                    disabled={printing}
                  >
                    No imprimir
                  </button>
                  <button
                    type="button"
                    className={`${buttonPrimary} min-h-11 px-5`}
                    onClick={() => void printPendingTicket()}
                    disabled={printing}
                  >
                    {printing ? "Imprimiendo…" : "Imprimir ticket"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {picked ? (
            <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[var(--navy)]/45 p-3 sm:items-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-pick-title"
                className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_24px_60px_rgba(11,61,50,0.28)] sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <ProductThumb src={picked.image} alt={picked.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2
                      id="product-pick-title"
                      className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight"
                    >
                      {picked.name}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {productSubtitle(picked) || "Sin ficha adicional"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {picked.category ? (
                        <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                          {categoryLabel(picked.category)}
                        </span>
                      ) : null}
                      {picked.requiresPrescription || picked.controlled ? (
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          {picked.controlled ? "Controlado" : "Requiere receta"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-soft)]"
                    onClick={() => setPickedId(null)}
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["Marca", picked.genericName],
                    ["Presentación", picked.presentation],
                    ["Contenido", picked.concentration],
                    ["Proveedor", picked.laboratory],
                    ["Lote", picked.lot],
                    [
                      "Vencimiento",
                      picked.expiresAt ? formatExpiry(picked.expiresAt) : undefined,
                    ],
                    ["Código", picked.barcode],
                    [
                      "Contenido",
                      [
                        picked.unitsPerBox
                          ? `${picked.unitsPerBox} unidades por caja`
                          : "",
                        picked.unitsPerBlister
                          ? `${picked.unitsPerBlister} por paquete`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined,
                    ],
                    [
                      "Existencia",
                      `${sellableBoxes(picked)} cajas${
                        picked.looseUnits ? ` · ${picked.looseUnits} sueltas` : ""
                      }`,
                    ],
                  ]
                    .filter((entry): entry is [string, string] => Boolean(entry[1]))
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg bg-[var(--bg-soft)] px-2.5 py-2"
                      >
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {label}
                        </dt>
                        <dd className="text-sm font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Cómo se vende
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={sellableBoxes(picked) <= 0}
                    onClick={() => {
                      setPickUnit("caja");
                      setPickQty(1);
                    }}
                    className={`rounded-xl border px-2 py-3 text-left disabled:opacity-40 ${
                      pickUnit === "caja"
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[var(--muted)]">
                      Caja
                    </span>
                    <span className="mt-1 block text-base font-bold tabular-nums text-[var(--brand)]">
                      {formatMoney(picked.price)}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!pickedCanBlister || sellableBlisters(picked) <= 0}
                    onClick={() => {
                      setPickUnit("blister");
                      setPickQty(1);
                    }}
                    className={`rounded-xl border px-2 py-3 text-left disabled:opacity-40 ${
                      pickUnit === "blister"
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[var(--muted)]">
                      Paquete
                    </span>
                    <span className="mt-1 block text-base font-bold tabular-nums">
                      {pickedCanBlister
                        ? formatMoney(picked.blisterPrice!)
                        : "No aplica"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!pickedCanUnit || sellableUnits(picked) <= 0}
                    onClick={() => {
                      setPickUnit("unidad");
                      setPickQty(1);
                    }}
                    className={`rounded-xl border px-2 py-3 text-left disabled:opacity-40 ${
                      pickUnit === "unidad"
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[var(--muted)]">
                      Unidad
                    </span>
                    <span className="mt-1 block text-base font-bold tabular-nums">
                      {pickedCanUnit ? formatMoney(picked.unitPrice!) : "No aplica"}
                    </span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Cantidad</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)]"
                      onClick={() => setPickQty((qty) => Math.max(1, qty - 1))}
                      aria-label="Menos"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center text-base font-bold tabular-nums">
                      {pickQty}
                    </span>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)]"
                      onClick={() =>
                        setPickQty((qty) => Math.min(pickedMax, qty + 1))
                      }
                      disabled={pickQty >= pickedMax}
                      aria-label="Más"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={() => setPickedId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={buttonPrimary}
                    disabled={pickedMax <= 0}
                    onClick={() => {
                      const ok = addToCart(picked.id, pickUnit, pickQty);
                      if (!ok) return;
                      const label =
                        pickUnit === "unidad"
                          ? "Unidad"
                          : pickUnit === "blister"
                            ? "Paquete"
                            : "Caja";
                      setMessage(`${label}: ${picked.name} × ${pickQty}`);
                      setPickedId(null);
                    }}
                  >
                    Agregar {formatMoney(packPrice(picked, pickUnit) * pickQty)}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </AppShell>
      )}
    </BarcodeCapture>
  );
}
