import { describe, expect, it } from "vitest";
import { DISTINCT_PALETTE, photoKey, pickDistinctTint, pickRecipeTint, recipeTintColors, scaleQuantity } from "./recipe-tint";

function image(fill: (x: number, y: number) => [number, number, number]) {
  const size = 64;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fill(x, y);
      data.set([r, g, b, 255], (y * size + x) * 4);
    }
  return data;
}

describe("pickRecipeTint", () => {
  it("negeert de kom en de witte achtergrond en kiest het eten in het midden", () => {
    const data = image((x, y) => {
      const d = Math.hypot(x - 31.5, y - 31.5);
      if (d < 18) return [230, 120, 20]; // oranje soep
      if (d < 30) return [20, 90, 200]; // blauwe kom
      return [255, 255, 255];
    });
    const tint = pickRecipeTint(data);
    expect(tint).not.toBeNull();
    expect(tint![0]).toBeGreaterThan(200);
    expect(tint![2]).toBeLessThan(60);
  });

  it("geeft null voor een volledig grijze foto", () => {
    expect(pickRecipeTint(image(() => [128, 128, 128]))).toBeNull();
  });
});

describe("recipeTintColors", () => {
  it("wast de kleur uit met wit", () => {
    expect(recipeTintColors([255, 0, 0]).top).toBe("rgb(255, 179, 179)");
  });
});

describe("scaleQuantity", () => {
  it("schaalt het getal vooraan", () => {
    expect(scaleQuantity("2 pakken", 1.5)).toBe("3 pakken");
    expect(scaleQuantity("1,5 pak", 2)).toBe("3 pak");
    expect(scaleQuantity("3 eetlepels", 0.5)).toBe("1,5 eetlepels");
  });
  it("laat tekst zonder getal ongemoeid", () => {
    expect(scaleQuantity("snuifje", 2)).toBe("snuifje");
  });
});

describe("photoKey", () => {
  it("is stabiel en verschilt per foto", () => {
    expect(photoKey("data:a")).toBe(photoKey("data:a"));
    expect(photoKey("data:a")).not.toBe(photoKey("data:b"));
  });
});

describe("pickDistinctTint", () => {
  it("neemt de productkleur die genoeg verschilt", () => {
    expect(pickDistinctTint([[141, 178, 81]], [[140, 45, 3], [210, 174, 111]])).toEqual([141, 178, 81]);
  });
  it("valt terug op het palet als alle productkleuren te dicht liggen", () => {
    const pick = pickDistinctTint([[248, 178, 81], [245, 234, 200]], [[140, 45, 3], [210, 174, 111]]);
    expect(DISTINCT_PALETTE).toContainEqual(pick);
  });
});
