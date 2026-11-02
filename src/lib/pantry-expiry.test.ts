import { describe, expect, it } from "vitest";
import { isPantryExpired, pantryExpiryLabel, pantryExpiryPillLabel } from "./pantry-expiry";

const today = new Date(2026, 10, 2);

describe("pantryExpiryLabel", () => {
  it("toont de datum zolang het product goed is, vandaag inbegrepen", () => {
    expect(pantryExpiryLabel("2027-03-12", today)).toBe("tot 12 mrt 2027");
    expect(pantryExpiryLabel("2026-11-02", today)).toBe("tot 2 nov 2026");
    expect(isPantryExpired("2026-11-02", today)).toBe(false);
  });

  it("meldt een voorbije datum als vervallen", () => {
    expect(pantryExpiryLabel("2026-11-01", today)).toBe("vervallen op 1 nov 2026");
    expect(isPantryExpired("2026-11-01", today)).toBe(true);
  });

  it("is optioneel: geen of ongeldige datum geeft niets", () => {
    for (const value of [null, undefined, "", "morgen"]) {
      expect(pantryExpiryLabel(value, today)).toBeNull();
      expect(isPantryExpired(value, today)).toBe(false);
    }
  });
});

describe("pantryExpiryPillLabel", () => {
  it("toont een goede datum zonder «tot»", () => {
    expect(pantryExpiryPillLabel("2027-03-12", today)).toBe("12 mrt 2027");
    expect(pantryExpiryPillLabel("2026-11-02", today)).toBe("2 nov 2026");
  });

  it("korter als vervallen, van een vorig jaar enkel het jaar", () => {
    expect(pantryExpiryPillLabel("2026-10-03", today)).toBe("vervallen 3 okt");
    expect(pantryExpiryPillLabel("2025-10-03", today)).toBe("vervallen 2025");
  });

  it("geeft niets zonder geldige datum", () => {
    expect(pantryExpiryPillLabel(null, today)).toBeNull();
    expect(pantryExpiryPillLabel("morgen", today)).toBeNull();
  });
});
