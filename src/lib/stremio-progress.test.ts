import { expect, it } from "vitest";
import { parseStremioProgress, stremioProgressLabel } from "./stremio-progress";
const row = { _id: "tt18923754", type: "series", name: "Daredevil", removed: false, state: { video_id: "tt18923754:2:7", timeOffset: 1_080_000, duration: 3_600_000, lastWatched: "2026-01-01T12:00:00Z" } };
it("reads last-played episode and milliseconds without manufacturing watched marks", () => {
  const [item] = parseStremioProgress([row]);
  expect(item).toMatchObject({ imdbId: row._id, season: 2, episode: 7, percent: 30 });
  expect(stremioProgressLabel(item)).toBe("S2 A7 · 18 / 60 min");
  expect(item).not.toHaveProperty("watched");
});
it("rejects mismatched, addon-specific and invalid episode identifiers", () => {
  for (const video_id of ["tt0108778:2:7", "tt18923754:2:0", "kitsu:123:7", "javascript:alert(1)", null]) expect(parseStremioProgress([{ ...row, state: { ...row.state, video_id } }])).toEqual([]);
});
it("ignores removed entries except temporary continue-watching entries", () => {
  expect(parseStremioProgress([{ ...row, removed: true }])).toEqual([]);
  expect(parseStremioProgress([{ ...row, removed: true, temp: true }])).toHaveLength(1);
});
it("bounds corrupt durations, offsets, missing timestamps and duplicate records", () => {
  expect(parseStremioProgress([{ ...row, state: { ...row.state, duration: NaN, timeOffset: -4 } }])[0]).toMatchObject({ percent: null, positionMs: 0, durationMs: 0 });
  expect(parseStremioProgress([{ ...row, state: { ...row.state, lastWatched: null } }])).toEqual([]);
  expect(parseStremioProgress([row, row])).toHaveLength(1);
  expect(() => parseStremioProgress({})).toThrow("invalid-library");
});
it("handles movie state, specials, completed positions and plain-text titles", () => {
  const [movie] = parseStremioProgress([{ ...row, type: "movie", name: "<script>title</script>", state: { ...row.state, timeOffset: 9_000_000 } }]);
  expect(movie).toMatchObject({ type: "movie", percent: 100, title: "<script>title</script>" });
  expect(movie.season).toBeUndefined();
  expect(parseStremioProgress([{ ...row, state: { ...row.state, video_id: "tt18923754:0:1" } }])[0].season).toBe(0);
});
