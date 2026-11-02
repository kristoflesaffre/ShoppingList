import { describe, expect, it } from "vitest";
import { displayQuantity } from "./recipe_ingredient_quantity";

describe("displayQuantity", () => {
  it("zet telbare eenheden in het meervoud vanaf 2", () => {
    expect(displayQuantity("2 pak")).toBe("2 pakken");
    expect(displayQuantity("3 stuk")).toBe("3 stuks");
    expect(displayQuantity("2 fles")).toBe("2 flessen");
    expect(displayQuantity("4 zak")).toBe("4 zakken");
    expect(displayQuantity("2 pot")).toBe("2 potten");
    expect(displayQuantity("3 snuifje")).toBe("3 snuifjes");
  });
  it("houdt het enkelvoud bij 1 of minder, ook als de data een meervoud bevat", () => {
    expect(displayQuantity("1 pak")).toBe("1 pak");
    expect(displayQuantity("1 pakken")).toBe("1 pak");
    expect(displayQuantity("1 stuks")).toBe("1 stuk");
    expect(displayQuantity("0,5 pak")).toBe("0,5 pak");
  });
  it("laat een bestaand meervoud staan", () => {
    expect(displayQuantity("2 pakken")).toBe("2 pakken");
  });
  it("laat eenheden zonder meervoud en vrije tekst ongemoeid", () => {
    expect(displayQuantity("500 gram")).toBe("500 gram");
    expect(displayQuantity("2 kg")).toBe("2 kg");
    expect(displayQuantity("2 el")).toBe("2 el");
    expect(displayQuantity("wat zout")).toBe("wat zout");
    expect(displayQuantity("2 grote pak")).toBe("2 grote pak");
    expect(displayQuantity("")).toBe("");
  });
});
