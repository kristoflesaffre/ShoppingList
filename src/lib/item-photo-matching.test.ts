import { describe, expect, it } from "vitest";
import { matchItemPhotoUrl } from "@/lib/item-photo-matching";
import { tripPersonImageSuffix } from "@/lib/trip-person";

describe("tripPersonImageSuffix", () => {
  it("kent man, vrouw en kind toe", () => {
    expect(tripPersonImageSuffix("Kristof")).toBe("man");
    expect(tripPersonImageSuffix("Chloé")).toBe("vrouw");
    expect(tripPersonImageSuffix("Noë")).toBe("kind");
    expect(tripPersonImageSuffix("Samen")).toBeNull();
  });
});

describe("matchItemPhotoUrl", () => {
  const slugs = [
    "jas_man",
    "jas_vrouw",
    "jas_kind",
    "headphones",
    "puddy",
    "laadpaal",
    "identiteitskaart_kind",
  ];
  const fileBaseBySlug = new Map(
    slugs.map((slug) => [slug, `vakantie/${slug}`]),
  );

  it("kiest gendered vakantie-variant op basis van tripPerson", () => {
    expect(
      matchItemPhotoUrl("Jas", slugs, 160, fileBaseBySlug, {
        personImageSuffix: "man",
      }),
    ).toBe("/images/vakantie/jas_man_160.webp");
    expect(
      matchItemPhotoUrl("Jas", slugs, 160, fileBaseBySlug, {
        personImageSuffix: "vrouw",
      }),
    ).toBe("/images/vakantie/jas_vrouw_160.webp");
    expect(
      matchItemPhotoUrl("Jas", slugs, 160, fileBaseBySlug, {
        personImageSuffix: "kind",
      }),
    ).toBe("/images/vakantie/jas_kind_160.webp");
  });

  it("mapt Imodium naar immodium-bestand", () => {
    const slugsWithImmodium = [...slugs, "immodium"];
    const fileBase = new Map(fileBaseBySlug);
    fileBase.set("immodium", "vakantie/immodium");
    expect(
      matchItemPhotoUrl("Imodium", slugsWithImmodium, 160, fileBase),
    ).toBe("/images/vakantie/immodium_160.webp");
    expect(
      matchItemPhotoUrl("Immodium", slugsWithImmodium, 160, fileBase),
    ).toBe("/images/vakantie/immodium_160.webp");
  });

  it("kiest expliciete vakantie-afbeeldingen voor voorbereidingsitems", () => {
    expect(matchItemPhotoUrl("Puddy verzorgen", slugs, 160, fileBaseBySlug)).toBe(
      "/images/vakantie/puddy_160.webp",
    );
    expect(matchItemPhotoUrl("Kat verzorgen", slugs, 160, fileBaseBySlug)).toBe(
      "/images/vakantie/puddy_160.webp",
    );
    expect(matchItemPhotoUrl("EV-route plannen", slugs, 160, fileBaseBySlug)).toBe(
      "/images/vakantie/laadpaal_160.webp",
    );
    expect(matchItemPhotoUrl("Kids ID regelen", slugs, 160, fileBaseBySlug)).toBe(
      "/images/vakantie/identiteitskaart_kind_160.webp",
    );
  });
});
