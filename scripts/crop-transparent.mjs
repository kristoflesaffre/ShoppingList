/**
 * Snijdt de lege (transparante) rand rond een productfoto weg tot net tegen het beeld, en maakt het resultaat
 * opnieuw vierkant (transparant aangevuld, beeld gecentreerd). Schrijft altijd PNG. Een foto zonder transparantie
 * (bv. witte achtergrond) wordt bijgesneden op de kleur van de hoek.
 *
 * Het origineel blijft staan; het resultaat komt in dezelfde map als `<naam>-bijgesneden.png`.
 *
 * Usage: node scripts/crop-transparent.mjs <bestand of map> […]
 * Of sleep bestanden op «Foto bijsnijden.app» (zie scripts/make-crop-droplet.sh).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ALPHA_MIN = 10; // bijna-onzichtbare ruis van AI-uitsnijders telt niet mee
const SUFFIX = "-bijgesneden";
const EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".avif", ".tif", ".tiff"]);

async function contentBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let left = width, top = height, right = -1, bottom = -1, transparent = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < ALPHA_MIN) { transparent = true; continue; }
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null; // volledig leeg
  return { transparent, left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function cropOne(file) {
  const input = fs.readFileSync(file);
  const box = await contentBox(input);
  if (!box) return console.log(`⚠︎ ${path.basename(file)}: volledig transparant, overgeslagen`);

  let cropped = box.transparent
    ? sharp(input).extract(box)
    : sharp(await sharp(input).trim({ threshold: 12 }).toBuffer()); // geen transparantie: op hoekkleur bijsnijden
  const buffer = await cropped.ensureAlpha().png().toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  const side = Math.max(width, height);
  const square = await sharp(buffer)
    .extend({
      top: Math.floor((side - height) / 2), bottom: Math.ceil((side - height) / 2),
      left: Math.floor((side - width) / 2), right: Math.ceil((side - width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const target = path.join(path.dirname(file), `${path.parse(file).name}${SUFFIX}.png`);
  fs.writeFileSync(target, square);
  const before = await sharp(input).metadata();
  console.log(`✓ ${path.basename(target)}: ${before.width}×${before.height} → ${side}×${side}`);
}

const inputs = process.argv.slice(2).flatMap(arg =>
  fs.statSync(arg).isDirectory() ? fs.readdirSync(arg).map(name => path.join(arg, name)) : [arg],
).filter(file => EXTENSIONS.has(path.extname(file).toLowerCase()) && !path.parse(file).name.endsWith(SUFFIX)); // een map opnieuw slepen snijdt de resultaten niet nog eens bij

if (!inputs.length) {
  console.error("Usage: node scripts/crop-transparent.mjs <bestand of map> […]");
  process.exit(1);
}
for (const file of inputs) {
  try { await cropOne(file); } catch (error) { console.log(`✗ ${path.basename(file)}: ${error.message}`); }
}
