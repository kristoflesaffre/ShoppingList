import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
} from "@/lib/watchlist";

const KEY = "watchlist_films";

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
}

function movie(id: string, title: string, order?: number): WatchlistItem {
  return {
    id: `movie-${id}`,
    type: "movie",
    title,
    year: "2026",
    posterUrl: null,
    ...(order === undefined ? {} : { order }),
  };
}

describe("watchlist", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("herstelt een legacy-item op de vorige positie na undo", () => {
    storage.setItem(
      KEY,
      JSON.stringify([
        movie("a", "A"),
        movie("b", "B"),
        movie("c", "C"),
        movie("d", "D"),
      ]),
    );

    const removed = getWatchlist()[1];

    removeFromWatchlist(removed.id);
    addToWatchlist(removed);

    expect(getWatchlist().map((item) => item.id)).toEqual([
      "movie-a",
      "movie-b",
      "movie-c",
      "movie-d",
    ]);
  });

  it("voegt nieuwe items zonder order achteraan toe", () => {
    storage.setItem(
      KEY,
      JSON.stringify([movie("a", "A", 0), movie("b", "B", 1)]),
    );

    addToWatchlist(movie("c", "C"));

    expect(getWatchlist().map((item) => item.id)).toEqual([
      "movie-a",
      "movie-b",
      "movie-c",
    ]);
  });

  it("herstelt op zichtbare index wanneer bestaande orderwaarden dubbel zijn", () => {
    storage.setItem(
      KEY,
      JSON.stringify([
        movie("a", "A", 0),
        movie("b", "B", 14),
        movie("c", "C", 14),
        movie("d", "D", 15),
      ]),
    );

    const removed = { ...getWatchlist()[1], restoreIndex: 1 };

    removeFromWatchlist(removed.id);
    addToWatchlist(removed);

    expect(getWatchlist().map((item) => item.id)).toEqual([
      "movie-a",
      "movie-b",
      "movie-c",
      "movie-d",
    ]);
    expect(getWatchlist().map((item) => item.order)).toEqual([0, 1, 2, 3]);
    expect(getWatchlist().some((item) => "restoreIndex" in item)).toBe(false);
  });
});
