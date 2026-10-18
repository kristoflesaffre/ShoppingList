/**
 * Genereert de twee foto's voor de cinemategels (lichtrij op de startpagina) met fal.ai en zet ze als webp in
 * public/images/hue/. Ze moeten bijna identiek zijn; enkel de gang achter de deuropening verschilt:
 *   1. basis (FLUX dev): donkere woonkamer, tv aan de muur, zwevende kast met blauwe ledstrip eronder;
 *   2. cinema       (FLUX Kontext op 1): deuropening naar een gang waar het licht brandt (andere kamers blijven aan);
 *   3. cinema_dark  (FLUX Kontext op 2): hetzelfde, maar het licht in de gang is uit (alle andere lampen uit).
 * FLUX tekent wat je noemt, ook met «no» ervoor: daarom de lichten in stap 3 «uitschakelen» i.p.v. weglaten.
 *
 * Vereist: FAL_KEY (omgeving of .env.local).  Gebruik: node scripts/generate-cinema-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(root, ".env.local");
if (!process.env.FAL_KEY && fs.existsSync(envPath)) {
  const m = fs.readFileSync(envPath, "utf8").match(/^FAL_KEY=(.*)$/m);
  if (m) process.env.FAL_KEY = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!process.env.FAL_KEY) {
  console.error("FAL_KEY ontbreekt (zet hem in .env.local of in je omgeving).");
  process.exit(1);
}

async function fal(model, input) {
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${await res.text()}`);
  const { images } = await res.json();
  return Buffer.from(await (await fetch(images[0].url)).arrayBuffer());
}
const asDataUri = async (buf) => `data:image/png;base64,${(await sharp(buf).png().toBuffer()).toString("base64")}`;
const KEEP = "Keep everything else exactly identical: same dark living room, same TV image, same floating cabinet with the blue LED glow, same person silhouette, same framing.";

const base = await fal("fal-ai/flux/dev", {
  image_size: "portrait_4_3",
  num_images: 1,
  prompt:
    "photorealistic editorial photo of a completely dark modern living room at midnight, seen from behind a low sofa, the silhouette of a person's head seen from behind in the lower middle, a large wall-mounted TV showing a blue misty movie scene, directly below the TV a long sleek floating wall-mounted cabinet clearly visible above the person's head, a faint blue LED strip under the floating cabinet casting a soft blue glow on the wall beneath it, everything else in deep shadow, the room lit only by the TV and the blue LED glow, cinematic, shallow depth of field, no text",
});
const lit = await fal("fal-ai/flux-pro/kontext", {
  image_url: await asDataUri(base),
  prompt: `Add an open doorway on the left side wall of the room leading to a hallway. The hallway beyond the doorway is lit with warm yellow ceiling light that spills slightly onto the doorway frame. ${KEEP}`,
});
const off = await fal("fal-ai/flux-pro/kontext", {
  image_url: await asDataUri(lit),
  prompt: `Switch off the light in the hallway behind the doorway: the hallway and doorway become pitch black with no light at all, no warm light spill. ${KEEP}`,
});

const outDir = path.join(root, "public/images/hue");
fs.mkdirSync(outDir, { recursive: true });
for (const [name, buf] of [["cinema", lit], ["cinema_dark", off]]) {
  for (const width of [480, 960]) await sharp(buf).resize(width).webp({ quality: 82 }).toFile(path.join(outDir, `${name}_${width}.webp`));
  console.log(`✓ ${name} → public/images/hue/${name}_480.webp`);
}
