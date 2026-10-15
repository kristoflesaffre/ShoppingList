import { describe, expect, it } from "vitest";
import { agendaDisplayTitle, birthdayName, dedupeBirthdays } from "./agenda_birthdays";

describe("birthdayName", () => {
  it("herkent NL- en EN-synoniemen en haalt de naam eruit", () => {
    expect(birthdayName("Bart Machilse bday 🎈")).toBe("Bart Machilse");
    expect(birthdayName("Bart Machilsen verjaardag")).toBe("Bart Machilsen");
    expect(birthdayName("Bart Machilsen Bday")).toBe("Bart Machilsen");
    expect(birthdayName("Ivo Peeters's birthday")).toBe("Ivo Peeters");
    expect(birthdayName("Verjaardag van Huub")).toBe("Huub");
    expect(birthdayName("Huub B-day 🎉")).toBe("Huub");
    expect(birthdayName("Tante Chantale Roosen Bday 🎈")).toBe("Tante Chantale Roosen");
  });

  it("laat andere afspraken met rust", () => {
    expect(birthdayName("Sjotter Y&O vs De Zwaluw")).toBeNull();
    expect(birthdayName("Bdaycake bestellen")).toBeNull();
  });
});

describe("agendaDisplayTitle", () => {
  it("toont verjaardagen als «🎂 Naam verjaardag» zonder andere emoji", () => {
    expect(agendaDisplayTitle("Huub Bday 🎈")).toBe("🎂 Huub verjaardag");
    expect(agendaDisplayTitle("Mama gestorven")).toBe("Mama gestorven");
  });
});

describe("dedupeBirthdays", () => {
  it("houdt dezelfde verjaardag één keer over, met de langste schrijfwijze", () => {
    const out = dedupeBirthdays([
      { id: "a", title: "Bart Machilse bday 🎈" },
      { id: "b", title: "Bart Machilsen verjaardag" },
      { id: "c", title: "Bart Machilsen Bday" },
      { id: "d", title: "Lore & Noë Knutsel VM" },
    ]);
    expect(out.map((e) => [e.id, e.title])).toEqual([
      ["a", "🎂 Bart Machilsen verjaardag"],
      ["d", "Lore & Noë Knutsel VM"],
    ]);
  });

  it("houdt verschillende personen apart", () => {
    const out = dedupeBirthdays([
      { id: "a", title: "Bart bday" },
      { id: "b", title: "Huub bday" },
    ]);
    expect(out).toHaveLength(2);
  });
});
