/**
 * Gezichtsherkenning in de browser (X-Ray «Nu in beeld», canvas «XD · 3 Hoeken»): onnxruntime-web (WASM) met de twee
 * kleine InsightFace-modellen uit `public/models/face` (buffalo_s: SCRFD-500M + MobileFaceNet, 16 MB, eenmalig
 * geladen en daarna uit de cache). Gratis en lokaal: het beeld verlaat de tablet niet.
 * Licentie van de modellen: InsightFace, enkel niet-commercieel gebruik.
 */
import type { InferenceSession, Tensor } from "onnxruntime-web";
import { alignedInput, decodeDetections, detInput, matchFaces, normalize, type Face, type Match, type Rgba } from "./geometry";
import { readDetOutputs } from "./outputs";

const ORT_VERSION = "1.31.1";
const MODELS = { det: "/models/face/det_500m.onnx", rec: "/models/face/w600k_mbf.onnx" };
/** Gezichten kleiner dan dit (px in het screenshot) zijn te onzeker om te herkennen. */
const MIN_FACE = 28;

type Ort = typeof import("onnxruntime-web");
type Embedded = { face: Face; embedding: Float32Array };

let engine: Promise<{ ort: Ort; det: InferenceSession; rec: InferenceSession }> | null = null;
function load() {
  engine ??= (async () => {
    // Uit de CDN in de browser, niet via webpack: Next 14's minifier struikelt over `import.meta` in de ORT-bundel.
    const base = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
    const ort = (await import(/* webpackIgnore: true */ `${base}ort.wasm.min.mjs`)) as Ort;
    ort.env.wasm.wasmPaths = base;
    ort.env.wasm.numThreads = 1; // geen cross-origin-isolatie op de site: één thread
    const options = { executionProviders: ["wasm"], graphOptimizationLevel: "all" as const };
    const [det, rec] = await Promise.all([InferenceSessionFrom(ort, MODELS.det, options), InferenceSessionFrom(ort, MODELS.rec, options)]);
    return { ort, det, rec };
  })();
  engine.catch(() => { engine = null; });
  return engine;
}
async function InferenceSessionFrom(ort: Ort, url: string, options: InferenceSession.SessionOptions) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error("face-model-unavailable");
  return ort.InferenceSession.create(new Uint8Array(await res.arrayBuffer()), options);
}

/** Beeld (data-URL of TMDB-foto met CORS) → RGBA-pixels, hoogstens `maxWidth` breed. */
export async function imagePixels(src: string, maxWidth = 960): Promise<Rgba> {
  // Een foto die al als gewone <img> getoond werd, staat in de cache zonder CORS-header; het canvas mag die pixels dan
  // niet lezen. Daarom apart ophalen met een CORS-verzoek buiten de cache om.
  const blob = src.startsWith("data:") ? await (await fetch(src)).blob() : await fetch(src, { mode: "cors", cache: "no-store" }).then(r => {
    if (!r.ok) throw new Error("face-image-unavailable");
    return r.blob();
  });
  const img = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.max(1, Math.round(img.width * scale)), height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("face-canvas-unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  img.close();
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

async function detectAndEmbed(img: Rgba, onlyLargest = false): Promise<Embedded[]> {
  const { ort, det, rec } = await load();
  const { tensor, scale } = detInput(img);
  const out = await det.run({ [det.inputNames[0]]: new ort.Tensor("float32", tensor, [1, 3, 640, 640]) });
  let faces = decodeDetections(readDetOutputs(det.outputNames.map(n => ({ data: (out[n] as Tensor).data as Float32Array, dims: [...(out[n] as Tensor).dims] }))), scale)
    .filter(f => f.box[2] - f.box[0] >= MIN_FACE);
  if (onlyLargest) faces = faces.sort((a, b) => (b.box[2] - b.box[0]) * (b.box[3] - b.box[1]) - (a.box[2] - a.box[0]) * (a.box[3] - a.box[1])).slice(0, 1);
  const result: Embedded[] = [];
  for (const face of faces.slice(0, 8)) {
    const r = await rec.run({ [rec.inputNames[0]]: new ort.Tensor("float32", alignedInput(img, face.kps), [1, 3, 112, 112]) });
    result.push({ face, embedding: normalize((r[rec.outputNames[0]] as Tensor).data as Float32Array) });
  }
  return result;
}

/** Kenmerk van de castfoto's, onthouden per foto (zelfde acteur in elke aflevering = één keer rekenen). */
const references = new Map<string, Promise<Float32Array | null>>();
function reference(url: string) {
  let r = references.get(url);
  if (!r) {
    r = imagePixels(url, 400).then(img => detectAndEmbed(img, true)).then(f => f[0]?.embedding ?? null).catch(() => null);
    references.set(url, r);
  }
  return r;
}

export type CastLike = { name: string; character: string; profileUrl: string | null };

/** Wie uit `cast` staat er in het beeld? Enkel zekere treffers, van links naar rechts. */
export async function recognize<T extends CastLike>(frameSrc: string, cast: T[], maxRefs = 40): Promise<Match<T>[]> {
  const people = cast.filter(c => c.profileUrl).slice(0, maxRefs);
  const [frame, refs] = await Promise.all([
    imagePixels(frameSrc).then(img => detectAndEmbed(img)),
    Promise.all(people.map(async item => ({ item, embedding: await reference(item.profileUrl!) }))),
  ]);
  return matchFaces(frame, refs.filter((r): r is { item: T; embedding: Float32Array } => !!r.embedding));
}

/** Modellen alvast laden (bv. zodra X-Ray opent), zodat de eerste herkenning niet wacht. */
export function preloadRecognizer() { void load().catch(() => {}); }
