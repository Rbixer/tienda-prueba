import type { Permission, Role, Session, User } from "@/lib/types";

export type PermissionMeta = {
  id: Permission;
  label: string;
  description: string;
  /** Incluido por defecto en vendedores nuevos */
  defaultForSeller: boolean;
  /** Solo tiene sentido para administración (se puede otorgar a vendedores) */
  adminModule?: boolean;
};

/** Catálogo de permisos del sistema (módulos). */
export const PERMISSION_CATALOG: PermissionMeta[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Ver el resumen e inicio",
    defaultForSeller: true,
  },
  {
    id: "pos",
    label: "POS",
    description: "Cobrar ventas en caja",
    defaultForSeller: true,
  },
  {
    id: "inventario",
    label: "Inventario",
    description: "Ver y gestionar productos",
    defaultForSeller: true,
  },
  {
    id: "reportes",
    label: "Reportes",
    description: "Consultar ventas e historial",
    defaultForSeller: true,
  },
  {
    id: "bodega",
    label: "Bodega",
    description: "Traslados entre sucursales",
    defaultForSeller: false,
    adminModule: true,
  },
  {
    id: "sucursales",
    label: "Sucursales",
    description: "Administrar sucursales",
    defaultForSeller: false,
    adminModule: true,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Crear usuarios y permisos",
    defaultForSeller: false,
    adminModule: true,
  },
  {
    id: "configuracion",
    label: "Configuración",
    description: "Logo y datos de la empresa",
    defaultForSeller: false,
    adminModule: true,
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.map((p) => p.id);

export function defaultPermissionsForRole(role: Role): Permission[] {
  if (role === "administrador") return [...ALL_PERMISSIONS];
  return PERMISSION_CATALOG.filter((p) => p.defaultForSeller).map((p) => p.id);
}

export function normalizePermissions(
  role: Role,
  permissions?: Permission[] | null,
): Permission[] {
  if (role === "administrador") return [...ALL_PERMISSIONS];
  const allowed = new Set(ALL_PERMISSIONS);
  const list = (permissions ?? defaultPermissionsForRole("vendedor")).filter(
    (p) => allowed.has(p),
  );
  // Dashboard siempre disponible para no dejar al usuario sin inicio
  if (!list.includes("dashboard")) list.unshift("dashboard");
  return Array.from(new Set(list));
}

export function hasPermission(
  session: Session | null | undefined,
  permission: Permission,
): boolean {
  if (!session) return false;
  if (session.role === "administrador") return true;
  return (session.permissions ?? []).includes(permission);
}

export function canManageUsers(session: Session | null | undefined): boolean {
  return hasPermission(session, "usuarios");
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    permissions: normalizePermissions(user.role, user.permissions),
  };
}
