import type { CompanySettings } from "@/lib/types";

/** Consulta pública de NIT de Infile. Devuelve el nombre registrado en la SAT. */
export const SAT_NIT_LOOKUP_URL =
  "https://consultareceptores.feel.com.gt/rest/action";

/** Nombre fijo mientras no hay usuario ni clave de Infile. No es un dato de la SAT. */
export const SAT_TEST_NAME = "CONTRIBUYENTE DE PRUEBA";

export function testSatLookup(nit: string): {
  nit: string;
  name: string;
  test: true;
} {
  return { nit: nitKey(nit), name: SAT_TEST_NAME, test: true };
}

export type SatLookupResult =
  | { ok: true; nit: string; name: string }
  | { ok: false; error: string };

export function nitKey(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function isConsumerFinal(value: string): boolean {
  const key = nitKey(value);
  return key === "CF" || key === "C/F" || key === "CONSUMIDORFINAL";
}

export function parseSatNitResponse(body: unknown): SatLookupResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Respuesta inválida de la consulta de NIT." };
  }
  const row = body as {
    nit?: unknown;
    nombre?: unknown;
    mensaje?: unknown;
  };
  const name = typeof row.nombre === "string" ? row.nombre.trim() : "";
  const nit = typeof row.nit === "string" ? row.nit.trim() : "";
  const message = typeof row.mensaje === "string" ? row.mensaje.trim() : "";
  if (name) return { ok: true, nit: nit || "", name };
  if (/credenciales/i.test(message)) {
    return {
      ok: false,
      error: "El usuario o la clave de consulta NIT no están registrados.",
    };
  }
  return {
    ok: false,
    error: message || "No se encontró ese NIT en la SAT.",
  };
}

export async function consultSatNit(input: {
  usuario: string;
  clave: string;
  nit: string;
  fetchImpl?: typeof fetch;
}): Promise<SatLookupResult> {
  const nit = nitKey(input.nit);
  if (!nit || isConsumerFinal(input.nit)) {
    return { ok: false, error: "El consumidor final no se consulta en la SAT." };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(SAT_NIT_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        emisor_codigo: input.usuario,
        emisor_clave: input.clave,
        nit_consulta: nit,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "No se pudo conectar con la consulta de NIT." };
  }
  if (!response.ok) {
    return { ok: false, error: "La consulta de NIT no respondió." };
  }
  try {
    return parseSatNitResponse(await response.json());
  } catch {
    return { ok: false, error: "Respuesta inválida de la consulta de NIT." };
  }
}

/** Conserva la clave del servidor cuando el navegador no la reenvía. */
export function mergeSatCredentials(
  current: CompanySettings | undefined,
  incoming: CompanySettings | undefined,
): Pick<CompanySettings, "satUsuario" | "satClave"> {
  const sentUsuario =
    !!incoming &&
    Object.prototype.hasOwnProperty.call(incoming, "satUsuario");
  if (!sentUsuario) {
    return {
      satUsuario: current?.satUsuario,
      satClave: current?.satClave,
    };
  }
  const usuario = incoming.satUsuario?.trim() || "";
  if (!usuario) return { satUsuario: undefined, satClave: undefined };
  return {
    satUsuario: usuario,
    satClave: current?.satClave,
  };
}

export function customerNameFromSales(
  sales: { customerNit?: string; customerName?: string; createdAt: string }[],
  nit: string,
): string | null {
  const key = nitKey(nit);
  if (!key || isConsumerFinal(nit)) return null;
  let best: { name: string; at: string } | null = null;
  for (const sale of sales) {
    const name = sale.customerName?.trim();
    if (!sale.customerNit || !name) continue;
    if (nitKey(sale.customerNit) !== key) continue;
    if (!best || sale.createdAt > best.at) best = { name, at: sale.createdAt };
  }
  return best?.name ?? null;
}
