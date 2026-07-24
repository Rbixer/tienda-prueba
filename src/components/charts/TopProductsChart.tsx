"use client";
import type { TopProduct } from "@/lib/analytics";
import { ProductThumb } from "@/components/ProductThumb";
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
      {products.map((product) => {
        const width = Math.max(8, (product.quantity / max) * 100);
        return (
          <div
            key={product.productId}
            className="flex items-center gap-3 rounded-xl bg-[var(--bg-soft)] px-2.5 py-2"
          >
            <ProductThumb src={product.image} alt={product.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="shrink-0 text-xs font-bold text-[var(--ink)]">
                  {product.quantity}
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {formatMoney(product.revenue)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
