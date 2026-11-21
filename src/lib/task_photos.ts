/**
 * Foto's voor herkende Todoist-taken (public/images/taken/<naam>_240|480.webp, transparant). De titel wordt
 * vergeleken met de woorden hieronder; hoofdletters, accenten en leestekens tellen niet mee. Nieuwe foto:
 * bestand in beide formaten toevoegen en hier een regel bijzetten.
 */
/**
 * `upright`: rechtop tonen (bv. een telefoonscherm) i.p.v. 45° gedraaid in de hoek. `extra`: tweede, half zo
 * grote foto ernaast (bv. de tweede pil van een dosis). `last`: vaste dagtaken achteraan op het bord (rechts), zodat
 * andere to-do's eerst komen: 1 = pillen, 2 = de cyclus-app (altijd helemaal rechts).
 */
const TASK_PHOTOS: { file: string; keys: string[]; upright?: boolean; extra?: string; last?: number }[] = [
  { file: "concerta", keys: ["concerta"], last: 1 },
  { file: "cymbalta", keys: ["cymbalta"], extra: "cymbalta_30mg", last: 1 },
  { file: "cyclus_app", keys: ["pmdd", "perimenopause", "perimenopauze", "menopauze", "menstruatie", "cyclus"], upright: true, last: 2 },
];

function normalize(s: string): string {
  return ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const PREPARED = TASK_PHOTOS.map((p) => ({ ...p, keys: p.keys.map((k) => normalize(k)) }));

export type TaskPhoto = { src: string; upright: boolean; extra: string | null };

/** 0 = gewone taak, hoger = verder naar rechts (zie `last`). */
export function taskTailRank(title: string): number {
  const t = normalize(title);
  return PREPARED.find((p) => p.keys.some((k) => t.includes(k)))?.last ?? 0;
}

/** Zet de vaste dagtaken (pillen, dan de cyclus-app) achteraan; de rest houdt zijn volgorde. */
export function withRoutineLast<T extends { task: { content: string } }>(items: T[]): T[] {
  return items.map((it, i) => ({ it, i, r: taskTailRank(it.task.content) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.it);
}

/** Foto (pad zonder formaat-achtervoegsel) of null. Hele woorden: «pmdd» wel, «cyclusje» niet. */
export function taskPhotoFor(title: string): TaskPhoto | null {
  const t = normalize(title);
  const hit = PREPARED.find((p) => p.keys.some((k) => t.includes(k)));
  return hit ? { src: `/images/taken/${hit.file}`, upright: hit.upright === true, extra: hit.extra ? `/images/taken/${hit.extra}` : null } : null;
}
