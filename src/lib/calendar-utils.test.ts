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
    expect(day?.meals.find((m) => m.recipeName === "Rucolasoep")).toMatchObject({ photoUrl: "https://foto/rucola.webp", fromStock: true });
    expect(day?.meals.find((m) => m.recipeName === "Noedelsoep")).toMatchObject({ photoUrl: "https://foto/noedel.webp" });
  });

  describe("aardappelgerecht met bijgerechten", () => {
    const dish = (name: string, groupId?: string) => ({
      name,
      quantity: "1 portie",
      section: "Maandag",
      itemDate: "2026-10-12",
      fromStock: true,
      ...(groupId ? { recipeGroupId: groupId, recipeName: name } : {}),
    });
    const dayOf = (items: ReturnType<typeof dish>[]) =>
      buildCalendarEntries([{ date: "10-10-2026", items }], []).get("2026-10-12");

    it("zet aardappelen eerst, dan vlees, dan groenten", () => {
      const day = dayOf([
        dish("Rode kool met appeltjes", "recipe-r1-1791000000000"),
        dish("Schnitzel", "recipe-r2-1791000000001"),
        dish("Aardappelpuree", "recipe-r3-1791000000002"),
      ]);
      expect(day?.meals.map((m) => m.recipeName)).toEqual(["Aardappelpuree", "Schnitzel", "Rode kool met appeltjes"]);
    });

    it("maakt van losse diepvriescomponenten gerechten", () => {
      const day = dayOf([dish("Balletjes (diepvries)"), dish("Kroketten (diepvries)")]);
      expect(day?.meals.map((m) => m.recipeName)).toEqual(["Kroketten", "Balletjes"]);
      expect(day?.looseIngredients).toEqual([]);
    });

    it("zet een volwaardig hoofdgerecht vooraan, de puree wordt bijgerecht", () => {
      const day = dayOf([
        dish("Bloemkoolpuree", "recipe-r1-1791000000000"),
        dish("Kip tikka massala", "recipe-r2-1791000000001"),
        dish("Naan", "recipe-r3-1791000000002"),
      ]);
      expect(day?.meals.map((m) => m.recipeName)).toEqual(["Kip tikka massala", "Bloemkoolpuree", "Naan"]);
    });

    it("zet wat «voor Noë» is nooit als hoofdgerecht naast iets anders", () => {
      const day = dayOf([
        { ...dish("Lasagne", "recipe-r1-1791000000000"), forNoe: true },
        dish("Kip tikka massala", "recipe-r2-1791000000001"),
      ] as ReturnType<typeof dish>[]);
      expect(day?.meals.map((m) => m.recipeName)).toEqual(["Kip tikka massala", "Lasagne"]);
      expect(day?.meals[1].forNoe).toBe(true);
    });

    it("laat een dag zonder aardappelgerecht met rust", () => {
      const day = dayOf([dish("Rode kool (diepvries)"), dish("Schnitzel", "recipe-r2-1791000000001")]);
      expect(day?.meals.map((m) => m.recipeName)).toEqual(["Schnitzel"]);
      expect(day?.looseIngredients).toHaveLength(1);
    });
  });

  describe("meerdere soepen op één dag", () => {
    const soupItem = (name: string, groupId?: string) => ({
      name,
      quantity: "1 portie",
      section: "Maandag",
      itemDate: "2026-10-12",
      fromStock: true,
      ...(groupId ? { recipeGroupId: groupId, recipeName: name } : {}),
    });
    const mealNames = (items: ReturnType<typeof soupItem>[]) => {
      const day = buildCalendarEntries([{ date: "10-10-2026", items }], [{ id: "r2", name: "Wortelsoep", photoUrl: "https://foto/wortel.webp" }]).get("2026-10-12");
      return { names: day?.meals.map((m) => m.recipeName), day };
    };

    it("zet rucolasoep altijd als secundair gerecht", () => {
      expect(mealNames([soupItem("Rucolasoep", "recipe-r1-1791000000000"), soupItem("Wortelsoep", "recipe-r2-1791000000001")]).names).toEqual(["Wortelsoep", "Rucolasoep"]);
    });

    it("maakt van een losse diepvriessoep een gerecht", () => {
      const { names, day } = mealNames([soupItem("Rucolasoep", "recipe-r1-1791000000000"), soupItem("Wortelsoep (diepvries)")]);
      expect(names).toEqual(["Wortelsoep", "Rucolasoep"]);
      expect(day?.meals[0]).toMatchObject({ recipeId: "r2", photoUrl: "https://foto/wortel.webp", fromStock: true });
      expect(day?.looseIngredients).toEqual([]);
    });

    it("houdt de volgorde van twee andere soepen", () => {
      expect(mealNames([soupItem("Tomatensoep", "recipe-r3-1791000000000"), soupItem("Wortelsoep", "recipe-r2-1791000000001")]).names).toEqual(["Tomatensoep", "Wortelsoep"]);
    });

    it("laat één soep en andere diepvriesitems met rust", () => {
      const { names, day } = mealNames([soupItem("Rucolasoep", "recipe-r1-1791000000000"), soupItem("Soepgroenten (diepvries)")]);
      expect(names).toEqual(["Rucolasoep"]);
      expect(day?.looseIngredients).toHaveLength(1);
    });
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
