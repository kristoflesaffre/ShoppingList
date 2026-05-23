import { describe, expect, it } from "vitest";
import { buildVacationDefaultItems } from "@/lib/vacation-default-items";

describe("buildVacationDefaultItems", () => {
  it("voegt Aftersun toe op Samen bij zomervakantie", () => {
    const household = new Set(["man", "vrouw"] as const);
    const items = buildVacationDefaultItems({
      season: "zomer",
      transport: "auto",
      accommodation: "hotel",
      household,
    });
    const aftersun = items.find((item) => item.name === "Aftersun");
    expect(aftersun).toEqual({
      name: "Aftersun",
      imageSrc: "/images/vakantie/aftersun_160.webp",
      tripPerson: "Samen",
      itemCategory: "Toiletartikelen",
    });
  });

  it("slaat Aftersun over bij wintervakantie", () => {
    const household = new Set(["man"] as const);
    const items = buildVacationDefaultItems({
      season: "winter",
      transport: "auto",
      accommodation: "hotel",
      household,
    });
    expect(items.some((item) => item.name === "Aftersun")).toBe(false);
  });

  it("zet Immodium, bril en zonnebril correct neer", () => {
    const household = new Set(["man", "vrouw", "jongens"] as const);
    const items = buildVacationDefaultItems({
      season: "zomer",
      transport: "auto",
      accommodation: "hotel",
      household,
    });
    const immodium = items.find((item) => item.name === "Immodium");
    expect(immodium).toEqual({
      name: "Immodium",
      imageSrc: "/images/vakantie/immodium_160.webp",
      tripPerson: "Samen",
      itemCategory: "Medicijnen",
    });
    const brillen = items.filter((item) => item.name === "Bril");
    expect(brillen).toHaveLength(2);
    expect(brillen.map((item) => item.tripPerson).sort()).toEqual(["Chloé", "Kristof"]);
    expect(brillen.every((item) => item.itemCategory === "Accessoires")).toBe(true);
    const zonnebrillen = items.filter((item) => item.name === "Zonnebril");
    expect(zonnebrillen.length).toBeGreaterThan(0);
    expect(zonnebrillen.every((item) => item.itemCategory === "Accessoires")).toBe(
      true,
    );
  });

  it("filtert op transport en verblijf", () => {
    const household = new Set(["man", "vrouw"] as const);
    const autoAppartement = buildVacationDefaultItems({
      season: "zomer",
      transport: "auto",
      accommodation: "appartement",
      household,
    });
    const vliegtuigHotel = buildVacationDefaultItems({
      season: "zomer",
      transport: "vliegtuig",
      accommodation: "hotel",
      household,
    });

    expect(autoAppartement.some((item) => item.name === "Afwasmiddel")).toBe(true);
    expect(vliegtuigHotel.some((item) => item.name === "Afwasmiddel")).toBe(false);
    expect(vliegtuigHotel.some((item) => item.name === "Bagageweegschaal")).toBe(true);
  });

  it("voegt de nieuwe persoonsgebonden vakantie-items toe voor elk type vakantie", () => {
    const household = new Set(["man", "vrouw", "meisjes"] as const);
    const items = buildVacationDefaultItems({
      season: "winter",
      transport: "vliegtuig",
      accommodation: "hotel",
      household,
    });

    const handtassen = items.filter((item) => item.name === "Handtas");
    expect(handtassen).toHaveLength(2);
    expect(handtassen.map((item) => item.tripPerson).sort()).toEqual(["Chloé", "Noë"]);
    expect(handtassen.every((item) => item.itemCategory === "Accessoires")).toBe(true);

    expect(items.find((item) => item.name === "Portefeuille")).toEqual({
      name: "Portefeuille",
      imageSrc: "/images/vakantie/portefeuille_vrouw_160.webp",
      tripPerson: "Chloé",
      itemCategory: "Accessoires",
    });

    const tandpasta = items.filter((item) => item.name === "Tandpasta");
    expect(tandpasta).toHaveLength(2);
    expect(tandpasta.map((item) => item.tripPerson).sort()).toEqual(["Chloé", "Kristof"]);
    expect(tandpasta.every((item) => item.itemCategory === "Toiletartikelen")).toBe(true);

    expect(items.find((item) => item.name === "Tekentablet")).toEqual({
      name: "Tekentablet",
      imageSrc: "/images/vakantie/tekentablet_kind_160.webp",
      tripPerson: "Noë",
      itemCategory: "Speelgoed",
    });

    expect(items.find((item) => item.name === "Thermos koffie")).toEqual({
      name: "Thermos koffie",
      imageSrc: "/images/vakantie/thermos_160.webp",
      tripPerson: "Chloé",
      itemCategory: "Eten & drinken",
    });

    expect(items.find((item) => item.name === "Snack onderweg")).toEqual({
      name: "Snack onderweg",
      imageSrc: "/images/items/suikerwafel_160.webp",
      tripPerson: "Samen",
      itemCategory: "Eten & drinken",
    });
  });
});
