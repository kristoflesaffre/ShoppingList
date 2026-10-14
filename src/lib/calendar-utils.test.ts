import { describe, expect, it } from "vitest";
import {
  buildCalendarEntries,
  selectCalendarPreviewItems,
} from "@/lib/calendar-utils";

describe("selectCalendarPreviewItems", () => {
  it("kiest één zetmeel, één groente en één vlees", () => {
    const items = [
      { name: "Maïs" },
      { name: "Radijsjes" },
      { name: "Komkommer" },
      { name: "Kipfilet" },
      { name: "Aardappelen" },
      { name: "Broccoli" },
    ];

    expect(selectCalendarPreviewItems(items).map((item) => item.name)).toEqual([
      "Aardappelen",
      "Radijsjes",
      "Kipfilet",
    ]);
  });

  it("telt vis als vlees, rijst/pasta als zetmeel, en geen rijstpapier of fruit", () => {
    const items = [
      { name: "Rijstpapier" },
      { name: "Appels" },
      { name: "Komkommer" },
      { name: "Kokosmelk" },
      { name: "Zalm" },
      { name: "Basmati rijst" },
    ];

    expect(selectCalendarPreviewItems(items).map((item) => item.name)).toEqual([
      "Basmati rijst",
      "Komkommer",
      "Zalm",
    ]);
  });

  it("ordent ook een dag met precies drie items als zetmeel · groente · vlees", () => {
    const items = [{ name: "Gehakt" }, { name: "Spaghetti" }, { name: "Tomaten" }];

    expect(selectCalendarPreviewItems(items).map((item) => item.name)).toEqual([
      "Spaghetti",
      "Tomaten",
      "Gehakt",
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
  it("toont bij een diepvriesgerecht de huidige receptfoto, niet de oude kopie", () => {
    const entries = buildCalendarEntries(
      [
        {
          date: "10-10-2026",
          items: [
            {
              name: "Rucolasoep",
              quantity: "1 portie",
              section: "Maandag",
              itemDate: "2026-10-12",
              recipeGroupId: "recipe-0b6f1e2a-1111-4c3d-9e8f-123456789abc-1791000000000",
              recipeName: "Rucolasoep",
              fromStock: true,
              stockPhotoUrl: "data:image/jpeg;base64,oud",
            },
            {
              name: "Noedelsoep (diepvries)",
              quantity: "1 portie",
              section: "Maandag",
              itemDate: "2026-10-12",
              fromStock: true,
              stockPhotoUrl: "data:image/jpeg;base64,oud2",
            },
          ],
        },
      ],
      [
        { id: "0b6f1e2a-1111-4c3d-9e8f-123456789abc", name: "Rucolasoep", photoUrl: "https://foto/rucola.webp" },
        { id: "r2", name: "Noedelsoep", photoUrl: "https://foto/noedel.webp" },
      ],
    );
    const day = entries.get("2026-10-12");
    expect(day?.meals[0]).toMatchObject({ photoUrl: "https://foto/rucola.webp", fromStock: true });
    expect(day?.looseIngredients[0]).toMatchObject({ photoUrl: "https://foto/noedel.webp" });
  });

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
