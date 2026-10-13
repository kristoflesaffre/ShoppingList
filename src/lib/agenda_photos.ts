/**
 * Foto's voor herkende afspraken (public/images/afspraken/<naam>_240|480.webp). Titel en plaats van een
 * afspraak worden vergeleken met de namen en synoniemen hieronder; hoofdletters, accenten en leestekens
 * tellen niet mee. Nieuwe foto: bestand toevoegen in beide formaten en hier een regel bijzetten.
 */

const AGENDA_PHOTOS: { file: string; keys: string[] }[] = [
  { file: "barbecue", keys: ["barbecue", "barbeque", "bbq"] },
  { file: "datenight", keys: ["datenight", "date night"] },
  { file: "dokter_vincent_jacobs", keys: ["dokter vincent jacobs", "vincent jacobs", "dokter jacobs", "dr jacobs", "dr vincent jacobs"] },
  { file: "kbc_leuven", keys: ["kbc leuven", "kbc"] },
  { file: "sjotter", keys: ["sjotter", "sjotten", "kicker", "tafelvoetbal"] },
  { file: "tandarts", keys: ["tandarts", "tandartsbezoek", "dentist"] },
  { file: "tanja_holvoet", keys: ["tanja holvoet"] },
];

function normalize(s: string): string {
  return ` ${s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const PREPARED = AGENDA_PHOTOS.map((p) => ({ file: p.file, keys: p.keys.map(normalize) }));

/** Pad naar de foto (zonder formaat-achtervoegsel) of null; eerst de titel, dan de plaats. */
export function agendaPhotoFor(title: string | null | undefined, location?: string | null): string | null {
  for (const text of [title, location]) {
    if (!text) continue;
    const t = normalize(text);
    // Hele woorden: «kbc» in «KBC Leuven» wel, «date» in «update» niet.
    const hit = PREPARED.find((p) => p.keys.some((k) => t.includes(k)));
    if (hit) return `/images/afspraken/${hit.file}`;
  }
  return null;
}
