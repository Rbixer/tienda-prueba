import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/server-store";
import type { StoreData } from "@/lib/types";
export const runtime = "nodejs";
export async function GET() {
  try {
    const data = await readStore();
    return NextResponse.json(data);
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
    await writeStore(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/store", error);
    return NextResponse.json(
      { error: "No se pudo guardar el almacén" },
      { status: 500 },
    );
  }
}
