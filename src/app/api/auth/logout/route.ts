import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout", error);
    return NextResponse.json(
      { error: "No se pudo cerrar sesión." },
      { status: 500 },
    );
  }
}
