import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/permissions";
import { readStore, writeStore } from "@/lib/server-store";
import { publicStore } from "@/lib/store-public";
import { normalizeStoreData } from "@/lib/store";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const store = await readStore();
    const auth = await getAuthUser(store, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const session: Session = {
      userId: auth.user.id,
      name: auth.user.name,
      username: auth.user.username,
      role: auth.user.role,
      branchId: auth.user.branchId,
      allowedBranchIds: auth.user.allowedBranchIds,
      permissions: auth.user.permissions,
    };
    if (!hasPermission(session, "configuracion")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      usuario?: unknown;
      clave?: unknown;
    } | null;
    const usuario = typeof body?.usuario === "string" ? body.usuario.trim() : "";
    const clave = typeof body?.clave === "string" ? body.clave.trim() : "";

    const settings = { ...store.settings };
    if (!usuario) {
      delete settings.satUsuario;
      delete settings.satClave;
      settings.satConfigured = false;
    } else {
      if (!clave && !settings.satClave) {
        return NextResponse.json(
          { error: "Escribe la clave de consulta NIT." },
          { status: 400 },
        );
      }
      settings.satUsuario = usuario;
      if (clave) settings.satClave = clave;
      delete settings.satConfigured;
    }

    const saved = await writeStore(
      normalizeStoreData({
        ...store,
        settings,
        version: (store.version ?? 0) + 1,
      }),
    );
    return NextResponse.json({ ok: true, store: publicStore(saved) });
  } catch (error) {
    console.error("POST /api/sat/credentials", error);
    return NextResponse.json(
      { error: "No se pudo guardar la consulta de NIT." },
      { status: 500 },
    );
  }
}
