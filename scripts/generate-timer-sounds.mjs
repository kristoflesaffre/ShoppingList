/**
 * Genereert de wekkergeluiden voor recepten (`src/lib/recipe-timers.ts`, `TIMER_SOUNDS`) met fal.ai
 * (ElevenLabs sound effects) en zet ze in public/sounds/timer/<id>.mp3. Eenmalig; opnieuw draaien
 * overschrijft ze.
 *
 *   node --env-file=.env.local scripts/generate-timer-sounds.mjs [id …]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL = "fal-ai/elevenlabs/sound-effects/v2";
const SOUNDS = {
  klokje:
    "Gentle kitchen timer chime: three soft ascending marimba notes, warm and rounded, clean ending, no harsh high frequencies, pleasant and calm",
  bel: "A single soft brass desk bell ding with a long gentle decay, warm and mellow, like a friendly kitchen timer finishing",
  kalimba: "Calm kalimba melody of four soft plucked notes, warm wooden tone, cheerful but relaxed notification, clean ending",
  harp: "Short gentle harp arpeggio going up, soft and airy, warm reverb, a relaxed reminder that the food is ready",
};

const key = process.env.FAL_KEY;
if (!key) throw new Error("FAL_KEY ontbreekt (draai met --env-file=.env.local).");
const outDir = path.join(process.cwd(), "public/sounds/timer");
await mkdir(outDir, { recursive: true });

const wanted = process.argv.slice(2);
for (const [id, text] of Object.entries(SOUNDS)) {
  if (wanted.length && !wanted.includes(id)) continue;
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: 2.5, prompt_influence: 0.6, output_format: "mp3_44100_128" }),
  });
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${await res.text()}`);
  const { audio } = await res.json();
  const file = await fetch(audio.url);
  if (!file.ok) throw new Error(`Download ${id} mislukt: ${file.status}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(outDir, `${id}.mp3`), bytes);
  console.log(`${id}.mp3 · ${Math.round(bytes.length / 1024)} kB`);
}
