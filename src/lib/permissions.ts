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
    description: "Traslados desde la bodega",
    defaultForSeller: false,
    adminModule: true,
  },
  {
    id: "proveedores",
    label: "Proveedores",
    description: "Proveedores y pagos",
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
    description: "Empresa, usuarios y datos del negocio",
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
  return (
    hasPermission(session, "usuarios") || hasPermission(session, "configuracion")
  );
}

/** Tiendas visibles: admin vacío = todas; vendedor siempre incluye su branchId. */
export function normalizeAllowedBranchIds(
  role: Role,
  branchId: string,
  allowed?: string[] | null,
): string[] {
  if (role === "administrador") {
    return Array.from(new Set((allowed ?? []).filter(Boolean)));
  }
  const list = (allowed?.length ? allowed : [branchId]).filter(Boolean);
  if (!list.includes(branchId)) list.unshift(branchId);
  return Array.from(new Set(list));
}

export function normalizeUser(user: User): User {
  const permissions = normalizePermissions(user.role, user.permissions);
  return {
    ...user,
    permissions,
    allowedBranchIds: normalizeAllowedBranchIds(
      user.role,
      user.branchId,
      user.allowedBranchIds,
    ),
  };
}

export function userCanAccessBranch(
  session: Session | null | undefined,
  branchId: string,
): boolean {
  if (!session) return false;
  if (session.role === "administrador") {
    if (!session.allowedBranchIds?.length) return true;
    return session.allowedBranchIds.includes(branchId);
  }
  const allowed = session.allowedBranchIds?.length
    ? session.allowedBranchIds
    : [session.branchId];
  return allowed.includes(branchId);
}
