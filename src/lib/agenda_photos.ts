/**
 * Foto's voor herkende afspraken (public/images/afspraken/<naam>_240|480|full.webp). Titel en plaats van een
 * afspraak worden vergeleken met de namen en synoniemen hieronder; hoofdletters, accenten en leestekens
 * tellen niet mee. Nieuwe foto: bestand toevoegen in de drie formaten en hier een regel bijzetten.
 * De full-variant bewaart de originele resolutie; gebruik die alleen voor een vergroting, niet voor tegels.
 */

const AGENDA_PHOTOS: { file: string; keys: string[] }[] = [
  // Specifieke vakanties vóór feestdagen: "kerstvakantie" krijgt een eigen foto.
  { file: "kerstvakantie", keys: ["kerstvakantie", "kerst vakantie"] },
  { file: "herfstvakantie", keys: ["herfstvakantie", "herfst vakantie"] },
  { file: "zomervakantie", keys: ["zomervakantie", "zomer vakantie"] },
  { file: "paasvakantie", keys: ["paasvakantie", "paas vakantie"] },
  { file: "thanksgiving", keys: ["thanksgiving"] },
  { file: "herfstfeest", keys: ["herfstfeest", "herfst feest"] },
  { file: "kerstmis", keys: ["kerstmis", "kerst", "kerstavond", "kerstfeest", "christmas"] },
  { file: "pasen", keys: ["pasen", "paasfeest", "paaszondag", "paasmaandag", "easter"] },
  { file: "nieuwjaar", keys: ["nieuwjaar", "nieuwjaarsdag", "nieuwjaarsfeest", "oudejaarsavond", "oud en nieuw", "new year"] },
  { file: "landal", keys: ["landal"] },
  { file: "amazone_by_jarno", keys: ["amazone by jarno", "bistro amazone", "amazone"] },
  { file: "bento_sushi", keys: ["bento sushi", "bento"] },
  { file: "wok_dynasty", keys: ["wok dynasty"] },
  { file: "ss_rotterdam", keys: ["ss rotterdam"] },
  { file: "winterbanden_zomerbanden", keys: ["winterbanden", "zomerbanden", "bandenwissel", "donckers"] },
  { file: "bmw", keys: ["bmw", "juma", "gilray"] },
  { file: "barbecue", keys: ["barbecue", "barbeque", "bbq"] },
  { file: "ribbetjes", keys: ["ribbetjes", "spareribs", "spare ribs"] },
  { file: "datenight", keys: ["datenight", "date night"] },
  { file: "es_clinic", keys: ["es clinic", "esclinic"] },
  { file: "dokter_an_koeck", keys: ["an koeck", "dokter koeck", "dr koeck"] },
  { file: "dokter_vincent_jacobs", keys: ["dokter vincent jacobs", "vincent jacobs", "dokter jacobs", "dr jacobs", "dr vincent jacobs"] },
  { file: "kbc_leuven", keys: ["kbc leuven", "kbc", "kristof leuven", "kristof naar leuven"] },
  { file: "sjotter", keys: ["sjotter", "sjotten", "kicker", "tafelvoetbal"] },
  { file: "tandarts", keys: ["tandarts", "tandartsbezoek", "dentist"] },
  { file: "tanja_holvoet", keys: ["tanja holvoet"] },
  { file: "elyn_van_hul", keys: ["elyn van hul"] },
  { file: "oogarts", keys: ["oogarts", "oogcontrole", "controle oog", "controle imelda oog"] },
  { file: "gynaecoloog", keys: ["gynaecoloog", "gyneacoloog", "gynaecologie", "werebroeck"] },
  { file: "kinesist", keys: ["kinesist", "kinesitherapie", "kine", "fysiotherapie"] },
  { file: "relatietherapie", keys: ["relatietherapie", "lydia de win"] },
  { file: "ziekenhuis_imelda", keys: ["imelda", "imeldaziekenhuis"] },
  { file: "ziekenhuis_sint_maarten", keys: ["sint maarten", "sintmaarten", "az sint maarten"] },
  { file: "loopband_smeren", keys: ["loopband smeren", "loopband onderhoud"] },
  { file: "notaris", keys: ["notaris", "zorgvolmacht"] },
  { file: "gelnagels", keys: ["gelnagels", "gel nagels", "manicure", "nagelstudio", "nagelatelier"] },
  { file: "pedicure", keys: ["pedicure"] },
  { file: "oudercontact", keys: ["oudercontact", "parent teacher meeting", "parents evening"] },
  { file: "schoolfeest", keys: ["schoolfeest", "school feest", "school party", "school celebration", "school fair"] },
  { file: "schoolreis", keys: ["schoolreis", "schooluitstap", "school trip"] },
  { file: "fruitschildag", keys: ["fruitschildag", "fruit schillen", "fruitdag", "appelschillen", "appelmoes"] },
  { file: "soepdag", keys: ["soepdag", "soep maken"] },
  { file: "trouw", keys: ["trouw", "huwelijk", "bruiloft", "wedding"] },
  { file: "verjaardag", keys: ["verjaardag", "verjaardagsfeest", "verjaardagsfeestje", "birthday", "bday"] },
  // Personen zijn een fallback: "BBQ bij Jeroen" blijft een barbecue, geen portret.
  // Koppels vóór individuele namen, ook als «&» na normalisatie wegvalt.
  { file: "niels_en_ines", keys: ["niels en ines", "niels ines", "ines en niels", "ines niels"] },
  { file: "bart_en_annemie", keys: ["bart en annemie", "bart annemie", "annemie en bart", "annemie bart"] },
  { file: "kristof_en_chloe", keys: ["kristof en chloe", "kristof chloe", "chloe en kristof", "chloe kristof"] },
  { file: "ines", keys: ["ines"] },
  { file: "chloe", keys: ["chloe"] },
  { file: "kristof", keys: ["kristof"] },
  { file: "emile", keys: ["emile"] },
  { file: "norbert", keys: ["norbert"] },
  { file: "oma_opa", keys: ["oma opa", "oma en opa", "oma", "opa"] },
  { file: "bompa", keys: ["bompa"] },
  { file: "sam_and_max", keys: ["sam and max", "sam en max", "sam max"] },
  { file: "anneke", keys: ["anneke"] },
  { file: "jeroen", keys: ["jeroen"] },
  { file: "karen", keys: ["karen"] },
  { file: "marie", keys: ["marie"] },
  { file: "noe", keys: ["noe"] },
  // Wies = papa: ook «Paps ophalen», «Papa nr Magda».
  { file: "wies", keys: ["wies", "papa", "paps"] },
];

function normalize(s: string): string {
  return ` ${s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => ["christophe", "christoph", "christof"].includes(word) ? "kristof" : word)
    .join(" ")} `;
}

const PERSON_START = AGENDA_PHOTOS.findIndex((p) => p.file === "niels_en_ines");
const PREPARED = AGENDA_PHOTOS.map((p, index) => ({
  file: p.file,
  person: index >= PERSON_START,
  keys: p.keys.map(normalize),
}));

/** Eén typefout in langere woorden; korte namen blijven exact om verkeerde portretten te vermijden. */
function oneTypo(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 6 || Math.abs(a.length - b.length) > 1) return false;
  let at = 0;
  while (at < Math.min(a.length, b.length) && a[at] === b[at]) at++;
  if (a.length === b.length) {
    return a.slice(at + 1) === b.slice(at + 1) ||
      (a[at] === b[at + 1] && a[at + 1] === b[at] && a.slice(at + 2) === b.slice(at + 2));
  }
  return a.length > b.length
    ? a.slice(at + 1) === b.slice(at)
    : a.slice(at) === b.slice(at + 1);
}

function fuzzyPhrase(text: string, key: string): boolean {
  const words = text.trim().split(/\s+/);
  const phrase = key.trim().split(/\s+/);
  for (let start = 0; start <= words.length - phrase.length; start++) {
    let typos = 0;
    const matches = phrase.every((word, offset) => {
      const candidate = words[start + offset];
      if (word === candidate) return true;
      typos++;
      return typos <= 1 && oneTypo(word, candidate);
    });
    if (matches) return true;
  }
  return false;
}

/** Automatische lokale herkenning bij elke weergave, ook voor toekomstige uitnodigingen.
 * Eerst titel, dan plaats; afspraken vóór personen. Bij dubbelzinnige typefouten geen gok.
 */
export function agendaPhotoFor(title: string | null | undefined, location?: string | null): string | null {
  for (const text of [title, location]) {
    if (!text) continue;
    const t = normalize(text);
    for (const person of [false, true]) {
      const candidates = PREPARED.filter((p) => p.person === person);
      const exact = candidates.find((p) => p.keys.some((key) => t.includes(key)));
      if (exact) return `/images/afspraken/${exact.file}`;
      const fuzzy = candidates.filter((p) => p.keys.some((key) => fuzzyPhrase(t, key)));
      if (fuzzy.length === 1) return `/images/afspraken/${fuzzy[0].file}`;
    }
  }
  return null;
}
