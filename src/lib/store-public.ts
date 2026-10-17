import type { StoreData, User } from "@/lib/types";
import { hashPassword, isBcryptHash } from "@/lib/auth-server";
import { normalizeStoreData } from "@/lib/store";

/** Copia del almacén segura para el cliente (sin hashes ni contraseñas). */
export function publicStore(data: StoreData): StoreData {
  const normalized = normalizeStoreData(data);
  const settings = { ...normalized.settings };
  const satConfigured = Boolean(settings.satUsuario && settings.satClave);
  delete settings.satClave;
  settings.satConfigured = satConfigured;
  return {
    ...normalized,
    settings,
    users: normalized.users.map((u) => ({ ...u, password: "" })),
  };
}

/**
 * Al aplicar un PUT del cliente: conserva hashes del servidor y
 * hashea contraseñas nuevas en texto plano.
 */
export async function mergeUsersWithSecrets(
  existing: User[],
  incoming: User[],
): Promise<{ users: User[]; error: string | null }> {
  const prevById = new Map(existing.map((u) => [u.id, u]));
  const users: User[] = [];

  for (const raw of incoming) {
    const prev = prevById.get(raw.id);
    const incomingPassword = raw.password?.trim() ?? "";

    let password: string;
    if (incomingPassword) {
      if (isBcryptHash(incomingPassword)) {
        // No aceptar hashes enviados por el cliente
        password = prev?.password ?? (await hashPassword(incomingPassword));
      } else {
        password = await hashPassword(incomingPassword);
      }
    } else if (prev?.password) {
      password = prev.password;
    } else {
      return {
        users: [],
        error: `El usuario "${raw.username}" necesita una contraseña.`,
      };
    }

    users.push({
      ...raw,
      password,
    });
  }

  return { users, error: null };
}
