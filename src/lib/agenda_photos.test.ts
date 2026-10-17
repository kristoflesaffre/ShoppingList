import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { agendaPhotoFor } from "./agenda_photos";

describe("appointment photos", () => {
  it.each([
    ["Niels & Inès komen eten", "niels_en_ines"],
    ["Bart en Annemie", "bart_en_annemie"],
    ["Kristof & Chloé", "kristof_en_chloe"],
    ["Chloé en Kristof", "kristof_en_chloe"],
    ["Afspraak Inès", "ines"],
    ["Chloé", "chloe"],
    ["Kristof", "kristof"],
    ["Émile komt spelen", "emile"],
    ["Norbert komt langs", "norbert"],
    ["Ribbetjes eten bij bompa", "ribbetjes"],
    ["Kerstvakantie", "kerstvakantie"],
    ["Herfstvakantie", "herfstvakantie"],
    ["Zomervakantie", "zomervakantie"],
    ["Paasvakantie", "paasvakantie"],
    ["Thanksgiving bij Jeroen", "thanksgiving"],
    ["Herfstfeest school", "herfstfeest"],
    ["Kerstmis bij oma en opa", "kerstmis"],
    ["Kerstavond", "kerstmis"],
    ["Pasen bij Karen", "pasen"],
    ["Paasmaandag", "pasen"],
    ["Nieuwjaar bij Marie", "nieuwjaar"],
    ["Oudejaarsavond", "nieuwjaar"],
    ["Weekend Landal", "landal"],
    ["Papa nr Magda", "wies"],
    ["Paps ophalen Lier", "wies"],
    ["Ribbetjes eten paps", "ribbetjes"],
    ["Wies jarig", "wies"],
    ["BBQ bij Jeroen", "barbecue"],
    ["Winterbanden BMW", "winterbanden_zomerbanden"],
    ["Auto binnen doen bij Juma", "bmw"],
    ["Reservation at Amazone By Jarno", "amazone_by_jarno"],
    ["Tandarts Noë & Chloé", "tandarts"],
    ["Oudercontact Noë", "oudercontact"],
    ["Oogarts Kristof Imelda", "oogarts"],
    ["Operatie Kristof Imelda", "ziekenhuis_imelda"],
    ["Verjaardagsfeestje Marie", "verjaardag"],
    ["Noë slapen bij oma en opa", "oma_opa"],
    ["Afspraak An Koeck", "dokter_an_koeck"],
    ["Sam & Max", "sam_and_max"],
    ["Bompa komt langs", "bompa"],
    ["ES-Clinic", "es_clinic"],
    ["12U Gel nagels", "gelnagels"],
    ["Huub Bday", "verjaardag"],
  ])("matches %s", (title, file) => {
    expect(agendaPhotoFor(title)).toBe(`/images/afspraken/${file}`);
  });

  it("uses location only when the title has no match", () => {
    expect(agendaPhotoFor("Afspraak", "Wok Dynasty")).toBe("/images/afspraken/wok_dynasty");
    expect(agendaPhotoFor("Weekend weg", "Landal park")).toBe("/images/afspraken/landal");
    expect(agendaPhotoFor("Tandarts", "Imelda")).toBe("/images/afspraken/tandarts");
  });

  it("does not match substrings or empty events", () => {
    for (const title of [null, undefined, "", "Update", "Samenvatting", "Karenina"]) {
      expect(agendaPhotoFor(title)).toBeNull();
    }
  });

  it("provides thumbnails and a full-resolution asset for every photo", () => {
    const dir = "public/images/afspraken";
    for (const file of readdirSync(dir).filter((name) => name.endsWith("_240.webp"))) {
      const slug = file.replace("_240.webp", "");
      expect(existsSync(`${dir}/${slug}_480.webp`)).toBe(true);
      expect(existsSync(`${dir}/${slug}_full.webp`)).toBe(true);
      expect(agendaPhotoFor(slug.replaceAll("_", " "))).not.toBeNull();
    }
  });
});
