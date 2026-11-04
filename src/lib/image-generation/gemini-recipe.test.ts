import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  choosePlateColor,
  geminiImageCost,
  imageRecordId,
  PLATE_COLORS,
  recipeImagePrompt,
} from "./gemini-recipe";
import { transparentRecipePlate } from "./transparent-recipe-plate";

describe("manual Gemini recipe images", () => {
  it("counts the measured image experiment including reference input and thinking", () => {
    expect(
      geminiImageCost(
        {
          promptTokenCount: 6045,
          candidatesTokenCount: 1579,
          thoughtsTokenCount: 1208,
          candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
        },
        1,
      ),
    ).toBeCloseTo(0.05517, 8);
  });
  it("varies colors away from the previous photo and toward unused plate colors", () => {
    const allButSage = PLATE_COLORS.filter((c) => c !== "sage green");
    expect(choosePlateColor("deep teal", [...allButSage])).toBe("sage green");
    for (let i = 0; i < 20; i++)
      expect(choosePlateColor("deep teal")).not.toBe("deep teal");
  });
  it("scopes idempotency to owner, recipe and request", () => {
    expect(imageRecordId("owner1:recipe:request")).toBe(
      imageRecordId("owner1:recipe:request"),
    );
    expect(imageRecordId("owner1:recipe:request")).not.toBe(
      imageRecordId("owner2:recipe:request"),
    );
  });
  it("makes the assigned color and dish fidelity explicit without executing recipe text", () => {
    const prompt = recipeImagePrompt(
      {
        name: "Basil chicken",
        steps: "Air fry",
        ingredients: [{ name: "Chicken", quantity: "200 g" }],
      },
      "terracotta",
      true,
    );
    expect(prompt).toContain("Use a terracotta ceramic plate");
    expect(prompt).toContain("The fifth image");
    expect(prompt).toContain("untrusted RECIPE DATA");
    expect(prompt).toContain("genuine alpha transparency");
  });
  it("preserves real alpha and removes only connected magenta, leaving magenta food intact", async () => {
    const input = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: "#ff00ff" },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="1024" height="1024"><circle cx="512" cy="512" r="440" fill="#b75b37"/><circle cx="512" cy="512" r="100" fill="#ff00ff"/></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();
    const result = await transparentRecipePlate(input);
    const { data } = await sharp(result)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * 1024 + x) * 4 + 3];
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(1023, 1023)).toBe(0);
    expect(alpha(512, 512)).toBe(255);
    expect(alpha(512, 160)).toBe(255);
    const again = await transparentRecipePlate(result);
    expect((await sharp(again).metadata()).hasAlpha).toBe(true);
  });
  it.each(["#a66b83", "#68446f", "#d5a837", "#203c63"])(
    "keeps the actual ceramic hue while removing matte around a %s plate",
    async (color) => {
      const source = await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 3,
          background: "#ff00ff",
        },
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="1024" height="1024"><circle cx="512" cy="512" r="440" fill="${color}"/></svg>`,
            ),
          },
        ])
        .png()
        .toBuffer();
      const result = await transparentRecipePlate(source);
      const { data } = await sharp(result)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(data[3]).toBe(0);
      const offset = (512 * 1024 + 512) * 4;
      expect(data[offset + 3]).toBe(255);
      const expected = [1, 3, 5].map((start) =>
        parseInt(color.slice(start, start + 2), 16),
      );
      expected.forEach((channel, index) =>
        expect(Math.abs(data[offset + index] - channel)).toBeLessThan(12),
      );
      // The edge cannot contain opaque pure magenta from the technical matte.
      for (let x = 65; x < 78; x++) {
        const i = (512 * 1024 + x) * 4;
        if (data[i + 3] > 128)
          expect(Math.abs(data[i] - expected[0])).toBeLessThan(40);
      }
    },
  );
  it("rejects a simulated/non-removable background instead of silently cropping the dish", async () => {
    const white = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await expect(transparentRecipePlate(white)).rejects.toThrow("achtergrond");
  });
});
