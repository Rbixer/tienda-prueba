import { NextResponse } from "next/server";
import { getAuthUser, sessionFromStoreUser } from "@/lib/auth-server";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const store = await readStore();
    const auth = await getAuthUser(store, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json({
      session: sessionFromStoreUser(auth.user),
    });
  } catch (error) {
    console.error("GET /api/auth/me", error);
    return NextResponse.json(
      { error: "No se pudo validar la sesión." },
      { status: 500 },
    );
  }
}
