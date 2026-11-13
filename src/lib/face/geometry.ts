/**
 * Gezichtsherkenning voor X-Ray «Nu in beeld», zonder server: de rekenstappen rond twee kleine open modellen
 * (InsightFace buffalo_s: SCRFD-500M om gezichten te vinden, MobileFaceNet/ArcFace voor een kenmerk van 512 getallen).
 * Alles werkt op ruwe RGBA-pixels, zodat de browser (canvas) en Node (tests) exact hetzelfde rekenen.
 * Gelijk aan insightface/model_zoo/scrfd.py en utils/face_align.py.
 */

export type Rgba = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };
export type Point = [number, number];
export type Face = { box: [number, number, number, number]; score: number; kps: Point[] };

export const DET_SIZE = 640;
const STRIDES = [8, 16, 32] as const;
const ANCHORS = 2;

/** Bilineair schalen naar `w × h` (RGB, kanalen achter elkaar per pixel). */
function sample(src: Rgba, x: number, y: number, out: Float32Array, o: number) {
  if (x < 0 || y < 0 || x > src.width - 1 || y > src.height - 1) { out[o] = out[o + 1] = out[o + 2] = 0; return; }
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, src.width - 1), y1 = Math.min(y0 + 1, src.height - 1);
  const fx = x - x0, fy = y - y0, d = src.data, w = src.width;
  for (let c = 0; c < 3; c++) {
    const a = d[(y0 * w + x0) * 4 + c], b = d[(y0 * w + x1) * 4 + c], e = d[(y1 * w + x0) * 4 + c], f = d[(y1 * w + x1) * 4 + c];
    out[o + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (e * (1 - fx) + f * fx) * fy;
  }
}

/**
 * Invoer voor SCRFD: beeld zonder vervorming in 640×640 (linksboven, rest zwart), RGB, (x − 127,5) / 128, NCHW.
 * Geeft ook de schaal terug om de gevonden vakken terug te rekenen naar het originele beeld.
 */
export function detInput(img: Rgba, size = DET_SIZE): { tensor: Float32Array; scale: number } {
  const ratio = img.height / img.width;
  const newH = ratio > 1 ? size : Math.round(size * ratio);
  const newW = ratio > 1 ? Math.round(size / ratio) : size;
  const scale = newH / img.height;
  const plane = size * size, tensor = new Float32Array(3 * plane).fill((0 - 127.5) / 128);
  const px = new Float32Array(3);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      // Zelfde middelpunt-regel als cv2.resize (INTER_LINEAR).
      sample(img, Math.max(0, (x + 0.5) / scale - 0.5), Math.max(0, (y + 0.5) / scale - 0.5), px, 0);
      const i = y * size + x;
      tensor[i] = (px[0] - 127.5) / 128;
      tensor[plane + i] = (px[1] - 127.5) / 128;
      tensor[2 * plane + i] = (px[2] - 127.5) / 128;
    }
  }
  return { tensor, scale };
}

/** Uitvoer van SCRFD (scores, vakken, ankerpunten per stride) → gezichten in de coördinaten van het originele beeld. */
export function decodeDetections(outputs: { scores: Float32Array[]; boxes: Float32Array[]; kps: Float32Array[] }, scale: number, threshold = 0.5, size = DET_SIZE): Face[] {
  const faces: Face[] = [];
  STRIDES.forEach((stride, s) => {
    const cells = size / stride, scores = outputs.scores[s], boxes = outputs.boxes[s], kps = outputs.kps[s];
    for (let i = 0; i < cells * cells * ANCHORS; i++) {
      const score = scores[i];
      if (score < threshold) continue;
      const cell = Math.floor(i / ANCHORS), cx = (cell % cells) * stride, cy = Math.floor(cell / cells) * stride;
      const b = boxes.subarray(i * 4, i * 4 + 4), k = kps.subarray(i * 10, i * 10 + 10);
      faces.push({
        score,
        box: [(cx - b[0] * stride) / scale, (cy - b[1] * stride) / scale, (cx + b[2] * stride) / scale, (cy + b[3] * stride) / scale],
        kps: [0, 1, 2, 3, 4].map(j => [(cx + k[j * 2] * stride) / scale, (cy + k[j * 2 + 1] * stride) / scale] as Point),
      });
    }
  });
  return nms(faces, 0.4);
}

export function nms(faces: Face[], iouThreshold: number): Face[] {
  const sorted = [...faces].sort((a, b) => b.score - a.score), keep: Face[] = [];
  const area = (f: Face) => Math.max(0, f.box[2] - f.box[0] + 1) * Math.max(0, f.box[3] - f.box[1] + 1);
  for (const f of sorted) {
    const overlaps = keep.some(k => {
      const w = Math.max(0, Math.min(f.box[2], k.box[2]) - Math.max(f.box[0], k.box[0]) + 1);
      const h = Math.max(0, Math.min(f.box[3], k.box[3]) - Math.max(f.box[1], k.box[1]) + 1);
      return (w * h) / (area(f) + area(k) - w * h) > iouThreshold;
    });
    if (!overlaps) keep.push(f);
  }
  return keep;
}

/** ArcFace-sjabloon: waar ogen, neus en mondhoeken horen in een gezicht van 112×112. */
export const ARCFACE_TEMPLATE: Point[] = [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]];

/** Gelijkvormigheid (draaien, schalen, verschuiven; geen spiegeling) die `from` zo goed mogelijk op `to` legt. */
export function similarity(from: Point[], to: Point[]): { a: number; b: number; tx: number; ty: number } {
  const n = from.length, mean = (pts: Point[]) => pts.reduce((m, p) => [m[0] + p[0] / n, m[1] + p[1] / n], [0, 0]);
  const [fx, fy] = mean(from), [qx, qy] = mean(to);
  let num1 = 0, num2 = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const px = from[i][0] - fx, py = from[i][1] - fy, ux = to[i][0] - qx, uy = to[i][1] - qy;
    num1 += px * ux + py * uy; num2 += px * uy - py * ux; den += px * px + py * py;
  }
  const a = num1 / den, b = num2 / den;
  return { a, b, tx: qx - (a * fx - b * fy), ty: qy - (b * fx + a * fy) };
}

/** Uitgelijnd gezicht van 112×112 als ArcFace-invoer: RGB, (x − 127,5) / 127,5, NCHW. */
export function alignedInput(img: Rgba, kps: Point[], size = 112): Float32Array {
  const { a, b, tx, ty } = similarity(kps, ARCFACE_TEMPLATE);
  // Omgekeerde afbeelding: voor elke doelpixel waar die in het bronbeeld ligt.
  const det = a * a + b * b, plane = size * size, out = new Float32Array(3 * plane), px = new Float32Array(3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - tx, dy = y - ty;
      sample(img, (a * dx + b * dy) / det, (-b * dx + a * dy) / det, px, 0);
      const i = y * size + x;
      out[i] = (px[0] - 127.5) / 127.5;
      out[plane + i] = (px[1] - 127.5) / 127.5;
      out[2 * plane + i] = (px[2] - 127.5) / 127.5;
    }
  }
  return out;
}

export function normalize(v: Float32Array | number[]): Float32Array {
  const out = Float32Array.from(v);
  let sum = 0;
  for (let i = 0; i < out.length; i++) sum += out[i] * out[i];
  const n = Math.sqrt(sum) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= n;
  return out;
}

export const cosine = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

export type Reference<T> = { item: T; embedding: Float32Array };
export type Match<T> = { item: T; similarity: number; margin: number; face: Face };

/**
 * Wie is wie: elk gevonden gezicht tegen de castfoto's. Enkel zekere treffers: genoeg gelijkenis én duidelijk beter
 * dan de tweede kandidaat (gemeten op TMDB-stills en een echt projectorbeeld: juiste treffers 0,34–0,72 met marge
 * ≥ 0,2; fouten bleven onder 0,3). Elke acteur hoogstens één keer, het zekerste gezicht wint.
 */
export function matchFaces<T>(faces: { face: Face; embedding: Float32Array }[], refs: Reference<T>[], minSimilarity = 0.3, minMargin = 0.12): Match<T>[] {
  const candidates = faces.flatMap(({ face, embedding }) => {
    const ranked = refs.map(r => ({ r, s: cosine(embedding, r.embedding) })).sort((x, y) => y.s - x.s);
    const [first, second] = ranked;
    if (!first) return [];
    const margin = first.s - (second?.s ?? 0);
    return first.s >= minSimilarity && margin >= minMargin ? [{ item: first.r.item, similarity: first.s, margin, face }] : [];
  }).sort((x, y) => y.similarity - x.similarity);
  const seen = new Set<T>();
  return candidates.filter(c => (seen.has(c.item) ? false : (seen.add(c.item), true))).sort((x, y) => x.face.box[0] - y.face.box[0]);
}
