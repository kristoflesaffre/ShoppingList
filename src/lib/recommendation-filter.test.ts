import { describe, expect, it } from "vitest";
import { isAnime, lacksEnglishTitle } from "./recommendation-filter";

describe("isAnime", () => {
  it("herkent Oost-Aziatische animatie", () => {
    expect(isAnime({ genreIds: [16, 10759], language: "ja" })).toBe(true);
    expect(isAnime({ genreIds: [16], language: "zh" })).toBe(true);
  });
  it("herkent westerse series in anime-stijl aan het trefwoord", () => {
    expect(isAnime({ genreIds: [16, 10759], language: "en", keywords: ["anime inspired"] })).toBe(true);
  });
  it("laat gewone westerse animatie door", () => {
    expect(isAnime({ genreIds: [16, 35], language: "en", keywords: ["adult animation"] })).toBe(false);
  });
  it("laat live-action door, ook naar een manga", () => {
    expect(isAnime({ genreIds: [18], language: "ko" })).toBe(false);
    expect(isAnime({ genreIds: [10759], language: "en", keywords: ["based on manga"] })).toBe(false);
  });
});

describe("lacksEnglishTitle", () => {
  const check = (language: string, originalTitle: string, englishTitle: string | null) => lacksEnglishTitle({ language, originalTitle, englishTitle });
  it("laat Engels en Nederlands altijd door", () => {
    expect(check("en", "Dark Matter", "Dark Matter")).toBe(false);
    expect(check("nl", "Undercover", null)).toBe(false);
  });
  it("laat buitenlandse titels met een Engelse titel door", () => {
    expect(check("ko", "오징어 게임", "Squid Game")).toBe(false);
    expect(check("es", "La casa de papel", "Money Heist")).toBe(false);
  });
  it("laat een oorspronkelijke titel door die al Engels is", () => {
    expect(check("it", "The Young Pope", "The Young Pope")).toBe(false);
  });
  it("houdt buitenlandse titels zonder Engelse titel tegen", () => {
    expect(check("hi", "आस्पिरेंट्स", "आस्पिरेंट्स")).toBe(true);
    expect(check("da", "Borgen", "BORGEN")).toBe(true);
    expect(check("fr", "Baron Noir", null)).toBe(true);
  });
});
