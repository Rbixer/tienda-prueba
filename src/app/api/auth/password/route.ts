import { NextResponse } from "next/server";
import {
  getAuthUser,
  hashPassword,
  validateNewPassword,
  verifyPassword,
} from "@/lib/auth-server";
import { readStore, writeStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const store = await readStore();
    const auth = await getAuthUser(store, request);
    if (!auth) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!(await verifyPassword(currentPassword, auth.user.password))) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta." },
        { status: 400 },
      );
    }

    const policy = validateNewPassword(newPassword);
    if (policy) {
      return NextResponse.json({ error: policy }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword.trim());
    const users = store.users.map((u) =>
      u.id === auth.user.id ? { ...u, password: hashed } : u,
    );
    await writeStore({
      ...store,
      users,
      version: (store.version ?? 0) + 1,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/password", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña." },
      { status: 500 },
    );
  }
}
