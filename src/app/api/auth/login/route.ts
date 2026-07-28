import { NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  clientIp,
  sessionFromStoreUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth-server";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const limited = checkLoginRateLimit(ip);
    if (limited) {
      return NextResponse.json({ error: limited }, { status: 429 });
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const username = body.username?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios." },
        { status: 400 },
      );
    }

    const store = await readStore();
    const user = store.users.find(
      (u) => u.username.toLowerCase() === username,
    );
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    // Si aún estaba en claro, ya se migrará en read/write; forzar hash si hace falta
    clearLoginRateLimit(ip);
    await setSessionCookie(user.id);
    const session = sessionFromStoreUser(user);

    return NextResponse.json({
      session,
    });
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
