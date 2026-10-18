/**
 * Genereert de twee foto's voor de cinemategels in de lichtrij op de startpagina (gsm) met fal.ai
 * (FLUX) en zet ze als webp in public/images/hue/.
 *
 * Vereist: FAL_KEY (omgeving of .env.local).
 *   node scripts/generate-cinema-photos.mjs           # beide
 *   node scripts/generate-cinema-photos.mjs cinema    # één ervan opnieuw
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(root, ".env.local");
if (!process.env.FAL_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^FAL_KEY=(.*)$/);
    if (m) process.env.FAL_KEY = m[1].trim().replace(/^["']|["']$/g, "");
  }
}
if (!process.env.FAL_KEY) {
  console.error("FAL_KEY ontbreekt (zet hem in .env.local of in je omgeving).");
  process.exit(1);
}

const STYLE =
  "editorial interior photograph, cozy modern Belgian living room at night, large flat TV on the wall showing a softly glowing movie scene, comfortable sofa with a knitted throw and cushions, shot from behind the sofa at eye level, shallow depth of field, cinematic, photorealistic, no people, no text, no logos";
const PHOTOS = {
  cinema: `${STYLE}, warm dimmed amber lamps and a low glowing floor lamp, candle-like warm light, snug and inviting, rich warm tones`,
  cinema_dark: `${STYLE}, all room lights switched off, the room lit only by the cool blue glow of the TV screen, deep shadows, moody dark cinema atmosphere, a few faint reflections`,
};

const only = process.argv[2];
const outDir = path.join(root, "public/images/hue");
fs.mkdirSync(outDir, { recursive: true });

for (const [name, prompt] of Object.entries(PHOTOS)) {
  if (only && only !== name) continue;
  const res = await fetch("https://fal.run/fal-ai/flux/dev", {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_size: "portrait_4_3", num_images: 1, enable_safety_checker: true }),
  });
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${await res.text()}`);
  const { images } = await res.json();
  const img = await fetch(images[0].url).then((r) => r.arrayBuffer());
  for (const width of [480, 960]) {
    await sharp(Buffer.from(img)).resize(width).webp({ quality: 82 }).toFile(path.join(outDir, `${name}_${width}.webp`));
  }
  console.log(`✓ ${name} → public/images/hue/${name}_480.webp`);
}
