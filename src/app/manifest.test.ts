import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("installed app manifest", () => {
  it("requests fullscreen on launch without a fullscreen button", () => {
    expect(manifest().display).toBe("fullscreen");
  });

  it("preserves the existing app start URL and name", () => {
    expect(manifest()).toMatchObject({
      start_url: "/",
      name: "Shopping List",
      short_name: "Boodschappen",
    });
  });
});
