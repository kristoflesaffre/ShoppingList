import { describe, expect, it } from "vitest";
import { giftPrice as price, imageCandidates, pageText, parseGiftJson } from "./gift-ai";

describe("gift-ai", () => {
  it("maakt prijzen op zoals in de app", () => {
    const giftPrice = (a: unknown, b: unknown) => price(a, b)?.replace(/\s/g, " ") ?? null;
    expect(giftPrice("34,99 EUR", null)).toBe("€ 34,99");
    expect(giftPrice("1.299,00", "EUR")).toBe("€ 1.299,00");
    expect(giftPrice("$1,299.00", null)).toBe("US$ 1.299,00");
    expect(giftPrice(24.5, "EUR")).toBe("€ 24,50");
    expect(giftPrice(null, null)).toBeNull();
    expect(giftPrice("gratis", null)).toBeNull();
  });

  it("leest JSON ook met tekst errond", () => {
    expect(parseGiftJson('Hier is het: {"title":"Trein","price":"9,99"} klaar')).toEqual({ title: "Trein", price: "9,99" });
    expect(parseGiftJson("geen json")).toBeNull();
  });

  it("verzamelt productfoto's en laat logo's en iconen weg", () => {
    const html = `<meta property="og:image" content="/p/main.jpg">
      <script type="application/ld+json">{"@type":"Product","image":["https://cdn.shop.be/p/2.jpg"]}</script>
      <img src="/logo.png"><img src="/icons/cart.svg"><img srcset="/p/s.jpg 300w, /p/l.jpg 900w">`;
    expect(imageCandidates(html, new URL("https://shop.be/x"))).toEqual([
      "https://shop.be/p/main.jpg",
      "https://cdn.shop.be/p/2.jpg",
      "https://shop.be/p/l.jpg",
    ]);
  });

  it("houdt enkel de zichtbare tekst", () => {
    expect(pageText("<script>var a=1</script><nav>Menu</nav><h1>Trein</h1><p>Mooi &amp; groot</p>")).toBe("Trein\nMooi & groot");
  });
});
