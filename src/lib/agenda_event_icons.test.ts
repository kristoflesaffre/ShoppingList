import { describe, expect, it } from "vitest";
import { agendaEventIcon } from "./agenda_event_icons";
import { agendaDisplayTitle } from "./agenda_birthdays";

const icon = (t: string) => agendaEventIcon(t)?.title ?? null;

describe("agendaEventIcon", () => {
  it("zet de juiste emoji vooraan en haalt andere emoji weg", () => {
    expect(icon("Trouw Lien & Pieter 🥂")).toBe("💍 Trouw Lien & Pieter");
    expect(icon("Wedding Sarah")).toBe("💍 Wedding Sarah");
    expect(icon("Moederdag")).toBe("💐 Moederdag");
    expect(icon("Mother's Day brunch")).toBe("💐 Mother's Day brunch");
    expect(icon("Vaderdag")).toBe("🍷 Vaderdag");
    expect(icon("Mama gestorven")).toBe("✝️ Mama gestorven");
    expect(icon("Zomervakantie")).toBe("🏖️ Zomervakantie");
    expect(icon("Paasvakantie")).toBe("🏖️ Paasvakantie");
    expect(icon("Pasen bij oma")).toBe("🥚 Pasen bij oma");
    expect(icon("Noë ziek")).toBe("🤒 Noë ziek");
    expect(icon("Hotel Amsterdam")).toBe("🏨 Hotel Amsterdam");
    expect(icon("[Smartschool] Soepdag")).toBe("🍲 [Smartschool] Soepdag");
    expect(icon("[Smartschool] Fruitschildag")).toBe("🍎 [Smartschool] Fruitschildag");
    expect(icon("PEDAGOGISCHE STUDIEDAG NOE")).toBe("🎒 PEDAGOGISCHE STUDIEDAG NOE");
    expect(icon("Oudercontact")).toBe("🎒 Oudercontact");
  });

  it("laat «ziekenhuis» en gewone afspraken met rust", () => {
    expect(icon("Ziekenhuis Imelda")).toBeNull();
    expect(icon("Sjotter Y&O vs De Zwaluw")).toBeNull();
  });
});

describe("agendaDisplayTitle", () => {
  it("verjaardag blijft 🎂, maar een overlijden wordt nooit een verjaardag", () => {
    expect(agendaDisplayTitle("Huub bday 🎈")).toBe("🎂 Huub verjaardag");
    expect(agendaDisplayTitle("Verjaardag overlijden opa")).toBe("✝️ Verjaardag overlijden opa");
  });
});
