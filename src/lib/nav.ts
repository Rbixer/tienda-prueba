import {
  BarChart3,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { Permission, Session } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Agrupa en la sección de administración del sidebar */
  adminModule?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Inicio", icon: LayoutGrid, permission: "dashboard" },
  { href: "/app/pos", label: "POS", icon: ShoppingCart, permission: "pos" },
  {
    href: "/app/inventario",
    label: "Inventario",
    icon: Package,
    permission: "inventario",
  },
  {
    href: "/app/bodega",
    label: "Bodega",
    icon: Warehouse,
    permission: "bodega",
    adminModule: true,
  },
  {
    href: "/app/reportes",
    label: "Reportes",
    icon: BarChart3,
    permission: "reportes",
  },
  {
    href: "/app/sucursales",
    label: "Sucursales",
    icon: Store,
    permission: "sucursales",
    adminModule: true,
  },
  {
    href: "/app/usuarios",
    label: "Usuarios",
    icon: Users,
    permission: "usuarios",
    adminModule: true,
  },
  {
    href: "/app/configuracion",
    label: "Configuración",
    icon: Settings,
    permission: "configuracion",
    adminModule: true,
  },
];

export function getNavItems(session?: Session | null) {
  return NAV_ITEMS.filter((item) => hasPermission(session, item.permission));
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}

/** Permiso requerido para una ruta /app/*. */
export function permissionForPath(pathname: string): Permission | null {
  if (pathname === "/app" || pathname === "/app/") return "dashboard";
  const match = NAV_ITEMS.find(
    (item) =>
      item.href !== "/app" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return match?.permission ?? null;
}

/** Solo permite redirecciones internas seguras bajo /app. */
export function safeAppPath(raw: string | null | undefined): string {
  if (!raw) return "/app";
  try {
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded.startsWith("/app")) return "/app";
    if (decoded.startsWith("//")) return "/app";
    if (decoded.includes("://")) return "/app";
    return decoded;
  } catch {
    return "/app";
  }
}
