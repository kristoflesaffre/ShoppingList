import { describe, expect, it } from "vitest";
import { ARCFACE_TEMPLATE, decodeDetections, detInput, matchFaces, nms, normalize, similarity, type Face, type Point } from "@/lib/face/geometry";
import { readDetOutputs } from "@/lib/face/outputs";

const face = (x: number, score = 0.9): Face => ({ box: [x, 0, x + 50, 50], score, kps: [] });

describe("similarity", () => {
  it("vindt draaiing, schaal en verschuiving terug", () => {
    const angle = 0.3, s = 1.7, a = s * Math.cos(angle), b = s * Math.sin(angle);
    const to = ARCFACE_TEMPLATE.map(([x, y]) => [a * x - b * y + 12, b * x + a * y - 7] as Point);
    const t = similarity(ARCFACE_TEMPLATE, to);
    expect(t.a).toBeCloseTo(a, 6); expect(t.b).toBeCloseTo(b, 6); expect(t.tx).toBeCloseTo(12, 6); expect(t.ty).toBeCloseTo(-7, 6);
  });
});

describe("detInput", () => {
  it("schaalt zonder vervorming linksboven in 640 × 640", () => {
    const img = { data: new Uint8Array(1920 * 1080 * 4).fill(255), width: 1920, height: 1080 };
    const { tensor, scale } = detInput(img);
    expect(scale).toBeCloseTo(360 / 1080, 6);
    expect(tensor[0]).toBeCloseTo((255 - 127.5) / 128, 4); // beeld
    expect(tensor[400 * 640]).toBeCloseTo(-127.5 / 128, 4); // zwarte rand onder het beeld
  });
});

describe("decodeDetections", () => {
  it("rekent anker, afstand en schaal om naar het originele beeld", () => {
    const counts = [8, 16, 32].map(s => (640 / s) ** 2 * 2);
    const outs = counts.flatMap(n => [
      { data: new Float32Array(n), dims: [n, 1] }, { data: new Float32Array(n * 4), dims: [n, 4] }, { data: new Float32Array(n * 10), dims: [n, 10] },
    ]);
    // Stride 8, cel (x 2, y 1), tweede anker: index (1 * 80 + 2) * 2 + 1.
    const i = (1 * 80 + 2) * 2 + 1;
    outs[0].data[i] = 0.9;
    outs[1].data.set([1, 1, 2, 2], i * 4);
    const [f] = decodeDetections(readDetOutputs(outs), 0.5);
    expect(f.box).toEqual([(16 - 8) / 0.5, (8 - 8) / 0.5, (16 + 16) / 0.5, (8 + 16) / 0.5]);
  });
});

describe("nms", () => {
  it("houdt het zekerste van overlappende vakken", () => {
    expect(nms([face(0, 0.6), face(5, 0.9), face(200, 0.7)], 0.4).map(f => f.score)).toEqual([0.9, 0.7]);
  });
});

describe("matchFaces", () => {
  const v = (...xs: number[]) => normalize(xs);
  const refs = [{ item: "Lamb", embedding: v(1, 0, 0) }, { item: "River", embedding: v(0, 1, 0) }, { item: "Sid", embedding: v(0, 0, 1) }];
  it("neemt enkel zekere treffers, van links naar rechts, elke acteur één keer", () => {
    const m = matchFaces([
      { face: face(300), embedding: v(1, 0.1, 0) },
      { face: face(10), embedding: v(0.1, 1, 0) },
      { face: face(150), embedding: v(1, 0.9, 0) }, // twijfel tussen Lamb en River
      { face: face(500), embedding: v(0.98, 0.15, 0) }, // tweede keer Lamb, minder zeker
    ], refs);
    expect(m.map(x => x.item)).toEqual(["River", "Lamb"]);
  });
  it("geeft niets als niemand genoeg lijkt", () => {
    expect(matchFaces([{ face: face(0), embedding: v(-1, -1, -1) }], refs)).toEqual([]);
  });
});
