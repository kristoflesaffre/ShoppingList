import { describe, expect, it } from "vitest";
import { defaultFloor } from "@/lib/hue-room-floors";

describe("defaultFloor", () => {
  it("volgt verdiepingswoorden in de naam", () => {
    expect(defaultFloor("Badkamer eerste verdieping")).toBe("1");
    expect(defaultFloor("Badkamer tweede verdieping")).toBe("2");
    expect(defaultFloor("Gang beneden")).toBe("g");
    expect(defaultFloor("Gang boven")).toBe("2");
  });

  it("gebruikt de standaardindeling van het huis", () => {
    expect(defaultFloor("Bureau")).toBe("g");
    expect(defaultFloor("Woonkamer")).toBe("g");
    expect(defaultFloor("Keuken")).toBe("g");
    expect(defaultFloor("Eetkamer")).toBe("g");
    expect(defaultFloor("Gastenkamer")).toBe("1");
    expect(defaultFloor("Slaapkamer")).toBe("2");
    expect(defaultFloor("Kinderkamer")).toBe("2");
    expect(defaultFloor("Kamer Noë")).toBe("2");
    expect(defaultFloor("Hobbykamer")).toBe("2");
    expect(defaultFloor("TV kamer")).toBe("1");
    expect(defaultFloor("Tv-kamer")).toBe("1");
    expect(defaultFloor("Tvkamer")).toBe("1");
  });

  it("valt terug op andere kamers", () => {
    expect(defaultFloor("Zolder opslag")).toBe("other");
  });
});
