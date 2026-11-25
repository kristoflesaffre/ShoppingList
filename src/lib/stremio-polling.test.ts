import { expect, it } from "vitest";
import { stremioPollInterval } from "./stremio-polling";

it("keeps fast progress refresh in film and X-Ray views only", () => {
  for (const path of ["/films-series", "/films-series/nu-kijken", "/films-series/tv-123/episodes/s2e7"]) expect(stremioPollInterval(path)).toBe(30_000);
  for (const path of [null, "/", "/kalender", "/recepten", "/films-series-other"]) expect(stremioPollInterval(path)).toBe(300_000);
});
