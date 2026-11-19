import { describe, expect, it } from "vitest";
import { cuisinePrompt, parseCuisineAnswer } from "./recipe-cuisine";

const recipes = [
  { id: "a", name: "Thaise kipsaténoedels", ingredients: ["kip", "pindakaas", "noedels"] },
  { id: "b", name: "Vlaams stoofvlees", ingredients: [] },
  { id: "c", name: "Kip biryani", ingredients: ["kip", "rijst"] },
];

describe("cuisinePrompt", () => {
  it("geeft elk recept een kort nummer met naam en ingrediënten, zonder id", () => {
    const { system, user } = cuisinePrompt(recipes);
    expect(user).toBe("0. Thaise kipsaténoedels — kip, pindakaas, noedels\n1. Vlaams stoofvlees\n2. Kip biryani — kip, rijst");
    expect(user).not.toContain('"a"');
    for (const id of ["aziatisch", "indiaas", "klassiek", "andere"]) expect(system).toContain(`- ${id}:`);
  });
});

describe("parseCuisineAnswer", () => {
  it("koppelt de nummers terug aan de recepten", () => {
    const found = parseCuisineAnswer('{"r":[{"n":0,"c":"aziatisch"},{"n":1,"c":"klassiek"},{"n":2,"c":"indiaas"}]}', recipes);
    expect(Object.fromEntries(found)).toEqual({ a: "aziatisch", b: "klassiek", c: "indiaas" });
  });
  it("negeert onbekende keukens, verkeerde nummers en tekst rond de JSON", () => {
    const found = parseCuisineAnswer('Hier: {"r":[{"n":0,"c":"thais"},{"n":7,"c":"italiaans"},{"n":"1","c":"klassiek"},{"n":2,"c":"indiaas"}]} klaar', recipes);
    expect(Object.fromEntries(found)).toEqual({ c: "indiaas" });
  });
  it("geeft niets terug bij een onleesbaar antwoord", () => {
    expect(parseCuisineAnswer("geen json", recipes).size).toBe(0);
    expect(parseCuisineAnswer('{"r":"x"}', recipes).size).toBe(0);
  });
});
