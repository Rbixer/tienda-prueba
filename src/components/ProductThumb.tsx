import { ImageIcon } from "lucide-react";
export function ProductThumb({
  src,
  alt,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm"
      ? "h-9 w-9"
      : size === "lg"
        ? "h-16 w-16"
        : "h-12 w-12";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${box} shrink-0 rounded-xl object-cover ring-1 ring-white/70 shadow-sm`}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-white/50 text-[var(--muted)] ring-1 ring-white/70 backdrop-blur-md`}
      aria-hidden
    >
      <ImageIcon size={size === "sm" ? 14 : 18} />
    </span>
  );
}
