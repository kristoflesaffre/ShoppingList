import { describe, expect, it } from "vitest";
import { linkPreviewFetchUrl } from "./link-preview-url";

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
