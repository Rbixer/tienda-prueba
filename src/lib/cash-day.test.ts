import { describe, expect, it } from "vitest";
import { calendarDay, isCashDayClosed, isCashFloatLocked } from "./store";
import type { CashShift } from "./types";

function shift(closedAt?: string): CashShift {
  return {
    id: "shift-1",
    branchId: "suc-1",
    userId: "u1",
    userName: "Admin",
    openingAmount: 500,
    openedAt: "2026-10-14T15:00:00.000Z",
    closedAt,
  };
}

describe("cierre de caja por día", () => {
  it("usa el día local, no la fecha UTC", () => {
    const evening = new Date(2026, 9, 14, 20, 0, 0);
    expect(calendarDay(evening)).toBe("2026-10-14");
  });

  it("marca el día cerrado solo si el corte es de hoy", () => {
    const today = new Date(2026, 9, 14, 16, 0, 0);
    const yesterday = new Date(2026, 9, 13, 21, 0, 0).toISOString();
    expect(isCashDayClosed([shift(today.toISOString())], "suc-1", today)).toBe(
      true,
    );
    expect(isCashDayClosed([shift(yesterday)], "suc-1", today)).toBe(false);
    expect(isCashDayClosed([shift()], "suc-1", today)).toBe(false);
  });
});

describe("cuota de apertura", () => {
  it("bloquea solo cuando el administrador deja la cuota fija", () => {
    expect(isCashFloatLocked({ cashFloatMode: "fija", cashFloat: 500 })).toBe(
      true,
    );
    expect(isCashFloatLocked({ cashFloatMode: "libre", cashFloat: 500 })).toBe(
      false,
    );
    expect(isCashFloatLocked({ cashFloat: 500 })).toBe(true);
    expect(isCashFloatLocked({})).toBe(false);
  });
});
