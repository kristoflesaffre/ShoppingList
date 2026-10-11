import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeRecipeImage } from "./normalize-recipe-image.js";

describe("normalizeRecipeImage", () => {
  it("maakt een rond WebP-beeld met transparante hoeken", async () => {
    const source = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: "#ffffff",
      },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="300" height="300"><circle cx="150" cy="150" r="138" fill="#184f58"/><circle cx="150" cy="150" r="112" fill="#d98c32"/></svg>',
          ),
          left: 50,
          top: 50,
        },
      ])
      .png()
      .toBuffer();

    const result = await normalizeRecipeImage(source, { size: 256 });
    const metadata = await sharp(result).metadata();
    const { data, info } = await sharp(result)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];

    expect(metadata.format).toBe("webp");
    expect(metadata.hasAlpha).toBe(true);
    expect(info.width).toBe(256);
    expect(info.height).toBe(256);
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(255, 255)).toBe(0);
    expect(alphaAt(128, 128)).toBe(255);
  });
});
