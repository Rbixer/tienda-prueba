import {
  BarChart3,
  LayoutGrid,
  Package,
  ShoppingCart,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};
export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Inicio", icon: LayoutGrid },
  { href: "/app/pos", label: "POS", icon: ShoppingCart },
  { href: "/app/inventario", label: "Inventario", icon: Package },
  { href: "/app/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/app/sucursales", label: "Sucursales", icon: Store, adminOnly: true },
  { href: "/app/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
];
export function getNavItems(role?: Role | null) {
  return NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === "administrador",
  );
}
export function isNavActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}
