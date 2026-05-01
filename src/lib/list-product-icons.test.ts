import { describe, expect, it } from "vitest";
import {
  FRIETEN_LIST_PRODUCT_ICON_URL,
  canonicalListProductIcon240,
  homeListCardIconSrc,
  listProductIconUrlFromListName,
  pickListProductIconForNewList,
} from "@/lib/list-product-icons";

describe("list-product-icons", () => {
  it("kiest café-icoon voor Café / Cafe met volgnummer", () => {
    expect(listProductIconUrlFromListName("Café")).toBe(
      "/images/ui/cafe_240.webp",
    );
    expect(listProductIconUrlFromListName("cafe")).toBe(
      "/images/ui/cafe_240.webp",
    );
    expect(listProductIconUrlFromListName("Café 2")).toBe(
      "/images/ui/cafe_240.webp",
    );
  });

  it("kiest frieten-icoon voor exacte frieten/frietjes/frituur namen", () => {
    expect(listProductIconUrlFromListName("frieten")).toBe(
      FRIETEN_LIST_PRODUCT_ICON_URL,
    );
    expect(listProductIconUrlFromListName(" Frietjes ")).toBe(
      FRIETEN_LIST_PRODUCT_ICON_URL,
    );
    expect(listProductIconUrlFromListName("Frituur")).toBe(
      FRIETEN_LIST_PRODUCT_ICON_URL,
    );
    expect(listProductIconUrlFromListName("Frituur 2")).toBe(
      FRIETEN_LIST_PRODUCT_ICON_URL,
    );
    expect(listProductIconUrlFromListName("frieten avond")).toBeNull();
  });

  it("normaliseert producticon-resoluties naar 240", () => {
    expect(
      canonicalListProductIcon240(
        "/images/ui/product_icons/frieten_160.webp",
      ),
    ).toBe(FRIETEN_LIST_PRODUCT_ICON_URL);
    expect(
      canonicalListProductIcon240(
        "/images/ui/product_icons/frieten_320.webp",
      ),
    ).toBe(FRIETEN_LIST_PRODUCT_ICON_URL);
  });

  it("gebruikt naam-gebaseerd icoon bij nieuwe lijsten en kaartweergave", () => {
    expect(pickListProductIconForNewList([], "frietjes")).toBe(
      FRIETEN_LIST_PRODUCT_ICON_URL,
    );
    expect(
      homeListCardIconSrc({
        id: "list-1",
        icon: "/images/ui/product_icons/aardappel_240.webp",
        name: "frieten",
        displayVariant: "default",
      }),
    ).toBe(FRIETEN_LIST_PRODUCT_ICON_URL);
  });
});
