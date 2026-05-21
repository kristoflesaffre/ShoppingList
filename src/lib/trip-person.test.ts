import { describe, expect, it } from "vitest";
import { tripPersonTabForVacationItem } from "@/lib/trip-person";

describe("tripPersonTabForVacationItem", () => {
  it("valt niet terug op Samen bij ontbrekende tripPerson", () => {
    expect(tripPersonTabForVacationItem({})).toBeNull();
    expect(tripPersonTabForVacationItem({ tripPerson: "" })).toBeNull();
    expect(
      tripPersonTabForVacationItem({ tripPerson: "", section: "Algemeen" }),
    ).toBeNull();
  });

  it("gebruikt expliciete tripPerson of section als tabnaam", () => {
    expect(tripPersonTabForVacationItem({ tripPerson: "Samen" })).toBe("Samen");
    expect(tripPersonTabForVacationItem({ section: "Kristof" })).toBe("Kristof");
  });
});
