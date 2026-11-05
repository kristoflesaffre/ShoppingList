import { describe, expect, it } from "vitest";
import { amazonFallbackUrl, isBlockedPage, linkPreviewFetchUrl } from "./link-preview-url";

const fetchUrl = (raw: string) => linkPreviewFetchUrl(new URL(raw)).toString();

describe("linkPreviewFetchUrl", () => {
  it("haalt het taalstukje uit een Amazon-link en houdt de rest", () => {
    expect(fetchUrl("https://www.amazon.nl/-/en/Gadgy-Machine/dp/B0DT481724/ref=sr_1_5?keywords=x&th=1")).toBe(
      "https://www.amazon.nl/Gadgy-Machine/dp/B0DT481724/ref=sr_1_5?keywords=x&th=1",
    );
    expect(fetchUrl("https://www.amazon.nl/-/nl/dp/B0DT481724")).toBe("https://www.amazon.nl/dp/B0DT481724");
    expect(fetchUrl("https://www.amazon.com.be/-/fr-be/dp/B0DT481724")).toBe("https://www.amazon.com.be/dp/B0DT481724");
  });

  it("laat een Amazon-link zonder taalstukje ongemoeid", () => {
    expect(fetchUrl("https://www.amazon.nl/dp/B0DT481724?language=en_GB")).toBe("https://www.amazon.nl/dp/B0DT481724?language=en_GB");
  });

  it("laat andere winkels ongemoeid", () => {
    expect(fetchUrl("https://www.bol.com/-/en/product/1")).toBe("https://www.bol.com/-/en/product/1");
    expect(fetchUrl("https://notamazon.nl/-/en/dp/1")).toBe("https://notamazon.nl/-/en/dp/1");
  });
});

describe("isBlockedPage", () => {
  it("herkent een weigerpagina met status 200", () => {
    expect(isBlockedPage("<html><head><title>Server Busy</title></head></html>")).toBe(true);
    expect(isBlockedPage("<title>Robot Check</title>")).toBe(true);
    expect(isBlockedPage('<title>Amazon.nl</title><form action="/errors/validateCaptcha">')).toBe(true);
    expect(isBlockedPage("<title>Just a moment...</title>")).toBe(true);
  });

  it("laat productpagina's door, ook met zo'n woord verderop in de titel", () => {
    expect(isBlockedPage("<title>Vloeibare levensmiddelenkleurstof - 24 kleuren</title>")).toBe(false);
    expect(isBlockedPage("<title>Mijn server busy-mok</title>")).toBe(false);
    expect(isBlockedPage("<p>geen titel</p>")).toBe(false);
  });
});

describe("amazonFallbackUrl", () => {
  const fallback = (raw: string) => amazonFallbackUrl(new URL(raw))?.toString() ?? null;

  it("wijst naar hetzelfde product op amazon.nl", () => {
    expect(fallback("https://www.amazon.com.be/-/nl/Kleurstof/dp/B0DFCN7JD2/ref=asc_df?psc=1")).toBe("https://www.amazon.nl/dp/B0DFCN7JD2");
    expect(fallback("https://www.amazon.de/gp/product/B0DFCN7JD2")).toBe("https://www.amazon.nl/dp/B0DFCN7JD2");
  });

  it("geeft niets voor amazon.nl zelf, andere winkels of pagina's zonder product", () => {
    expect(fallback("https://www.amazon.nl/dp/B0DFCN7JD2")).toBeNull();
    expect(fallback("https://www.bol.com/dp/B0DFCN7JD2")).toBeNull();
    expect(fallback("https://www.amazon.com.be/s?k=kleurstof")).toBeNull();
  });
});
