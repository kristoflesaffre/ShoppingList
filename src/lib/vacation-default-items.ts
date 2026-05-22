import type { VacationCategory } from "./vacation-categories";
import type { TripPersonTab } from "./trip-person";
import { normalizeForMatch } from "./item-photo-matching";

export type SeasonValue = "zomer" | "winter";
export type HouseholdValue = "man" | "vrouw" | "jongens" | "meisjes";
export type TransportValue = "auto" | "vliegtuig";
export type AccommodationValue = "hotel" | "appartement";

const PRIVATE_EMAILS: ReadonlyArray<string> = [
  "lesaffrekristof@gmail.com",
  "claes_cc@live.be",
];

type RawItem = {
  slug: string;
  name: string;
  section: string;
  category: VacationCategory;
  seasons?: ReadonlyArray<SeasonValue>;
  transports?: ReadonlyArray<TransportValue>;
  accommodations?: ReadonlyArray<AccommodationValue>;
  /** Toon item alleen als minstens één van deze gezinsleden geselecteerd is. */
  households?: ReadonlyArray<HouseholdValue>;
  /** Toon item alleen voor deze e-mailadressen. */
  emails?: ReadonlyArray<string>;
};

export type VacationDefaultItem = {
  name: string;
  imageSrc: string;
  /** Overeenkomend met TripPersonTab: "Samen" | "Kristof" | "Chloé" | "Noë" */
  tripPerson: string;
  itemCategory: VacationCategory;
};

// Sections: "Samen" | "Kristof" | "Chloé" | "Noë"
// (moeten overeenkomen met de tab labels in computeVacationTabs)
const ITEMS: RawItem[] = [
  { slug: "aftersun", name: "Aftersun", section: "Samen", category: "Toiletartikelen", seasons: ["zomer"] },
  { slug: "afwasborstel", name: "Afwasborstel", section: "Samen", category: "Huishouden", transports: ["auto"], accommodations: ["appartement"] },
  { slug: "afwasmiddel", name: "Afwasmiddel", section: "Samen", category: "Huishouden", transports: ["auto"], accommodations: ["appartement"] },
  { slug: "airpods", name: "AirPods", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "airpods", name: "AirPods", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "badpak_kind", name: "Badpak", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "badpak_vrouw", name: "Badpak", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "bagageweegschaal", name: "Bagageweegschaal", section: "Samen", category: "Andere", transports: ["vliegtuig"] },
  { slug: "barbie", name: "Barbie", section: "Noë", category: "Speelgoed", households: ["jongens", "meisjes"] },
  { slug: "beha", name: "Beha", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "bikini", name: "Bikini", section: "Chloé", category: "Kleding", households: ["vrouw"], seasons: ["zomer"] },
  { slug: "bluetooth_speaker", name: "Bluetooth speaker", section: "Samen", category: "Elektronica" },
  { slug: "bolderkar", name: "Bolderkar", section: "Samen", category: "Andere", transports: ["auto"] },
  { slug: "borsteltjes_tanden", name: "Borsteltjes tanden", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "boxershort", name: "Boxershort", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "bril", name: "Bril", section: "Kristof", category: "Accessoires", households: ["man"] },
  { slug: "bril", name: "Bril", section: "Chloé", category: "Accessoires", households: ["vrouw"] },
  { slug: "broek_kind", name: "Broek", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "broek_man", name: "Broek", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "broek_vrouw", name: "Broek", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "bruiswater", name: "Bruiswater", section: "Samen", category: "Eten & drinken", transports: ["auto"] },
  { slug: "conditioner", name: "Conditioner", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "deodorant_man", name: "Deodorant", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "deodorant_vrouw", name: "Deodorant", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "douchegel", name: "Douchegel", section: "Kristof", category: "Toiletartikelen", households: ["man"], accommodations: ["appartement"] },
  { slug: "e-reader", name: "E-reader", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "e-reader", name: "E-reader", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "ehbo_kit", name: "Ehbo-kit", section: "Samen", category: "Toiletartikelen" },
  { slug: "glijmiddel", name: "Glijmiddel", section: "Samen", category: "Toiletartikelen", emails: PRIVATE_EMAILS },
  { slug: "haarborstel", name: "Haarborstel", section: "Samen", category: "Toiletartikelen" },
  { slug: "haardroger", name: "Haardroger", section: "Samen", category: "Toiletartikelen", accommodations: ["appartement"] },
  { slug: "haarelastiekjes", name: "Haarelastiekjes", section: "Chloé", category: "Accessoires", households: ["vrouw"] },
  { slug: "haarelastiekjes", name: "Haarelastiekjes", section: "Noë", category: "Accessoires", households: ["jongens", "meisjes"] },
  { slug: "haarspelden", name: "Haarspelden", section: "Chloé", category: "Accessoires", households: ["vrouw"] },
  { slug: "haarspelden", name: "Haarspelden", section: "Noë", category: "Accessoires", households: ["jongens", "meisjes"] },
  { slug: "handdoeken", name: "Handdoeken", section: "Samen", category: "Toiletartikelen", accommodations: ["appartement"] },
  { slug: "handschoenen_kind", name: "Handschoenen", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"], seasons: ["winter"] },
  { slug: "handschoenen_man", name: "Handschoenen", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["winter"] },
  { slug: "handschoenen_vrouw", name: "Handschoenen", section: "Chloé", category: "Kleding", households: ["vrouw"], seasons: ["winter"] },
  { slug: "headphones_kind", name: "Headphones", section: "Noë", category: "Elektronica", households: ["jongens", "meisjes"] },
  { slug: "headphones", name: "Headphones", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "headphones", name: "Headphones", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "hoofdkussen", name: "Hoofdkussen", section: "Samen", category: "Slaapspullen" },
  { slug: "identiteitskaart_kind", name: "Identiteitskaart", section: "Noë", category: "Documenten", households: ["jongens", "meisjes"] },
  { slug: "identiteitskaart_vrouw", name: "Identiteitskaart", section: "Chloé", category: "Documenten", households: ["vrouw"] },
  { slug: "identiteitskaart_man", name: "Identiteitskaart", section: "Kristof", category: "Documenten", households: ["man"] },
  { slug: "immodium", name: "Immodium", section: "Samen", category: "Medicijnen" },
  { slug: "interprox_gel", name: "Interprox gel", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "jas_kind", name: "Jas", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "jas_man", name: "Jas", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "jas_vrouw", name: "Jas", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "jurk_vrouw", name: "Jurk", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "juwelen", name: "Juwelen", section: "Chloé", category: "Accessoires", households: ["vrouw"] },
  { slug: "keukenhanddoek", name: "Keukenhanddoek", section: "Samen", category: "Huishouden", accommodations: ["appartement"] },
  { slug: "korte_broek", name: "Korte broek", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["zomer"] },
  { slug: "kurkentrekker_en_flesopener", name: "Kurkentrekker", section: "Samen", category: "Huishouden" },
  { slug: "kussenspray", name: "Kussenspray", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "kussentjes", name: "Kussentjes", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "lactulose", name: "Lactulose", section: "Noë", category: "Medicijnen", households: ["jongens", "meisjes"] },
  { slug: "lenzen", name: "Lenzen", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "lenzen", name: "Lenzen", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "lenzenpotje", name: "Lenzenpotje", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "lenzenpotje", name: "Lenzenpotje", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "lippenbalsem", name: "Lippenbalsem", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "maca", name: "Maca", section: "Kristof", category: "Medicijnen", households: ["man"], emails: PRIVATE_EMAILS },
  { slug: "macbook", name: "MacBook", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "macbook", name: "MacBook", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "makeup", name: "Makeup", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "medicatie_reisziekte", name: "Medicatie reisziekte", section: "Samen", category: "Medicijnen" },
  { slug: "medicatie", name: "Medicatie", section: "Kristof", category: "Medicijnen", households: ["man"] },
  { slug: "medicatie", name: "Medicatie", section: "Chloé", category: "Medicijnen", households: ["vrouw"] },
  { slug: "motilium", name: "Motilium", section: "Samen", category: "Medicijnen" },
  { slug: "muts_kind", name: "Muts", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"], seasons: ["winter"] },
  { slug: "muts_man", name: "Muts", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["winter"] },
  { slug: "muts_vrouw", name: "Muts", section: "Chloé", category: "Kleding", households: ["vrouw"], seasons: ["winter"] },
  { slug: "nachtlampje", name: "Nachtlampje", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "nagelknipper", name: "Nagelknipper", section: "Samen", category: "Toiletartikelen" },
  { slug: "nutella", name: "Nutella", section: "Samen", category: "Eten & drinken" },
  { slug: "onderbroek_kind", name: "Onderbroek", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "onderhemd_kind", name: "Onderhemd", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "oordopjes", name: "Oordopjes", section: "Chloé", category: "Accessoires", households: ["vrouw"] },
  { slug: "oplader_smartphone", name: "Oplader smartphone", section: "Samen", category: "Elektronica" },
  { slug: "papieren_zakdoekjes", name: "Papieren zakdoekjes", section: "Samen", category: "Toiletartikelen" },
  { slug: "paracetamol_kind", name: "Paracetamol", section: "Noë", category: "Medicijnen", households: ["jongens", "meisjes"] },
  { slug: "paracetamol", name: "Paracetamol", section: "Samen", category: "Medicijnen" },
  { slug: "paraplu", name: "Paraplu", section: "Samen", category: "Andere" },
  { slug: "parasol", name: "Parasol", section: "Samen", category: "Strand", seasons: ["zomer"], transports: ["auto"] },
  { slug: "parfum", name: "Parfum", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "parfum", name: "Parfum", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "pet_kind", name: "Pet", section: "Noë", category: "Accessoires", households: ["jongens", "meisjes"], seasons: ["zomer"] },
  { slug: "pet_man", name: "Pet", section: "Kristof", category: "Accessoires", households: ["man"], seasons: ["zomer"] },
  { slug: "pet_vrouw", name: "Pet", section: "Chloé", category: "Accessoires", households: ["vrouw"], seasons: ["zomer"] },
  { slug: "picknickdeken", name: "Picknickdeken", section: "Samen", category: "Strand", seasons: ["zomer"] },
  { slug: "pincet", name: "Pincet", section: "Samen", category: "Toiletartikelen" },
  { slug: "plastic_wijnglazen", name: "Plastic wijnglazen", section: "Samen", category: "Eten & drinken" },
  { slug: "pleisters", name: "Pleisters", section: "Samen", category: "Toiletartikelen" },
  { slug: "pluchen_knuffel", name: "Pluchen knuffel", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "powerbank", name: "Powerbank", section: "Samen", category: "Elektronica" },
  { slug: "projector", name: "Projector", section: "Samen", category: "Elektronica" },
  { slug: "pyjama_man", name: "Pyjama", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "pyjama_vrouw", name: "Pyjama", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "pyjama", name: "Pyjama", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "reisstekker", name: "Reisstekker", section: "Samen", category: "Elektronica" },
  { slug: "rok_vrouw", name: "Rok", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "rugzak", name: "Rugzak", section: "Samen", category: "Andere" },
  { slug: "sandalen_kind", name: "Sandalen", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"], seasons: ["zomer"] },
  { slug: "sandalen_man", name: "Sandalen", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["zomer"] },
  { slug: "sandalen_vrouw", name: "Sandalen", section: "Chloé", category: "Kleding", households: ["vrouw"], seasons: ["zomer"] },
  { slug: "scheermesje", name: "Scheermesje", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "scheermesje", name: "Scheermesje", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "scheerschuim", name: "Scheerschuim", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "schuurspons", name: "Schuurspons", section: "Samen", category: "Huishouden", accommodations: ["appartement"] },
  { slug: "sexy_kousen", name: "Sexy kousen", section: "Chloé", category: "Kleding", households: ["vrouw"], emails: PRIVATE_EMAILS },
  { slug: "sexy_outfit", name: "Sexy outfit", section: "Chloé", category: "Kleding", households: ["vrouw"], emails: PRIVATE_EMAILS },
  { slug: "shampoo", name: "Shampoo", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "sjaal_kind", name: "Sjaal", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"], seasons: ["winter"] },
  { slug: "sjaal_man", name: "Sjaal", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["winter"] },
  { slug: "sjaal_vrouw", name: "Sjaal", section: "Chloé", category: "Kleding", households: ["vrouw"], seasons: ["winter"] },
  { slug: "slaapmasker", name: "Slaapmasker", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "slaapmiddel", name: "Slaapmiddel", section: "Samen", category: "Medicijnen" },
  { slug: "slipje", name: "Slipje", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "smartphone", name: "Smartphone", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "smartphone", name: "Smartphone", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "sokken_kind", name: "Sokken", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "strandlaken", name: "Strandlaken", section: "Samen", category: "Strand", seasons: ["zomer"] },
  { slug: "strandtas", name: "Strandtas", section: "Samen", category: "Strand", seasons: ["zomer"] },
  { slug: "t-shirt_kind", name: "T-shirt", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "t-shirt", name: "T-shirt", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "tablet_kind", name: "Tablet", section: "Noë", category: "Elektronica", households: ["jongens", "meisjes"] },
  { slug: "tablet", name: "Tablet", section: "Kristof", category: "Elektronica", households: ["man"] },
  { slug: "tablet", name: "Tablet", section: "Chloé", category: "Elektronica", households: ["vrouw"] },
  { slug: "tandenborstel_kind", name: "Tandenborstel", section: "Noë", category: "Toiletartikelen", households: ["jongens", "meisjes"] },
  { slug: "tandenborstel", name: "Tandenborstel", section: "Kristof", category: "Toiletartikelen", households: ["man"] },
  { slug: "tandenborstel", name: "Tandenborstel", section: "Chloé", category: "Toiletartikelen", households: ["vrouw"] },
  { slug: "thee", name: "Thee", section: "Samen", category: "Eten & drinken" },
  { slug: "wodka", name: "Wodka", section: "Samen", category: "Eten & drinken", emails: PRIVATE_EMAILS },
  { slug: "red_bull", name: "Red bull", section: "Samen", category: "Eten & drinken", emails: PRIVATE_EMAILS },
  { slug: "rode_wijn", name: "Rode wijn", section: "Samen", category: "Eten & drinken", emails: PRIVATE_EMAILS },
  { slug: "thermometer", name: "Thermometer", section: "Samen", category: "Toiletartikelen" },
  { slug: "topje_vrouw", name: "Topje", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "trui_kind", name: "Trui", section: "Noë", category: "Kleding", households: ["jongens", "meisjes"] },
  { slug: "trui_vrouw", name: "Trui", section: "Chloé", category: "Kleding", households: ["vrouw"] },
  { slug: "trui", name: "Trui", section: "Kristof", category: "Kleding", households: ["man"] },
  { slug: "tutje", name: "Tutjes", section: "Noë", category: "Slaapspullen", households: ["jongens", "meisjes"] },
  { slug: "vaatdoek", name: "Vaatdoek", section: "Samen", category: "Huishouden", accommodations: ["appartement"] },
  { slug: "vaatwastabletten", name: "Vaatwastabletten", section: "Samen", category: "Huishouden", accommodations: ["appartement"] },
  { slug: "verdeelstekker", name: "Verdeelstekker", section: "Samen", category: "Elektronica" },
  { slug: "verlengsnoer", name: "Verlengsnoer", section: "Samen", category: "Elektronica" },
  { slug: "vitamine_d_druppels", name: "Vitamine D druppels", section: "Noë", category: "Medicijnen", households: ["jongens", "meisjes"] },
  { slug: "vochtige_doekjes", name: "Vochtige doekjes", section: "Noë", category: "Toiletartikelen", households: ["jongens", "meisjes"] },
  { slug: "vuilniszakken", name: "Vuilniszakken", section: "Samen", category: "Huishouden", accommodations: ["appartement"] },
  { slug: "walkie_talkies", name: "Walkie talkies", section: "Samen", category: "Elektronica" },
  { slug: "waterfles", name: "Waterfles", section: "Noë", category: "Andere", households: ["jongens", "meisjes"] },
  { slug: "wattenschijfjes", name: "Wattenschijfjes", section: "Samen", category: "Toiletartikelen" },
  { slug: "wattenstaafjes", name: "Wattenstaafjes", section: "Samen", category: "Toiletartikelen" },
  { slug: "zonnebril_kind", name: "Zonnebril", section: "Noë", category: "Accessoires", households: ["jongens", "meisjes"], seasons: ["zomer"] },
  { slug: "zonnebril_man", name: "Zonnebril", section: "Kristof", category: "Accessoires", households: ["man"], seasons: ["zomer"] },
  { slug: "zonnebril_vrouw", name: "Zonnebril", section: "Chloé", category: "Accessoires", households: ["vrouw"], seasons: ["zomer"] },
  { slug: "zonnecreme_gezicht", name: "Zonnecreme gezicht", section: "Samen", category: "Toiletartikelen", seasons: ["zomer"] },
  { slug: "zonnecreme", name: "Zonnecreme", section: "Samen", category: "Toiletartikelen", seasons: ["zomer"] },
  { slug: "zonnehoed", name: "Zonnehoed", section: "Chloé", category: "Accessoires", households: ["vrouw"], seasons: ["zomer"] },
  { slug: "zwangerschapskussen", name: "Zwangerschapskussen", section: "Kristof", category: "Slaapspullen", households: ["man"], emails: PRIVATE_EMAILS },
  { slug: "zwembad_oplaasbaar_speelgoed", name: "Opblaasbaar zwembadspeelgoed", section: "Noë", category: "Strand", households: ["jongens", "meisjes"], seasons: ["zomer"] },
  { slug: "zwembril", name: "Zwembril", section: "Noë", category: "Strand", households: ["jongens", "meisjes"], seasons: ["zomer"] },
  { slug: "zwemshort", name: "Zwemshort", section: "Kristof", category: "Kleding", households: ["man"], seasons: ["zomer"] },
];

/** Slug → e-mailadressen die het item mogen zien (enkel voor items met `emails` restrictie). */
const RESTRICTED_BY_SLUG: ReadonlyMap<string, ReadonlyArray<string>> = new Map(
  ITEMS.filter((item) => item.emails).map((item) => [
    normalizeForMatch(item.slug),
    item.emails!,
  ]),
);

/**
 * Returns true als het vakantie-item (slug) zichtbaar mag zijn voor de gegeven gebruiker.
 * Items zonder e-mailrestrictie zijn altijd zichtbaar.
 */
export function isVacationSlugAllowedForEmail(slug: string, userEmail?: string): boolean {
  const allowed = RESTRICTED_BY_SLUG.get(normalizeForMatch(slug));
  if (!allowed) return true;
  return allowed.includes(userEmail ?? "");
}

/**
 * Vacation-zoek-slide-in: welke slugs standaard getoond worden (lege zoekbalk).
 * - "Samen" → null (= alle vakantie-slugs; caller filtert op e-mail)
 * - Persoons-tab → Samen-items + persoons-specifieke items, gefilterd op e-mail.
 */
export function getVacationDefaultSlugsForPerson(
  tripPerson: TripPersonTab,
  userEmail?: string,
): string[] | null {
  if (tripPerson === "Samen") return null;
  const allowedSections = new Set<string>(["Samen", tripPerson]);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of ITEMS) {
    if (!allowedSections.has(item.section)) continue;
    if (item.emails && !item.emails.includes(userEmail ?? "")) continue;
    const normalized = normalizeForMatch(item.slug);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result.sort();
}

/**
 * Geeft de gefilterde lijst van standaarditems op basis van seizoen en gezinssamenstelling.
 * Voor-vertrek items vallen buiten deze functie (zie AUTO/FLIGHT_PRE_DEPARTURE_ITEMS in de page).
 */
export function buildVacationDefaultItems(options: {
  season: SeasonValue;
  transport: TransportValue;
  accommodation: AccommodationValue;
  household: Pick<Set<string>, "has">;
  userEmail?: string;
}): VacationDefaultItem[] {
  return ITEMS.filter((item) => {
    if (item.seasons && !item.seasons.includes(options.season)) return false;
    if (item.transports && !item.transports.includes(options.transport)) return false;
    if (
      item.accommodations &&
      !item.accommodations.includes(options.accommodation)
    )
      return false;
    if (item.households && !item.households.some((h) => options.household.has(h)))
      return false;
    if (item.emails && !item.emails.includes(options.userEmail ?? ""))
      return false;
    return true;
  }).map((item) => ({
    name: item.name,
    imageSrc: `/images/vakantie/${item.slug}_160.webp`,
    tripPerson: item.section,
    itemCategory: item.category,
  }));
}

function normalizeDefaultItemKey(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function registerDefaultItemTripPerson(
  map: Record<string, TripPersonTab>,
  key: string,
  person: TripPersonTab,
) {
  const normalized = normalizeDefaultItemKey(key);
  if (!normalized) return;
  map[normalized] = person;
  const underscored = normalized.replace(/\s/g, "_");
  if (underscored && underscored !== normalized) map[underscored] = person;
}

let defaultItemTripPersonLookup: Record<string, TripPersonTab> | null = null;

/** Standaard persoonstab per item (bron: `vacation-default-items`, niet Excel-doelgroep). */
export function vacationDefaultItemTripPersonLookup(): Record<
  string,
  TripPersonTab
> {
  if (defaultItemTripPersonLookup) return defaultItemTripPersonLookup;
  const map: Record<string, TripPersonTab> = {};
  for (const item of ITEMS) {
    const person = item.section as TripPersonTab;
    registerDefaultItemTripPerson(map, item.slug, person);
    registerDefaultItemTripPerson(map, item.name, person);
  }
  registerDefaultItemTripPerson(map, "make-up", "Chloé");
  defaultItemTripPersonLookup = map;
  return map;
}

export function resolveVacationTripPersonFromDefaultItems(
  name: string,
): TripPersonTab | null {
  const key = normalizeDefaultItemKey(name);
  const lookup = vacationDefaultItemTripPersonLookup();
  return (
    lookup[key] ??
    lookup[key.replace(/\s/g, "_")] ??
    null
  );
}

function registerDefaultItemCategory(
  map: Record<string, VacationCategory>,
  key: string,
  category: VacationCategory,
) {
  const normalized = normalizeDefaultItemKey(key);
  if (!normalized) return;
  map[normalized] = category;
  const underscored = normalized.replace(/\s/g, "_");
  if (underscored && underscored !== normalized) map[underscored] = category;
}

let defaultItemCategoryLookup: Record<string, VacationCategory> | null = null;

/** Categorie per standaard-vakantie-item (slug + weergavenaam). */
export function vacationDefaultItemCategoryLookup(): Record<
  string,
  VacationCategory
> {
  if (defaultItemCategoryLookup) return defaultItemCategoryLookup;
  const map: Record<string, VacationCategory> = {};
  for (const item of ITEMS) {
    registerDefaultItemCategory(map, item.slug, item.category);
    registerDefaultItemCategory(map, item.name, item.category);
  }
  registerDefaultItemCategory(map, "imodium", "Medicijnen");
  registerDefaultItemCategory(map, "make-up", "Toiletartikelen");
  defaultItemCategoryLookup = map;
  return map;
}

export function resolveVacationCategoryFromDefaultItems(
  name: string,
): VacationCategory | null {
  const key = normalizeDefaultItemKey(name);
  const lookup = vacationDefaultItemCategoryLookup();
  return (
    lookup[key] ??
    lookup[key.replace(/\s/g, "_")] ??
    null
  );
}
