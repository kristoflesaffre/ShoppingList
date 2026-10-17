import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { photoFileBase, syncRecipePhotos, galleryHtml } from "./export-recipe-photos.mjs";
const dirs = [];
const directory = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-photo-test-")); dirs.push(dir); return dir; };
const recipe = { id: "recipe-123", name: "Crème brûlée", photoUrl: "https://example.test/photo.webp" };
const download = () => vi.fn(async () => ({ buffer: Buffer.from("photo-original-bytes"), extension: "webp" }));
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); vi.restoreAllMocks(); });
describe("local recipe photo sync", () => {
  it("uses readable names and keeps same-name recipes distinct", () => {
    expect(photoFileBase("Crème brûlée", "recipe-123")).toBe("creme-brulee__recipe-123");
    expect(photoFileBase("../", "../../another-id")).toBe("recept__another-id");
    expect(photoFileBase("Crème brûlée", "another-id")).not.toBe(photoFileBase("Crème brûlée", "recipe-123"));
  });
  it("keeps original bytes, skips unchanged downloads, and renames without downloading", async () => {
    const outputDir = directory(); const get = download();
    const run = recipes => syncRecipePhotos({ recipes, outputDir, appId: "app", download: get });
    const first = await run([recipe]);
    expect(fs.readFileSync(path.join(outputDir, first.items[0].file), "utf8")).toBe("photo-original-bytes");
    expect((await run([recipe])).unchanged).toBe(1);
    const renamed = await run([{ ...recipe, name: "Vanille dessert" }]);
    expect(renamed.items[0].file).toBe("vanille-dessert__recipe-123.webp");
    expect(get).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(outputDir, first.items[0].file))).toBe(false);
    expect(JSON.stringify(renamed)).not.toContain(recipe.photoUrl);
  });
  it("preserves the previous copy if a new photo cannot be downloaded", async () => {
    const outputDir = directory();
    const first = await syncRecipePhotos({ recipes: [recipe], outputDir, appId: "app", download: download() });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await syncRecipePhotos({ recipes: [{ ...recipe, photoUrl: "https://example.test/broken.webp" }], outputDir, appId: "app", download: async () => { throw new Error("network"); } });
    expect(result.failedOrSkipped).toBe(1);
    expect(result.items[0].file).toBe(first.items[0].file);
    expect(fs.readFileSync(path.join(outputDir, result.items[0].file), "utf8")).toBe("photo-original-bytes");
  });
  it("archives changed and removed photos without deleting unrelated files", async () => {
    const outputDir = directory(); const get = download();
    const run = recipes => syncRecipePhotos({ recipes, outputDir, appId: "app", download: get });
    await run([recipe]); await run([{ ...recipe, photoUrl: "https://example.test/updated.webp" }]);
    expect(fs.readdirSync(path.join(outputDir, "_previous"))).toHaveLength(1);
    fs.writeFileSync(path.join(outputDir, "my-own-photo.jpg"), "keep");
    await run([]);
    expect(fs.readdirSync(path.join(outputDir, "_previous"))).toHaveLength(2);
    expect(fs.existsSync(path.join(outputDir, "my-own-photo.jpg"))).toBe(true);
  });
  it("does not reuse another application's local collection", async () => {
    const outputDir = directory();
    await syncRecipePhotos({ recipes: [recipe], outputDir, appId: "app", download: download() });
    await expect(syncRecipePhotos({ recipes: [], outputDir, appId: "other" })).rejects.toThrow("another Instant app");
    expect(fs.existsSync(path.join(outputDir, "creme-brulee__recipe-123.webp"))).toBe(true);
  });
  it("escapes recipe names in the visual index", () => {
    const html = galleryHtml({ exportedAt: new Date().toISOString(), items: [{ name: '<img src=x onerror="alert(1)">', file: 'photo.webp', status: 'ok' }] });
    expect(html).not.toContain('<h2><img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('id="search"');
  });
});
