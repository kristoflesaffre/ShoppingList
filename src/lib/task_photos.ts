/**
 * Foto's voor herkende Todoist-taken (public/images/taken/<naam>_240|480.webp, transparant). De titel wordt
 * vergeleken met de woorden hieronder; hoofdletters, accenten en leestekens tellen niet mee. Nieuwe foto:
 * bestand in beide formaten toevoegen en hier een regel bijzetten.
 */
const TASK_PHOTOS: { file: string; keys: string[] }[] = [
  { file: "concerta", keys: ["concerta"] },
  { file: "cymbalta", keys: ["cymbalta"] },
  { file: "cyclus_app", keys: ["pmdd", "perimenopause", "menopauze", "menstruatie", "cyclus"] },
];

function normalize(s: string): string {
  return ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const PREPARED = TASK_PHOTOS.map((p) => ({ file: p.file, keys: p.keys.map((k) => normalize(k)) }));

/** Pad naar de foto (zonder formaat-achtervoegsel) of null. Hele woorden: «pmdd» wel, «cyclusje» niet. */
export function taskPhotoFor(title: string): string | null {
  const t = normalize(title);
  const hit = PREPARED.find((p) => p.keys.some((k) => t.includes(k)));
  return hit ? `/images/taken/${hit.file}` : null;
}
