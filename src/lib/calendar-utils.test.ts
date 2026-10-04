import { describe, expect, it } from "vitest";
import { selectCalendarPreviewItems } from "@/lib/calendar-utils";

describe("selectCalendarPreviewItems", () => {
  it("geeft vlees, aardappelen en een groente voorrang", () => {
    const items = [
      { name: "Maïs" },
      { name: "Radijsjes" },
      { name: "Komkommer" },
      { name: "Kipfilet" },
      { name: "Aardappelen" },
      { name: "Broccoli" },
    ];

    expect(selectCalendarPreviewItems(items).map((item) => item.name)).toEqual([
      "Kipfilet",
      "Aardappelen",
      "Radijsjes",
    ]);
  });

  it("vult ontbrekende voorkeuren aan in de oorspronkelijke volgorde", () => {
    const items = [
      { name: "Maïs" },
      { name: "Brood" },
      { name: "Room" },
      { name: "Currypoeder" },
    ];

    expect(selectCalendarPreviewItems(items).map((item) => item.name)).toEqual([
      "Maïs",
      "Brood",
      "Room",
    ]);
  });

  it("wijzigt de oorspronkelijke lijst niet", () => {
    const items = [
      { name: "Komkommer" },
      { name: "Kip" },
      { name: "Krieltjes" },
      { name: "Radijsjes" },
    ];

    selectCalendarPreviewItems(items);

    expect(items.map((item) => item.name)).toEqual([
      "Komkommer",
      "Kip",
      "Krieltjes",
      "Radijsjes",
    ]);
  });
});
