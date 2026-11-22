import { describe, expect, it } from "vitest";
import {
  applyLoungeEvent,
  DEFAULT_MASK,
  maskPolygon,
  nextLead,
  parseLoungeChunks,
  parseMask,
  videoFrame,
  FRAME_FADE_SHARE,
  MAX_ZOOM_SPREAD,
  syncAction,
  tvPositionAt,
  type TvNowPlaying,
} from "./ambience-projector";

const idle: TvNowPlaying = { videoId: null, time: 0, at: 0, state: "idle", duration: null };

describe("parseMask", () => {
  it("houdt een geldig masker en rondt af", () => {
    const mask = parseMask({ ...DEFAULT_MASK, margin: 2.26, soft: 1.4 });
    expect(mask?.margin).toBe(2.5);
    expect(mask?.soft).toBe(1);
  });
  it("weigert hoeken buiten het beeld of ontbrekende velden", () => {
    expect(parseMask({ ...DEFAULT_MASK, corners: { ...DEFAULT_MASK.corners, tl: [1.2, 0] } })).toBeNull();
    expect(parseMask({ corners: DEFAULT_MASK.corners })).toBeNull();
    expect(parseMask(null)).toBeNull();
  });
});

describe("maskPolygon", () => {
  it("schuift de hoeken naar buiten met de marge", () => {
    const [tl, , br] = maskPolygon({ ...DEFAULT_MASK, margin: 0 }, 1000, 1000);
    expect(tl).toEqual([300, 270]);
    expect(br).toEqual([700, 730]);
    const [tl2] = maskPolygon({ ...DEFAULT_MASK, margin: 4 }, 1000, 1000);
    expect(tl2[0]).toBeLessThan(300);
    expect(tl2[1]).toBeLessThan(270);
  });
});

describe("parseLoungeChunks", () => {
  it("leest berichten en houdt een onvolledig stuk over", () => {
    const one = '[[11,["nowPlaying",{"videoId":"uOquG6prOPY","currentTime":"2202.4","state":"1","duration":"11566.4"}]]\n]';
    const two = '[[12,["onStateChange",{"currentTime":"2210","state":"2"}]]\n]';
    const text = `${one.length}\n${one}\n${two.length}\n${two}\n40\n[[13,["noop"`;
    const { events, rest } = parseLoungeChunks(text);
    expect(events.map((e) => e.name)).toEqual(["nowPlaying", "onStateChange"]);
    expect(rest.trimStart().startsWith("40\n")).toBe(true);
  });
});

describe("applyLoungeEvent + tvPositionAt", () => {
  it("volgt video, tijd en pauze", () => {
    let np = applyLoungeEvent(idle, { id: 1, name: "nowPlaying", data: { videoId: "uOquG6prOPY", currentTime: "100", state: "1", duration: "500" } }, 1_000);
    expect(np).toMatchObject({ videoId: "uOquG6prOPY", time: 100, state: "playing", duration: 500 });
    expect(tvPositionAt(np, 3_000)).toBe(102);
    np = applyLoungeEvent(np, { id: 2, name: "onStateChange", data: { currentTime: "103", state: "2" } }, 4_000);
    expect(np.state).toBe("paused");
    expect(tvPositionAt(np, 9_000)).toBe(103);
  });
  it("reclame zet de projector stil", () => {
    const playing: TvNowPlaying = { videoId: "uOquG6prOPY", time: 10, at: 0, state: "playing", duration: 60 };
    expect(applyLoungeEvent(playing, { id: 3, name: "onAdStateChange", data: { adState: "1" } }, 1).state).toBe("ad");
  });
});

describe("syncAction", () => {
  const tv = { videoId: "uOquG6prOPY", position: 100, state: "playing" as const };
  it("laadt een andere video", () => {
    expect(syncAction(tv, { videoId: "aaaaaaaaaaa", position: 5, playing: true }).kind).toBe("load");
  });
  it("laat een klein verschil lopen en springt bij een groot", () => {
    expect(syncAction(tv, { videoId: tv.videoId, position: 100.3, playing: true }).kind).toBe("none");
    expect(syncAction(tv, { videoId: tv.videoId, position: 97, playing: true })).toEqual({ kind: "seek", at: 100.35 });
  });
  it("leert de voorsprong bij", () => {
    expect(nextLead(0.35, 0.7)).toBe(0);
    expect(nextLead(0.35, -0.4)).toBeCloseTo(0.75);
    expect(syncAction(tv, { videoId: tv.videoId, position: 97, playing: true }, 0.6)).toEqual({ kind: "seek", at: 100.6 });
  });
  it("pauzeert mee, ook bij reclame", () => {
    expect(syncAction({ ...tv, state: "paused" }, { videoId: tv.videoId, position: 100, playing: true }).kind).toBe("pause");
    expect(syncAction({ ...tv, state: "ad" }, { videoId: tv.videoId, position: 100, playing: true }).kind).toBe("pause");
  });
});

describe("videoFrame", () => {
  it("legt de video op het midden van de tv, spread × de tv-breedte", () => {
    // Tv bovenaan het beeld: de video haalt de bovenkant al, geen zoom.
    const corners = { tl: [0.3, 0.05], tr: [0.7, 0.05], br: [0.7, 0.25], bl: [0.3, 0.25] } as typeof DEFAULT_MASK.corners;
    const f = videoFrame({ ...DEFAULT_MASK, corners, spread: 2 }, 1000, 1000);
    expect(f.width).toBeCloseTo(800);
    expect(f.left + f.width / 2).toBeCloseTo(500);
    expect(f.top + f.height / 2).toBeCloseTo(150);
  });
  it("zoomt in tot het volle deel van de video de bovenkant van het beeld haalt", () => {
    const f = videoFrame({ ...DEFAULT_MASK, spread: 1.8 }, 1000, 562.5);
    const xs = Object.values(DEFAULT_MASK.corners).map((c) => c[0] * 1000);
    const ys = Object.values(DEFAULT_MASK.corners).map((c) => c[1] * 562.5);
    const tvWidth = Math.max(...xs) - Math.min(...xs);
    expect(f.top + f.height * FRAME_FADE_SHARE).toBeLessThanOrEqual(0.001);
    expect(f.width).toBeGreaterThan(tvWidth * 1.8);
    expect(f.width).toBeLessThanOrEqual(tvWidth * MAX_ZOOM_SPREAD + 0.001);
    expect(f.left + f.width / 2).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2);
    expect(f.top + f.height / 2).toBeCloseTo((Math.min(...ys) + Math.max(...ys)) / 2);
    expect(f.width / f.height).toBeCloseTo(16 / 9);
  });
  it("zoomt nooit verder dan MAX_ZOOM_SPREAD × de tv-breedte", () => {
    const corners = { tl: [0.45, 0.9], tr: [0.55, 0.9], br: [0.55, 0.95], bl: [0.45, 0.95] } as typeof DEFAULT_MASK.corners;
    const f = videoFrame({ ...DEFAULT_MASK, corners, spread: 1.8 }, 1000, 1000);
    expect(f.width).toBeCloseTo(100 * MAX_ZOOM_SPREAD);
  });
  it("vult een ontbrekende spread aan", () => {
    const { spread: _s, ...old } = DEFAULT_MASK;
    expect(parseMask(old)?.spread).toBe(1.8);
  });
});
