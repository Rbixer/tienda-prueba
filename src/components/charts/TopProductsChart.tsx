"use client";
import type { TopProduct } from "@/lib/analytics";
import { formatMoney } from "@/lib/store";

type Props = { products: TopProduct[] };

export function TopProductsChart({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Aún no hay productos vendidos esta semana.
      </p>
    );
  }
  const max = Math.max(...products.map((p) => p.quantity), 1);
  return (
    <div className="space-y-3">
      {products.map((product, index) => {
        const width = Math.max(10, (product.quantity / max) * 100);
        return (
          <div key={product.productId}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium">
                <span className="mr-1.5 text-[var(--muted)]">{index + 1}.</span>
                {product.name}
              </p>
              <p className="shrink-0 text-xs font-semibold text-[var(--brand)]">
                {product.quantity} und
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-white/50 bg-white/35">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#14b8a6,#22d3ee)] transition-[width] duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {formatMoney(product.revenue)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
