import { describe, expect, it } from "vitest";
import { categorySubgroupKey, categorySubgroups, isFruitName, resolveItemCategoryFromName } from "./item-ingredient-category";

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
    Overig: ["Verse gist", "iets onbekends"],
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

describe("Conserven, Sauzen, Olie & Kruiden", () => {
  const C = "Conserven, Sauzen, Olie & Kruiden";
  const expected: Record<string, string[]> = {
    Conserven: ["blik tomaten", "blik tomaten blokjes", "blik tomaten heel", "passata", "tomatenpuree", "Kokosmelk", "Mais", "augurken", "zilveruitjes", "jalapenos", "hot dogs"],
    Sauzen: ["ketchup", "mayonaise", "mosterd", "samoerai", "samourai", "sriracha", "sojasaus", "pastasaus pot", "pizzasaus", "tomatensaus", "bechamelsaus", "rode currypasta", "rode curry pasta", "tandoori pasta"],
    "Olie & vet": ["arachideolie", "olijfolie", "sesamolie", "frituurvet", "spray airfryer", "spray olijfolie"],
    Bouillon: ["Rundsbouillon", "Kippenbouillon", "Groentenbouillon", "visbouillon"],
    "Kruiden & specerijen": ["Peper", "Zout", "Witte peperbollen", "zwarte peperbollen", "witte peper poeder", "cayennepeper", "Nootmuskaat", "Kippenkruiden", "satekruiden", "curry poeder", "tandoori poeder", "lookpoeder", "ajuinpoeder", "look granulaat", "kaneel", "laurier", "basilicum", "rozemarijn", "gedroogde basilicum", "gedroogde tijm", "gedroogde koriander", "gedroogde peterselie", "gedroogde dille"],
    Overig: ["gefrituurde ajuin", "knijpzakjes appel/banaan chloe", "iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(C, n), n).toBe(label);
    });
  }
  it("houdt de volgorde conserven, sauzen, olie, bouillon, kruiden aan", () => {
    const groups = categorySubgroups(C, ["Zout", "Kippenbouillon", "Olijfolie", "Ketchup", "Mais"], (n) => n);
    expect(groups.map((g) => g.label)).toEqual(["Conserven", "Sauzen", "Olie & vet", "Bouillon", "Kruiden & specerijen"]);
  });
});

describe("Alcoholische Dranken", () => {
  const A = "Alcoholische Dranken";
  const expected: Record<string, string[]> = {
    Bier: ["Karmeliet", "Quadrupel", "chouffe", "cornet oaked and smoked", "gouden carolus", "jupiler", "witbier"],
    "Wijn & bubbels": ["Rode wijn", "witte wijn", "Champagne", "Kleine flesje wijn rose", "Kleine flesje wijn wit", "kleine flesje wijn rood", "Sake", "prosecco"],
    "Sterke drank": ["Wodka", "bruine rum", "tequila", "gin"],
    Overig: ["iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(A, n), n).toBe(label);
    });
  }
  it("houdt de volgorde bier, wijn, sterke drank aan", () => {
    const groups = categorySubgroups(A, ["Wodka", "Rode wijn", "Karmeliet"], (n) => n);
    expect(groups.map((g) => g.label)).toEqual(["Bier", "Wijn & bubbels", "Sterke drank"]);
  });
});

describe("Huishouden & Schoonmaak", () => {
  const H = "Huishouden & Schoonmaak";
  const expected: Record<string, string[]> = {
    "Papier, folie & zakken": ["Huishoudfolie", "plastic wrap", "Zilverpapier", "Bakpapier", "Vuilzakken", "Toiletpapier", "Keukenrol"],
    Schoonmaak: ["Allesreiniger", "glasreiniger", "destop", "wc blokjes", "wc eend"],
    "Afwas & was": ["dreft", "vaatwastabletten", "zout vaatwasser", "afwasmiddel", "waspoeder", "wasverzachter", "wasmiddel"],
    Overig: ["aa batterijen", "aaa batterijen", "iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(H, n), n).toBe(label);
    });
  }
  it("houdt de volgorde papier, schoonmaak, afwas, overig aan", () => {
    const groups = categorySubgroups(H, ["aa batterijen", "dreft", "Allesreiniger", "Bakpapier"], (n) => n);
    expect(groups.map((g) => g.label)).toEqual(["Papier, folie & zakken", "Schoonmaak", "Afwas & was", "Overig"]);
  });
});

describe("Snoep & Chocolade", () => {
  const S = "Snoep & Chocolade";
  const expected: Record<string, string[]> = {
    "Koek & wafels": ["Pick up koekjes", "pick up", "Speculoos koekjes", "Boterwafels", "Suikerwafels", "suikerwafel", "Leo go mini"],
    Chocolade: ["Raffaello", "Ferrero rocher chocolade", "Guylain zeevruchten", "Carres hele hazelnoten chocolade", "chocolade", "chocolade chloe", "chocolade mannetjes", "chocoladeparels", "melkchocolade hazelnoten", "melkchocolade karamel zeezout", "pure chocolade", "hagelslag", "hagelslag melk", "hagelslag puur", "kinder surprise", "paaseieren", "paaseieren noe", "paaseitjes"],
    Snoep: ["kauwgom", "suikerspin", "ufo snoepjes", "zuur fruit snoep", "Marshmallows"],
    Overig: ["iets onbekends"],
  };
  for (const [label, names] of Object.entries(expected)) {
    it(`${label} herkent zijn producten`, () => {
      for (const n of names) expect(categorySubgroupKey(S, n), n).toBe(label);
    });
  }
  it("marshmallows vallen onder Snoep & Chocolade", () => {
    expect(resolveItemCategoryFromName("Marshmallows")).toBe(S);
  });
  it("houdt de volgorde koek, chocolade, snoep aan", () => {
    const groups = categorySubgroups(S, ["Kauwgom", "Raffaello", "Boterwafels"], (n) => n);
    expect(groups.map((g) => g.label)).toEqual(["Koek & wafels", "Chocolade", "Snoep"]);
  });
});
