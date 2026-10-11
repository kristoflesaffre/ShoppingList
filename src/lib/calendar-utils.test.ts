import { describe, expect, it } from "vitest";
import {
  buildCalendarEntries,
  selectCalendarPreviewItems,
} from "@/lib/calendar-utils";

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

describe("buildCalendarEntries", () => {
  it("neemt Frituur op als afhaalgerecht en niet als los item", () => {
    const entries = buildCalendarEntries(
      [
        {
          date: "10-10-2026",
          items: [
            {
              name: "Frituur",
              quantity: "1 stuk",
              section: "Dinsdag",
              itemDate: "2026-10-13",
            },
          ],
        },
      ],
      [],
    );

    expect(entries.get("2026-10-13")).toMatchObject({
      meals: [
        {
          recipeName: "Frituur",
          ingredientCount: 0,
          takeout: true,
          photoUrl: "/images/frituur/frieten_groot_320.webp",
        },
      ],
      looseIngredients: [],
    });
  });
});
