import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/import-appointment-photos.mjs <source-folder>");
const fullOnly = process.argv.includes("--full-only");
const existingOnly = process.argv.includes("--existing-only");
const destination = path.resolve("public/images/afspraken");
const aliases = {
  "SS Rotterdam in Sunny Harbor": "ss_rotterdam",
  gyneacoloog: "gynaecoloog",
};
await fs.mkdir(destination, { recursive: true });
const files = (await fs.readdir(source)).filter((file) => /\.(png|jpe?g|webp)$/i.test(file)).sort();
const existing = new Set((await fs.readdir(destination)).filter((file) => file.endsWith("_240.webp")).map((file) => file.replace(/_240\.webp$/, "")));
const slugs = new Set();
for (const file of files) {
  const name = path.parse(file).name;
  const slug = aliases[name] ?? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (existingOnly && !existing.has(slug)) continue;
  if (slugs.has(slug)) throw new Error(`Duplicate image name: ${slug}`);
  slugs.add(slug);
  for (const size of fullOnly ? ["full"] : [240, 480, "full"]) {
    const image = sharp(path.join(source, file)).rotate();
    if (typeof size === "number") image.resize(size, size, { fit: "inside", withoutEnlargement: true });
    // Full-screen assets retain the original resolution and are loaded only on demand.
    await image.webp({ quality: size === "full" ? 90 : 85 })
      .toFile(path.join(destination, `${slug}_${size}.webp`));
  }
  console.log(slug);
}
console.log(`Imported ${slugs.size} appointment photos (${fullOnly ? "full resolution only" : "240px, 480px and full resolution"}); originals unchanged.`);
