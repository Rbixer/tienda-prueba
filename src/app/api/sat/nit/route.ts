import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/permissions";
import { consultSatNit, isConsumerFinal, nitKey, testSatLookup } from "@/lib/sat";
import { readStore } from "@/lib/server-store";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_LOOKUPS = 40;
const lookups = new Map<string, { count: number; resetAt: number }>();

function sessionFrom(auth: {
  user: {
    id: string;
    name: string;
    username: string;
    role: Session["role"];
    branchId: string;
    allowedBranchIds: string[];
    permissions: Session["permissions"];
  };
}): Session {
  return {
    userId: auth.user.id,
    name: auth.user.name,
    username: auth.user.username,
    role: auth.user.role,
    branchId: auth.user.branchId,
    allowedBranchIds: auth.user.allowedBranchIds,
    permissions: auth.user.permissions,
  };
}

export async function POST(request: Request) {
  try {
    const store = await readStore();
    const auth = await getAuthUser(store, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!hasPermission(sessionFrom(auth), "pos")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = Date.now();
    const bucket = lookups.get(auth.user.id);
    if (!bucket || now > bucket.resetAt) {
      lookups.set(auth.user.id, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      bucket.count += 1;
      if (bucket.count > MAX_LOOKUPS) {
        return NextResponse.json(
          { error: "Demasiadas consultas. Espera un momento." },
          { status: 429 },
        );
      }
    }

    const body = (await request.json().catch(() => null)) as { nit?: unknown } | null;
    const nit = typeof body?.nit === "string" ? body.nit.trim() : "";
    if (!nit || isConsumerFinal(nit) || nitKey(nit).length < 2) {
      return NextResponse.json({ error: "Escribe un NIT para consultar." }, { status: 400 });
    }

    const usuario = store.settings?.satUsuario?.trim();
    const clave = store.settings?.satClave?.trim();
    if (!usuario || !clave) {
      return NextResponse.json(testSatLookup(nit));
    }

    const result = await consultSatNit({ usuario, clave, nit });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ nit: result.nit, name: result.name });
  } catch (error) {
    console.error("POST /api/sat/nit", error);
    return NextResponse.json(
      { error: "No se pudo consultar el NIT." },
      { status: 500 },
    );
  }
}
