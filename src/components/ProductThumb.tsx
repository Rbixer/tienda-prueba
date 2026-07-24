import { ImageIcon } from "lucide-react";

export function ProductThumb({
  src,
  alt,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const box =
    size === "sm"
      ? "h-9 w-9"
      : size === "lg"
        ? "h-16 w-16"
        : size === "xl"
          ? "h-20 w-20 sm:h-24 sm:w-24"
          : "h-12 w-12";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${box} shrink-0 rounded-xl object-cover ring-1 ring-[var(--line)] shadow-sm`}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-[var(--bg-soft)] text-[var(--muted)] ring-1 ring-[var(--line)]`}
      aria-hidden
    >
      <ImageIcon size={size === "sm" ? 14 : size === "xl" ? 28 : 18} />
    </span>
  );
}
