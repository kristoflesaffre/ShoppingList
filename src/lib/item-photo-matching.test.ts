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
  const slugs = ["jas_man", "jas_vrouw", "jas_kind", "headphones"];
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
});
