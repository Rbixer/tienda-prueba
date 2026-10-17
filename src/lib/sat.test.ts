import { describe, expect, it } from "vitest";
import {
  consultSatNit,
  customerNameFromSales,
  isConsumerFinal,
  mergeSatCredentials,
  nitKey,
  parseSatNitResponse,
  SAT_TEST_NAME,
  testSatLookup,
} from "@/lib/sat";

describe("consulta de NIT", () => {
  it("normaliza el NIT y reconoce consumidor final", () => {
    expect(nitKey(" 1234-5 k ")).toBe("12345K");
    expect(isConsumerFinal("cf")).toBe(true);
    expect(isConsumerFinal("C/F")).toBe(true);
    expect(isConsumerFinal("consumidor final")).toBe(true);
    expect(isConsumerFinal("1234567-8")).toBe(false);
  });

  it("lee el nombre que devuelve la consulta", () => {
    expect(
      parseSatNitResponse({
        nit: "12345678",
        nombre: "FARMACIA EJEMPLO",
        mensaje: "",
      }),
    ).toEqual({ ok: true, nit: "12345678", name: "FARMACIA EJEMPLO" });
  });

  it("traduce credenciales rechazadas y un NIT vacío", () => {
    expect(parseSatNitResponse({ nit: "1", nombre: "", mensaje: "Credenciales no registradas" })).toEqual({
      ok: false,
      error: "El usuario o la clave de consulta NIT no están registrados.",
    });
    expect(parseSatNitResponse({ nit: "1", nombre: "  ", mensaje: "NIT no existe" })).toEqual({
      ok: false,
      error: "NIT no existe",
    });
  });

  it("no reenvía la clave y la conserva en el servidor", () => {
    expect(
      mergeSatCredentials(
        { companyName: "FARMACIA", satUsuario: "EMISOR", satClave: "secreto" },
        { companyName: "FARMACIA", satUsuario: "EMISOR" },
      ),
    ).toEqual({ satUsuario: "EMISOR", satClave: "secreto" });
    expect(
      mergeSatCredentials(
        { companyName: "FARMACIA", satUsuario: "EMISOR", satClave: "secreto" },
        { companyName: "FARMACIA" },
      ),
    ).toEqual({ satUsuario: "EMISOR", satClave: "secreto" });
    expect(
      mergeSatCredentials(
        { companyName: "FARMACIA", satUsuario: "EMISOR", satClave: "secreto" },
        { companyName: "FARMACIA", satUsuario: "" },
      ),
    ).toEqual({ satUsuario: undefined, satClave: undefined });
  });

  it("completa el nombre desde la venta más reciente con ese NIT", () => {
    const name = customerNameFromSales(
      [
        { customerNit: "1234-5", customerName: "Ana", createdAt: "2026-01-01" },
        { customerNit: "12345", customerName: "Ana López", createdAt: "2026-02-01" },
      ],
      "12345",
    );
    expect(name).toBe("Ana López");
  });

  it("en prueba devuelve un nombre de ejemplo, no el de la SAT", () => {
    expect(testSatLookup("108644995")).toEqual({
      nit: "108644995",
      name: SAT_TEST_NAME,
      test: true,
    });
  });

  it("consulta el servicio y devuelve el nombre", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ nit: "12345678", nombre: "JUAN PEREZ", mensaje: "" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;
    const result = await consultSatNit({
      usuario: "emisor",
      clave: "clave",
      nit: "12345678",
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, nit: "12345678", name: "JUAN PEREZ" });
  });
});
