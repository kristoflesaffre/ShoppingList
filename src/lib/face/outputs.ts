/**
 * SCRFD-500M heeft negen uitgangen: per stride (8, 16, 32) scores (n×1), vakken (n×4) en ankerpunten (n×10).
 * De volgorde van de namen verschilt per export; we herkennen ze aan hun vorm (laatste dimensie) en aantal (n).
 */
export type RawOutput = { data: Float32Array; dims: number[] };

export function readDetOutputs(outputs: RawOutput[], size = 640) {
  const counts = [8, 16, 32].map(s => (size / s) ** 2 * 2);
  const pick = (width: number) => counts.map(n => {
    const hit = outputs.find(o => o.dims[o.dims.length - 1] === width && o.data.length === n * width);
    if (!hit) throw new Error("face-model-output");
    return hit.data;
  });
  return { scores: pick(1), boxes: pick(4), kps: pick(10) };
}
