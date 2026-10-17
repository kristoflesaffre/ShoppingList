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
  { file: "oudercontact", keys: ["oudercontact"] },
  { file: "schoolfeest", keys: ["schoolfeest"] },
  { file: "schoolreis", keys: ["schoolreis", "schooluitstap"] },
  { file: "fruitschildag", keys: ["fruitschildag", "fruit schillen", "fruitdag", "appelschillen", "appelmoes"] },
  { file: "soepdag", keys: ["soepdag", "soep maken"] },
  { file: "trouw", keys: ["trouw", "huwelijk", "bruiloft"] },
  { file: "verjaardag", keys: ["verjaardag", "verjaardagsfeest", "verjaardagsfeestje", "birthday", "bday"] },
  // Personen zijn een fallback: "BBQ bij Jeroen" blijft een barbecue, geen portret.
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
