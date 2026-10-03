import { describe, expect, it } from "vitest";
import { frituurItemIconSrc } from "@/lib/frituur-item-icons";

describe("frituurItemIconSrc", () => {
  it("gebruikt de catalogusfoto voor een frituuritem", () => {
    expect(frituurItemIconSrc("Kleine friet")).toBe(
      "/images/frituur/frieten_klein_160.webp",
    );
  });

  it("resolveert synoniemen naar dezelfde catalogusfoto", () => {
    expect(frituurItemIconSrc("saté")).toBe(
      "/images/frituur/saté_160.webp",
    );
  });
});
