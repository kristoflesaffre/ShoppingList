import { afterEach, expect, it, vi } from "vitest";
import { stremioTitleMapping } from "./stremio-title-mapping";
afterEach(() => vi.unstubAllGlobals());
it("coalesces title lookups using verified external IDs", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "tv-288673", imdbId: "tt11540908", seasons: [] })));
  vi.stubGlobal("fetch", fetcher);
  const [a, b] = await Promise.all([stremioTitleMapping("288673"), stremioTitleMapping("288673")]);
  expect(a).toEqual({ imdbId: "tt11540908", seasons: [] });
  expect(b).toBe(a);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not cache failed or mismatched metadata", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: "tv-999", imdbId: "tt11540908" }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: "tv-888", imdbId: "tt11540908", seasons: [] })));
  vi.stubGlobal("fetch", fetcher);
  await expect(stremioTitleMapping("888")).rejects.toThrow("metadata-unavailable");
  await expect(stremioTitleMapping("888")).resolves.toMatchObject({ imdbId: "tt11540908" });
  await expect(stremioTitleMapping("../secret")).rejects.toThrow("invalid-title");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
