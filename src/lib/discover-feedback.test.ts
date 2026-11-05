import { describe, expect, it } from "vitest";
import { buildDiscoverExcludeIds, discoverDismissMediaId, parseDiscoverDismissMediaId } from "@/lib/discover-feedback";

const empty = { watchlistIds: [], watchedIds: [], dismissedIds: [], ownReactions: [] };

describe("buildDiscoverExcludeIds", () => {
  it("houdt een weggeklikte titel uit de database tegen op elk toestel", () => {
    const ids = buildDiscoverExcludeIds({
      ...empty,
      ownReactions: [{ mediaId: discoverDismissMediaId("movie-12"), reaction: "dismissed" }],
    });
    expect(ids.has("movie-12")).toBe(true);
  });

  it("telt watchlist, gezien en lokale keuzes mee", () => {
    const ids = buildDiscoverExcludeIds({
      ...empty,
      watchlistIds: ["movie-1"],
      watchedIds: ["movie-2", "tv-3"],
      dismissedIds: ["tv-4"],
    });
    expect(Array.from(ids).sort()).toEqual(["movie-1", "movie-2", "tv-3", "tv-4"]);
  });

  it("herkent een serie aan afleveringen, volgen en wachten", () => {
    const ids = buildDiscoverExcludeIds({
      ...empty,
      watchedIds: ["ep-5-s1e3", "follow-tv-6", "follow-no-tv-7", "follow-added-tv-8-s2", "waiting-tv-9-s4"],
    });
    expect(Array.from(ids).sort()).toEqual(["tv-5", "tv-6", "tv-7", "tv-8", "tv-9"]);
  });

  it("telt oordelen en reacties op je partner mee, maar «niet gezien» niet", () => {
    const ids = buildDiscoverExcludeIds({
      ...empty,
      ownReactions: [
        { mediaId: "taste-tv-10", reaction: "no" },
        { mediaId: "taste-unseen", reaction: "11,12" },
        { mediaId: "movie-13", reaction: "down" },
      ],
    });
    expect(Array.from(ids).sort()).toEqual(["movie-13", "tv-10"]);
  });
});

describe("parseDiscoverDismissMediaId", () => {
  it("leest alleen eigen rijen", () => {
    expect(parseDiscoverDismissMediaId("discover-tv-4")).toBe("tv-4");
    expect(parseDiscoverDismissMediaId("taste-tv-4")).toBeNull();
  });
});
