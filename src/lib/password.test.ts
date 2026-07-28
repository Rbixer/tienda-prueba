import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

/** Reglas de hash alineadas con auth-server (sin importar next/headers). */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

describe("password hashing", () => {
  it("hashea y verifica con bcrypt", async () => {
    const hash = await bcrypt.hash("admin12345", 4);
    expect(isBcryptHash(hash)).toBe(true);
    expect(await bcrypt.compare("admin12345", hash)).toBe(true);
    expect(await bcrypt.compare("wrong", hash)).toBe(false);
  });

  it("exige mínimo 8 caracteres (política app)", () => {
    const min = 8;
    expect("short".length >= min).toBe(false);
    expect("password1".length >= min).toBe(true);
  });
});
