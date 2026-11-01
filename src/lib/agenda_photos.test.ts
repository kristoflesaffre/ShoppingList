import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { agendaPhotoFor, eatingOutPhotoFor } from "./agenda_photos";

describe("appointment photos", () => {
  it.each([
    ["Dinner with Christophe", "kristof"],
    ["Christophe & Chloé", "kristof_en_chloe"],
    ["School party Chloé", "schoolfeest"],
    ["Schoolfeets Chloé", "schoolfeest"],
    ["School trip Noë", "schoolreis"],
    ["Tandartsbezoeek Christophe", "tandarts"],
    ["Wedding Christophe", "trouw"],
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
    ["Gaan eten met Inès", "reservatie_restaurant"],
    ["Restaurant reservatie 19u", "reservatie_restaurant"],
    ["Uit eten", "reservatie_restaurant"],
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

  it("gives meals out the restaurant photo", () => {
    for (const name of ["restaurant", "Gaan eten", "uit eten bij Amazone", "Resto"]) {
      expect(eatingOutPhotoFor(name)).toBe("/images/afspraken/reservatie_restaurant_480.webp");
    }
    for (const name of [null, "", "Spaghetti", "Aardappelen"]) expect(eatingOutPhotoFor(name)).toBeNull();
  });

  it("uses location only when the title has no match", () => {
    expect(agendaPhotoFor("Afspraak", "Wok Dynasty")).toBe("/images/afspraken/wok_dynasty");
    expect(agendaPhotoFor("Weekend weg", "Landal park")).toBe("/images/afspraken/landal");
    expect(agendaPhotoFor("Tandarts", "Imelda")).toBe("/images/afspraken/tandarts");
  });

  it("does not match substrings or empty events", () => {
    for (const title of [null, undefined, "", "Update", "Samenvatting", "Karenina", "Christopheline", "Project review", "Chloebert"]) {
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
