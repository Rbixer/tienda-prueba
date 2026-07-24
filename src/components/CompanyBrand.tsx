"use client";
import { Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function CompanyBrand({
  variant = "dark",
  showName = false,
  size = "md",
  layout = "row",
  /** Sin caja/fondo: solo el logo */
  plain = false,
  className = "",
}: {
  variant?: "dark" | "light";
  showName?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** `stack` = logo arriba y nombre abajo, centrados */
  layout?: "row" | "stack";
  plain?: boolean;
  className?: string;
}) {
  const { data } = useAuth();
  const settings = data.settings ?? { companyName: "MI BARRIO" };
  const hasLogo = Boolean(settings.logo);
  const bare = plain || (hasLogo && size === "xl");

  const box =
    size === "xl"
      ? bare
        ? "login-logo-box h-[min(28vw,18vh,10.5rem)] w-[min(28vw,18vh,10.5rem)] sm:h-[min(22vw,20vh,12rem)] sm:w-[min(22vw,20vh,12rem)]"
        : "h-28 w-28 sm:h-32 sm:w-32"
      : size === "lg"
        ? bare
          ? "h-20 w-20 sm:h-24 sm:w-24"
          : "h-14 w-14"
        : size === "sm"
          ? "h-8 w-8"
          : "h-10 w-10";
  const icon = size === "xl" ? 72 : size === "lg" ? 28 : size === "sm" ? 16 : 20;
  const nameClass =
    size === "xl"
      ? "text-[clamp(1.6rem,4.5vw,2.75rem)]"
      : size === "lg"
        ? "text-3xl"
        : size === "sm"
          ? "text-sm"
          : "text-base sm:text-lg";
  const rounded = size === "xl" ? "rounded-3xl" : "rounded-xl";
  const stack = layout === "stack";

  const frameClass = bare
    ? "bg-transparent"
    : variant === "dark"
      ? "bg-white/12 ring-1 ring-white/15"
      : "border border-[var(--line)] bg-white";

  return (
    <div
      className={`${
        stack
          ? "flex flex-col items-center gap-3 text-center sm:gap-4"
          : "flex items-center gap-2.5"
      } ${className}`.trim()}
    >
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden ${rounded} ${box} ${frameClass}`}
      >
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logo}
            alt={settings.companyName}
            className={`h-full w-full object-contain ${bare ? "p-0" : size === "xl" ? "p-3" : "p-1"}`}
          />
        ) : (
          <Store
            size={icon}
            className={variant === "dark" ? "text-white" : "text-[var(--navy)]"}
          />
        )}
      </span>
      {showName ? (
        <span
          className={`font-[family-name:var(--font-display)] font-semibold leading-tight tracking-tight ${nameClass} ${
            variant === "dark" ? "text-white" : "text-[var(--navy)]"
          }`}
        >
          {settings.companyName}
        </span>
      ) : null}
    </div>
  );
}
