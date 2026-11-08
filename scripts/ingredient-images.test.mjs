import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { inspectImage, prepareIngredient, publishIngredient, sizes } from "./ingredient-images.mjs";

const directories = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await fs.rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ingredient-image-test-"));
  directories.push(projectRoot);
  const source = path.join(projectRoot, "input.png");
  const object = await sharp({ create: { width: 240, height: 180, channels: 4, background: { r: 40, g: 120, b: 50, alpha: 1 } } }).png().toBuffer();
  await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: object, left: 80, top: 110 }]).png().toFile(source);
  return { projectRoot, source, reference: source, slug: "test_ingredient" };
}

describe("ingredient image preparation and publication", () => {
  it("stages all sizes with transparency, consistent margins and preserved originals, without publishing", async () => {
    const input = await fixture();
    const dir = await prepareIngredient(input);
    expect(await fs.readFile(path.join(dir, "original.png"))).toEqual(await fs.readFile(input.source));
    for (const size of sizes) {
      const image = await inspectImage(path.join(dir, `test_ingredient_${size}.webp`));
      expect([image.width, image.height]).toEqual([size, size]);
      expect(image.box.width / size).toBeCloseTo(0.94, 1);
      expect(image.box.left).toBeGreaterThan(0);
    }
    const html = await fs.readFile(path.join(dir, "preview.html"), "utf8");
    expect(html).toContain('width="48"');
    expect(html).toContain('class="sample dark"');
    await expect(fs.access(path.join(input.projectRoot, "public/images/ingredients"))).rejects.toThrow();
    await expect(prepareIngredient(input)).rejects.toThrow();
  });
  it("requires explicit approval and never overwrites an existing catalog file", async () => {
    const input = await fixture();
    await prepareIngredient(input);
    await expect(publishIngredient(input)).rejects.toThrow("approval");
    const files = await publishIngredient({ ...input, approved: true });
    expect(files).toHaveLength(3);
    const before = await fs.readFile(files[0]);
    await expect(publishIngredient({ ...input, approved: true })).rejects.toThrow("already exists");
    expect(await fs.readFile(files[0])).toEqual(before);
  });
  it("rejects changed candidates before creating any catalog files", async () => {
    const input = await fixture();
    const dir = await prepareIngredient(input);
    await fs.writeFile(path.join(dir, "test_ingredient_240.webp"), "tampered");
    await expect(publishIngredient({ ...input, approved: true })).rejects.toThrow("changed");
    await expect(fs.access(path.join(input.projectRoot, "public/images/ingredients"))).rejects.toThrow();
  });
  it.each(["../outside", "Baking soda", "baking_soda_320", "", "a/b"])("rejects unsafe or noncanonical slug %s", async (slug) => {
    const input = await fixture();
    await expect(prepareIngredient({ ...input, slug })).rejects.toThrow("slug");
  });
  it("rejects opaque backgrounds, even with an alpha channel", async () => {
    const opaque = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
    await expect(inspectImage(opaque)).rejects.toThrow("transparent background");
    const rgb = await sharp(opaque).removeAlpha().png().toBuffer();
    await expect(inspectImage(rgb)).rejects.toThrow("transparent alpha");
  });
  it("rejects empty images and clipped subjects", async () => {
    const blank = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    await expect(inspectImage(blank)).rejects.toThrow("fully transparent");
    const object = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 120, b: 0, alpha: 1 } } }).png().toBuffer();
    const clipped = await sharp(blank).composite([{ input: object, left: 0, top: 100 }]).png().toBuffer();
    await expect(inspectImage(clipped)).rejects.toThrow("canvas edge");
  });
  it("refuses partial existing catalogs without creating the remaining sizes", async () => {
    const input = await fixture();
    await prepareIngredient(input);
    const destination = path.join(input.projectRoot, "public/images/ingredients");
    await fs.mkdir(destination, { recursive: true });
    await fs.writeFile(path.join(destination, "test_ingredient_240.webp"), "existing");
    await expect(publishIngredient({ ...input, approved: true })).rejects.toThrow("already exists");
    expect(await fs.readdir(destination)).toEqual(["test_ingredient_240.webp"]);
  });
});
