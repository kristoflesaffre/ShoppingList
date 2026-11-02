import { describe, expect, it } from "vitest";
import { categorySubgroupKey, categorySubgroups, isFruitName } from "./item-ingredient-category";

describe("isFruitName", () => {
  it("herkent het fruit van het lijstje", () => {
    for (const n of ["Zespri gold kiwi", "Appels", "Bananen", "Mandarijnen", "Limoen", "perziken", "Peren", "Aardbeien", "Bosbessen", "Frambozen", "Sinaasappels", "Kersen"]) {
      expect(isFruitName(n), n).toBe(true);
    }
  });
  it("laat zich niet vangen door groenten met een fruitnaam erin", () => {
    for (const n of ["Aardappelen", "Zoete aardappelen", "Aardpeer", "Kerstomaatjes", "Pruimtomaten", "Citroengras", "Avocado", "Ajuin", "Komkommer", "Look", "Tuinkers", "Peterselie"]) {
      expect(isFruitName(n), n).toBe(false);
    }
  });
});

describe("categorySubgroups", () => {
  const name = (n: string) => n;
  it("zet groenten boven fruit en behoudt de volgorde binnen elke groep", () => {
    expect(categorySubgroups("Groenten & Fruit", ["Appels", "Ajuin", "Bananen", "Look"], name)).toEqual([
      { label: "Groenten", items: ["Ajuin", "Look"] },
      { label: "Fruit", items: ["Appels", "Bananen"] },
    ]);
  });
  it("geen subkopje als er maar één soort is", () => {
    expect(categorySubgroups("Groenten & Fruit", ["Appels", "Bananen"], name)).toEqual([{ label: null, items: ["Appels", "Bananen"] }]);
    expect(categorySubgroups("Groenten & Fruit", ["Ajuin"], name)).toEqual([{ label: null, items: ["Ajuin"] }]);
  });
  it("laat andere categorieën ongemoeid", () => {
    expect(categorySubgroups("Brood", ["Appelkoek", "Melkbrood"], name)).toEqual([{ label: null, items: ["Appelkoek", "Melkbrood"] }]);
    expect(categorySubgroupKey("Brood", "Appelkoek")).toBe("");
  });
  it("sleepgroep volgt de subgroep", () => {
    expect(categorySubgroupKey("Groenten & Fruit", "Appels")).toBe("Fruit");
    expect(categorySubgroupKey("Groenten & Fruit", "Aardappelen")).toBe("Groenten");
  });
});

describe("Droogwaren & Bakproducten", () => {
  const D = "Droogwaren & Bakproducten";
  const expected: Record<string, string[]> = {
    "Pasta, rijst & noedels": ["pasta noe chloe", "spirelli pasta", "penne pasta", "cappellini pasta", "lasagnevellen", "verse lasagnebladen", "noedels", "rijst", "rijstpapier"],
    "Suiker & zoetstof": ["suiker", "bruine suiker", "lichtbruine suiker", "bloemsuiker", "parelsuiker", "vanillesuiker", "t-light suiker", "tagatesse", "zusto", "zusto zoetstof", "poedersuikervervanger", "honing"],
    "Bloem & bakbasis": ["00-bloem", "speltbloem", "zelfrijzende bloem", "zelfrijzend bakmeel", "amandelmeel", "maizena", "bakpoeder", "baking soda", "droge gist", "panko", "pannekoekenmix", "naan brood mix", "pudding poeder"],
    "Aroma's & bakextra's": ["vanillearoma", "amandelaroma", "vanillestokjes", "cacaopoeder", "chocoladedruppels", "rozijnen", "gehakte walnoten"],
    Overig: ["toastjes", "knijpzakjes appel banaan chloe", "iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(D, n), n).toBe(label);
    });
  }
  it("toont de groepen in vaste volgorde, zonder lege groepen, Overig onderaan", () => {
    expect(categorySubgroups(D, ["Toastjes", "Suiker", "Rijst", "Bloemsuiker"], (n) => n)).toEqual([
      { label: "Pasta, rijst & noedels", items: ["Rijst"] },
      { label: "Suiker & zoetstof", items: ["Suiker", "Bloemsuiker"] },
      { label: "Overig", items: ["Toastjes"] },
    ]);
  });
  it("geen subkopje als alles in één groep valt", () => {
    expect(categorySubgroups(D, ["Suiker", "Honing"], (n) => n)).toEqual([{ label: null, items: ["Suiker", "Honing"] }]);
  });
});

describe("Zuivel, Kaas & Eieren", () => {
  const Z = "Zuivel, Kaas & Eieren";
  const expected: Record<string, string[]> = {
    "Melk & drankjes": ["Melk halfvol", "melk mager", "melk vol", "Havermelk", "Amandelmelk", "Alpro kokosdrink", "Cécémel", "fristi"],
    "Yoghurt & desserts": ["Yoghurt", "Kokosyoghurt", "griekse yoghurt", "roze yoghurt", "platte kaas", "Alpro vanilla dessert"],
    "Boter & room": ["bakboter", "Bakboter vloeibaar", "smeerboter", "room 40 procent vet", "room 7 procent vet", "zure room", "slagroom", "mascarpone"],
    Kaas: ["geraspte kaas", "kaas blok", "kaas blokjes", "kaas sneetjes", "chaumes", "mozarella", "mozzarella", "parmezaan", "parmezaan blok", "parmezaan zakje", "boursin", "tete de moine", "roomkaas", "boterkaas"],
    Eieren: ["eieren", "Eieren 6", "Eieren 12", "ei"],
    Overig: ["iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(Z, n), n).toBe(label);
    });
  }
  it("houdt de volgorde melk, yoghurt, boter, kaas, eieren aan", () => {
    const groups = categorySubgroups(Z, ["Eieren 6", "Chaumes", "Bakboter", "Yoghurt", "Melk vol"], (n) => n);
    expect(groups.map((g) => g.label)).toEqual(["Melk & drankjes", "Yoghurt & desserts", "Boter & room", "Kaas", "Eieren"]);
  });
});
