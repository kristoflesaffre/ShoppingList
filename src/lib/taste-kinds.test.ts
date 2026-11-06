import { describe, expect, it } from "vitest";
import { buildDiscoverExcludeIds } from "@/lib/discover-feedback";
import { recommendSeries, type TasteRating, type TasteSeries } from "@/lib/series-taste";
import { MOVIE_TASTE, SERIES_TASTE, autoLikedMovieIds, tasteMovieFromTmdb } from "@/lib/taste-kinds";

describe("sleutels", () => {
  it("houdt film en serie met hetzelfde TMDB-nummer uit elkaar", () => {
    expect(MOVIE_TASTE.mediaId(42)).toBe("taste-movie-42");
    expect(SERIES_TASTE.mediaId(42)).toBe("taste-tv-42");
    expect(MOVIE_TASTE.parseMediaId("taste-tv-42")).toBeNull();
    expect(SERIES_TASTE.parseMediaId("taste-movie-42")).toBeNull();
    expect(MOVIE_TASTE.parseMediaId("taste-movie-42")).toBe(42);
    expect(MOVIE_TASTE.parseMediaId(MOVIE_TASTE.unseenId)).toBeNull();
    expect(MOVIE_TASTE.unseenId).not.toBe(SERIES_TASTE.unseenId);
  });
});

describe("autoLikedMovieIds", () => {
  it("telt enkel films op gezien mee", () => {
    expect(Array.from(autoLikedMovieIds(["movie-1", "tv-2", "ep-3-s1e2", "follow-tv-4", "movie-x"]))).toEqual([1]);
  });
});

describe("tasteMovieFromTmdb", () => {
  it("zet regisseurs, hoofdrollen en de filmreeks in de vorm van de catalogus", () => {
    const movie = tasteMovieFromTmdb({
      id: 7,
      title: "Heat",
      release_date: "1995-12-15",
      poster_path: "/p.jpg",
      vote_average: 7.94,
      vote_count: 100,
      original_language: "en",
      genres: [{ name: "Misdaad" }],
      belongs_to_collection: { name: "Heat Collection" },
      keywords: { keywords: [{ name: "heist" }] },
      credits: { crew: [{ job: "Editor", name: "E" }, { job: "Director", name: "Michael Mann" }], cast: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }] },
    });
    expect(movie).toMatchObject({ id: 7, n: "Heat", y: 1995, r: 7.9, s: null, c: ["Michael Mann"], w: ["A", "B", "C"], k: ["reeks: Heat Collection", "heist"] });
    expect(tasteMovieFromTmdb({ id: 7 })).toBeNull();
  });
});

describe("voorstellen voor films", () => {
  const movie = (id: number, c: string[], g: string[], k: string[] = []): TasteSeries => ({ id, n: `Film ${id}`, y: 2000, p: "/p", r: 8, v: 1000, s: null, l: "en", g, c, w: [], k });
  it("stelt een film van dezelfde regisseur voor", () => {
    const catalog = [movie(1, ["Nolan"], ["Actie"]), movie(2, ["Nolan"], ["Drama"]), movie(3, ["Nolan"], ["Thriller"]), movie(4, ["Nolan"], ["Sciencefiction"]), movie(5, ["Ander"], ["Komedie"])];
    const ratings = new Map<number, TasteRating>([1, 2, 3].map((id) => [id, { level: "top", auto: false }]));
    expect(recommendSeries(catalog, ratings, new Set(), 5).map((r) => r.series.id)).toEqual([4]);
  });
});

describe("Nieuw voor jou", () => {
  it("laat beoordeelde films weg, ook met hetzelfde nummer als een serie", () => {
    const ids = buildDiscoverExcludeIds({
      watchlistIds: [],
      dismissedIds: [],
      watchedIds: [],
      ownReactions: [{ mediaId: "taste-movie-42", reaction: "top" }, { mediaId: "taste-movie-unseen", reaction: "43,44" }],
    });
    expect(ids.has("movie-42")).toBe(true);
    expect(ids.has("tv-42")).toBe(false);
  });
});
