import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { readStore, writeStore } from "@/lib/server-store";
import { mergeUsersWithSecrets, publicStore } from "@/lib/store-public";
import { mergeSatCredentials } from "@/lib/sat";
import { normalizeStoreData } from "@/lib/store";
import type { StoreData } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const store = await readStore();
    const auth = await getAuthUser(store, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json(publicStore(store));
  } catch (error) {
    console.error("GET /api/store", error);
    return NextResponse.json(
      { error: "No se pudo leer el almacén" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const current = await readStore();
    const auth = await getAuthUser(current, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const data = (await request.json()) as StoreData;
    if (
      !data ||
      !Array.isArray(data.branches) ||
      !Array.isArray(data.users) ||
      !Array.isArray(data.products) ||
      !Array.isArray(data.sales)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const incomingVersion =
      typeof data.version === "number" ? data.version : undefined;
    const currentVersion = current.version ?? 0;
    if (
      incomingVersion !== undefined &&
      incomingVersion !== currentVersion
    ) {
      return NextResponse.json(
        {
          error: "Conflicto de versión: otro dispositivo guardó antes.",
          store: publicStore(current),
          version: currentVersion,
        },
        { status: 409 },
      );
    }

    const mergedUsers = await mergeUsersWithSecrets(current.users, data.users);
    if (mergedUsers.error) {
      return NextResponse.json({ error: mergedUsers.error }, { status: 400 });
    }

    const next = normalizeStoreData({
      ...data,
      users: mergedUsers.users,
      settings: {
        ...data.settings,
        ...mergeSatCredentials(current.settings, data.settings),
      },
      version: currentVersion + 1,
    });

    const saved = await writeStore(next);
    return NextResponse.json({
      ok: true,
      version: saved.version,
      store: publicStore(saved),
    });
  } catch (error) {
    console.error("PUT /api/store", error);
    return NextResponse.json(
      { error: "No se pudo guardar el almacén" },
      { status: 500 },
    );
  }
}
