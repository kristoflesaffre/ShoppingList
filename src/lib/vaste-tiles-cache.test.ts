import { describe, expect, it } from "vitest";
import { parseCachedTiles } from "./vaste-lijstjes";

const tile = { id: "te-kopen", kind: "te-kopen", href: "/te-kopen", name: "Te kopen", count: 7, countLabel: "open", icon: "/i.webp", color: [1, 2, 3] };

describe("parseCachedTiles", () => {
  it("geeft de bewaarde tegels terug", () => {
    expect(parseCachedTiles(JSON.stringify([tile]))).toEqual([tile]);
  });
  it("negeert lege, kapotte en onvolledige data", () => {
    expect(parseCachedTiles(null)).toBeNull();
    expect(parseCachedTiles("[]")).toBeNull();
    expect(parseCachedTiles("{kapot")).toBeNull();
    expect(parseCachedTiles(JSON.stringify([{ id: "x" }]))).toBeNull();
    expect(parseCachedTiles(JSON.stringify([null]))).toBeNull();
  });
});
