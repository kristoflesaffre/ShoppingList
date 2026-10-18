/**
 * Foto's voor herkende Todoist-taken (public/images/taken/<naam>_240|480.webp, transparant). De titel wordt
 * vergeleken met de woorden hieronder; hoofdletters, accenten en leestekens tellen niet mee. Nieuwe foto:
 * bestand in beide formaten toevoegen en hier een regel bijzetten.
 */
/**
 * `upright`: rechtop tonen (bv. een telefoonscherm) i.p.v. 45° gedraaid in de hoek. `extra`: tweede, half zo
 * grote foto ernaast (bv. de tweede pil van een dosis).
 */
const TASK_PHOTOS: { file: string; keys: string[]; upright?: boolean; extra?: string }[] = [
  { file: "concerta", keys: ["concerta"] },
  { file: "cymbalta", keys: ["cymbalta"], extra: "cymbalta_30mg" },
  { file: "cyclus_app", keys: ["pmdd", "perimenopause", "menopauze", "menstruatie", "cyclus"], upright: true },
];

function normalize(s: string): string {
  return ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const PREPARED = TASK_PHOTOS.map((p) => ({ ...p, keys: p.keys.map((k) => normalize(k)) }));

export type TaskPhoto = { src: string; upright: boolean; extra: string | null };

/** Foto (pad zonder formaat-achtervoegsel) of null. Hele woorden: «pmdd» wel, «cyclusje» niet. */
export function taskPhotoFor(title: string): TaskPhoto | null {
  const t = normalize(title);
  const hit = PREPARED.find((p) => p.keys.some((k) => t.includes(k)));
  return hit ? { src: `/images/taken/${hit.file}`, upright: hit.upright === true, extra: hit.extra ? `/images/taken/${hit.extra}` : null } : null;
}
