import { describe, expect, it } from "vitest";
import {
  TASTE_WALL_COLS,
  TASTE_WALL_ROWS,
  autoLikedSeriesIds,
  buildTasteWall,
  effectiveRatings,
  parseTasteMediaId,
  parseUnseenList,
  recommendSeries,
  tasteProfile,
  tasteProgress,
  tasteSeriesFromTmdb,
  type TasteLevel,
  type TasteSeries,
} from "./series-taste";

const series = (id: number, over: Partial<TasteSeries> = {}): TasteSeries => ({
  id,
  n: `Serie ${id}`,
  y: 2015,
  p: "/p.jpg",
  r: 8,
  v: 10000,
  s: 3,
  l: "en",
  g: [],
  c: [],
  w: [],
  k: [],
  ...over,
});

describe("autoLikedSeriesIds", () => {
  it("telt gevolgde, geziene en begonnen series mee", () => {
    expect(Array.from(autoLikedSeriesIds(["follow-tv-1", "tv-2", "ep-3-s1e2"])).sort()).toEqual([1, 2, 3]);
  });

  it("negeert een startpunt, films en andere markeringen", () => {
    expect(autoLikedSeriesIds(["ep-4-s1e0", "movie-5", "waiting-tv-6-s2", "follow-added-tv-7-s2"]).size).toBe(0);
  });

  it("telt een serie die je liet vallen niet mee, tenzij ze op gezien staat", () => {
    expect(autoLikedSeriesIds(["ep-8-s1e1", "follow-no-tv-8"]).has(8)).toBe(false);
    expect(autoLikedSeriesIds(["tv-9", "ep-9-s1e1", "follow-no-tv-9"]).has(9)).toBe(true);
  });
});

describe("effectiveRatings", () => {
  it("laat je eigen oordeel voorgaan op automatisch", () => {
    const out = effectiveRatings(new Map<number, TasteLevel>([[1, "no"]]), new Set([1, 2]), new Set());
    expect(out.get(1)).toEqual({ level: "no", auto: false });
    expect(out.get(2)).toEqual({ level: "good", auto: true });
  });

  it("haalt een automatische serie eruit als je ze niet zag", () => {
    expect(effectiveRatings(new Map(), new Set([1]), new Set([1])).has(1)).toBe(false);
  });
});

describe("recommendSeries", () => {
  const crime = (id: number) => series(id, { g: ["Misdaad"], k: ["maffia", "politie"] });
  const comedy = (id: number) => series(id, { g: ["Komedie"], k: ["kantoor", "familie"] });
  const catalog = [crime(1), crime(2), crime(3), crime(4), comedy(5), comedy(6), comedy(7)];
  const rate = (entries: [number, TasteLevel][]) => effectiveRatings(new Map(entries), new Set(), new Set());

  it("geeft niets zolang je te weinig goed vond", () => {
    expect(recommendSeries(catalog, rate([[1, "top"], [2, "good"]]), new Set(), 5)).toEqual([]);
  });

  it("stelt voor wat lijkt op wat je goed vond en zegt waarop", () => {
    const out = recommendSeries(catalog, rate([[1, "top"], [2, "great"], [3, "good"]]), new Set(), 5);
    expect(out.map((r) => r.series.id)).toEqual([4]);
    expect(out[0].because[0].id).toBe(1);
  });

  it("slaat beoordeelde en uitgesloten series over", () => {
    const out = recommendSeries(catalog, rate([[1, "top"], [2, "great"], [3, "good"]]), new Set([4]), 5);
    expect(out).toEqual([]);
  });

  it("laat een hoger oordeel zwaarder wegen", () => {
    const makerA = series(10, { c: ["A"] });
    const makerB = series(11, { c: ["B"] });
    const out = recommendSeries(
      [makerA, makerB, series(12, { c: ["A"] }), series(13, { c: ["B"] }), series(14, { c: ["C"] }), series(15, { c: ["C"] })],
      rate([[10, "top"], [11, "good"], [14, "good"]]),
      new Set(),
      5,
    );
    expect(out[0].series.id).toBe(12);
  });

  it("zakt een serie die lijkt op wat je niet goed vond", () => {
    const fan = series(20, { k: ["x", "y"] });
    const hated = series(21, { k: ["y", "z"] });
    const candidate = series(22, { k: ["x", "y", "z"] });
    const other = series(23, { k: ["x"] });
    const base = [[20, "top"], [24, "good"], [25, "good"]] as [number, TasteLevel][];
    const cat = [fan, hated, candidate, other, series(24, { k: ["x"] }), series(25, { k: ["x"] })];
    const without = recommendSeries(cat, rate(base), new Set(), 5).find((r) => r.series.id === 22)!;
    const withDislike = recommendSeries(cat, rate([...base, [21, "no"]]), new Set(), 5).find((r) => r.series.id === 22);
    expect(withDislike?.score ?? 0).toBeLessThan(without.score);
  });
});

describe("hulpjes", () => {
  it("leest ids uit de bewaarde vorm", () => {
    expect(parseTasteMediaId("taste-tv-12")).toBe(12);
    expect(parseTasteMediaId("tv-12")).toBeNull();
    expect(parseUnseenList("1,2,,x,3")).toEqual([1, 2, 3]);
    expect(parseUnseenList(null)).toEqual([]);
  });

  it("zet een TMDB-detail om naar de catalogusvorm", () => {
    const s = tasteSeriesFromTmdb({
      id: 1,
      name: "Titel",
      first_air_date: "2019-02-01",
      poster_path: "/a.jpg",
      vote_average: 7.84,
      genres: [{ name: "Drama" }],
      created_by: [{ name: "Maker" }],
      keywords: { results: [{ name: "kw" }] },
    });
    expect(s).toMatchObject({ id: 1, n: "Titel", y: 2019, p: "/a.jpg", r: 7.8, g: ["Drama"], c: ["Maker"], k: ["kw"] });
    expect(tasteSeriesFromTmdb({ id: 2 })).toBeNull();
  });

  it("toont alle genres die je goed vindt, groter naarmate ze vaker terugkomen", () => {
    const all = [
      ...[1, 2, 3, 4].map((id) => series(id, { g: ["Drama", "Sci-Fi & Fantasy"] })),
      series(5, { g: ["Drama", "Misdaad"] }),
      series(6, { g: ["Misdaad", "Komedie"] }),
      series(7, { g: ["Western"] }),
      ...[8, 9, 10].map((id) => series(id, { g: ["Komedie", "Drama"] })),
    ];
    const ratings = effectiveRatings(
      new Map<number, TasteLevel>([[1, "top"], [2, "good"], [3, "good"], [4, "good"], [5, "good"], [6, "good"], [7, "good"], [8, "no"], [9, "no"], [10, "no"]]),
      new Set(),
      new Set(),
    );
    expect(tasteProfile(all, ratings)).toEqual({
      genres: [
        { name: "Drama", size: "lg" },
        { name: "Sci-Fi & Fantasy", size: "lg" },
        { name: "Misdaad", size: "sm" },
      ],
    });
  });

  it("telt vanaf één serie zolang je er nog maar een paar goed vond", () => {
    const all = [series(1, { g: ["Western"] }), series(2, { g: ["Drama"] })];
    const ratings = effectiveRatings(new Map<number, TasteLevel>([[1, "good"], [2, "great"]]), new Set(), new Set());
    expect(tasteProfile(all, ratings).genres.map((g) => g.name)).toEqual(["Drama", "Western"]);
  });
});

describe("buildTasteWall", () => {
  const series = (id: number, level: TasteLevel, v = 1000 - id) =>
    ({ id, n: `S${id}`, y: 2020, p: `/${id}.jpg`, r: 8, v, s: 1, l: "en", g: [], c: [], w: [], k: [], level, auto: false });
  const covered = (tiles: ReturnType<typeof buildTasteWall>) => {
    const cells = new Set<string>();
    for (const t of tiles) {
      for (let c = t.col; c < t.col + (t.big ? 2 : 1); c++) {
        for (let r = t.row; r < t.row + (t.big ? 2 : 1); r++) {
          expect(cells.has(`${c}:${r}`)).toBe(false);
          cells.add(`${c}:${r}`);
        }
      }
    }
    return cells.size;
  };

  it("vult elk vak van de strook precies één keer", () => {
    const rated = Array.from({ length: 200 }, (_, i) => series(i, i % 5 === 0 ? "top" : "no"));
    expect(covered(buildTasteWall(rated))).toBe(TASTE_WALL_COLS * TASTE_WALL_ROWS);
  });

  it("hangt je beste series groot, de bekendste eerst", () => {
    const rated = [...Array.from({ length: 60 }, (_, i) => series(i, "no")), series(100, "good", 9000), series(101, "top", 10), series(102, "top", 20), series(103, "great", 5)];
    const big = buildTasteWall(rated).filter((t) => t.big);
    expect(big.slice(0, 4).map((t) => t.series.id)).toEqual([102, 101, 103, 100]);
    expect(big.every((t) => t.level !== "no")).toBe(true);
  });

  it("toont wat je goed vond ook tussen de kleine tegels", () => {
    const rated = [...Array.from({ length: 30 }, (_, i) => series(i, "top")), ...Array.from({ length: 100 }, (_, i) => series(200 + i, "no"))];
    const small = buildTasteWall(rated).filter((t) => !t.big);
    expect(small.filter((t) => t.level === "top").length).toBeGreaterThan(15);
    expect(small.filter((t) => t.level === "no").length).toBeGreaterThan(15);
  });

  it("herhaalt de reeks als er te weinig series zijn", () => {
    const tiles = buildTasteWall([series(1, "top"), series(2, "no")]);
    expect(covered(tiles)).toBe(TASTE_WALL_COLS * TASTE_WALL_ROWS);
  });

  it("toont de catalogus neutraal zonder oordelen, en niets zonder posters", () => {
    const { level: _l, auto: _a, ...plain } = series(1, "no");
    const tiles = buildTasteWall([], [plain]);
    expect(tiles.every((t) => t.level === null)).toBe(true);
    expect(buildTasteWall([], [])).toEqual([]);
    expect(buildTasteWall([], [{ ...plain, p: null }])).toEqual([]);
  });
});

describe("tasteProgress", () => {
  const askable = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it("telt oordelen, automatische series en «niet gezien» als overlopen", () => {
    const ratings = new Map([
      [1, { level: "top" as const, auto: false }],
      [2, { level: "good" as const, auto: true }],
    ]);
    expect(tasteProgress(askable, ratings, new Set([3]))).toEqual({ total: 4, answered: 3, toGo: 1, pct: 75, autoCount: 1 });
  });

  it("telt een oordeel buiten de catalogus niet mee als overlopen, wel als verfijnbaar", () => {
    const ratings = new Map([[99, { level: "good" as const, auto: true }]]);
    expect(tasteProgress(askable, ratings, new Set())).toEqual({ total: 4, answered: 0, toGo: 4, pct: 0, autoCount: 1 });
  });

  it("geeft 0% zonder catalogus", () => {
    expect(tasteProgress([], new Map(), new Set())).toEqual({ total: 0, answered: 0, toGo: 0, pct: 0, autoCount: 0 });
  });
});
