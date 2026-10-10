import { describe, expect, it } from "vitest";
import { matchStepIngredients, stepMentionsIngredient } from "./recipe-step-ingredients";

const ING = [
  "Kippenboutenfilet", "Kippenbouillon", "Kokosmelk", "Look", "Griekse yoghurt", "Tomatenblokjes", "Koriander",
  "Chili", "Gember", "Limoen", "Garam masala", "Tandooripasta", "Rode currypasta", "Kurkuma",
].map((name) => ({ id: name, name }));

const STEPS = [
  "Snijd de kipfilets in brede repen en doe ze in een ruime mengkom.",
  "Schep de yoghurt over de kip en voeg de garam masala toe.",
  "Meng er de tandooripasta, rode currypasta en kurkuma door.",
  "Rasp wat limoenzeste over de marinade en voeg het sap van een halve limoen toe.",
  "Meng alles grondig en laat de kip rustig marineren.",
  "Zet de beker van de blender klaar.",
  "Pel de knoflook, snijd de chilipeper grof en schil en snijd de gember. Doe alles in de blender.",
  "Spoel de koriander. Houd de blaadjes apart.",
];

describe("matchStepIngredients", () => {
  it("koppelt de ingrediënten van chicken tikka masala aan de juiste stappen", () => {
    expect(matchStepIngredients(STEPS, ING)).toEqual([
      ["Kippenboutenfilet"],
      ["Griekse yoghurt", "Garam masala"],
      ["Tandooripasta", "Rode currypasta", "Kurkuma"],
      ["Limoen"],
      [],
      [],
      ["Look", "Chili", "Gember"],
      ["Koriander"],
    ]);
  });

  it("verwart kippenbouillon niet met kipfilets", () => {
    expect(stepMentionsIngredient("Snijd de kipfilets in repen.", "Kippenbouillon")).toBe(false);
  });

  it("herkent varianten uit echte recepten", () => {
    expect(stepMentionsIngredient("Doe de tomatenstukjes erbij.", "Tomatenblokjes")).toBe(true);
    expect(stepMentionsIngredient("Stoof de rode ui in dezelfde pan.", "Rode ajuin")).toBe(true);
    expect(stepMentionsIngredient("Pel de rode uien en snipper ze fijn.", "Rode ajuin")).toBe(true);
    expect(stepMentionsIngredient("Tandooripasta erdoor mengen.", "Tandoori pasta")).toBe(true);
  });

  it("koppelt korte woorden uit lange namen niet", () => {
    expect(stepMentionsIngredient("Voeg de steeltjes toe aan de blender en mix fijn.", "Naan brood mix")).toBe(false);
  });

  it("negeert bijvoeglijke woorden", () => {
    expect(stepMentionsIngredient("Leg de rode paprika op het bord.", "Rode currypasta")).toBe(false);
  });
});
