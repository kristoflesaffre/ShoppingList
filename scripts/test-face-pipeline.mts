/**
 * Controle van de gezichtsherkenning (src/lib/face) buiten de browser: dezelfde modellen via onnxruntime-web (WASM)
 * op TMDB-stills, tegen de TMDB-cast van de aflevering. Vergelijk met InsightFace in Python (buffalo_s).
 *   npx tsx scripts/test-face-pipeline.mts
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import * as ort from "onnxruntime-web";
import { alignedInput, decodeDetections, detInput, matchFaces, normalize, type Face, type Rgba } from "../src/lib/face/geometry";
import { readDetOutputs } from "../src/lib/face/outputs";

const env = readFileSync(".env.local", "utf8");
const token = /^TMDB_ACCESS_TOKEN=(.+)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? /"(eyJ[^"]+)"/.exec(readFileSync("src/lib/tmdb.ts", "utf8"))![1];
const tmdb = (p: string) => fetch(`https://api.themoviedb.org/3${p}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
async function rgba(url: string): Promise<Rgba> {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

ort.env.wasm.numThreads = 1;
const det = await ort.InferenceSession.create(readFileSync("public/models/face/det_500m.onnx"));
const rec = await ort.InferenceSession.create(readFileSync("public/models/face/w600k_mbf.onnx"));
console.log("det in/out:", det.inputNames, det.outputNames.join(","), "rec:", rec.inputNames, rec.outputNames);

async function detect(img: Rgba): Promise<Face[]> {
  const { tensor, scale } = detInput(img);
  const out = await det.run({ [det.inputNames[0]]: new ort.Tensor("float32", tensor, [1, 3, 640, 640]) });
  return decodeDetections(readDetOutputs(det.outputNames.map(n => ({ data: out[n].data as Float32Array, dims: out[n].dims as number[] }))), scale);
}
async function embed(img: Rgba, face: Face) {
  const out = await rec.run({ [rec.inputNames[0]]: new ort.Tensor("float32", alignedInput(img, face.kps), [1, 3, 112, 112]) });
  return normalize(out[rec.outputNames[0]].data as Float32Array);
}

const EPISODES: [string, string, number, number][] = [["Breaking Bad S2E3", "tt0903747", 2, 3], ["Succession S1E3", "tt7660850", 1, 3], ["Slow Horses S1E2", "tt5875444", 1, 2], ["The Office S2E1", "tt0386676", 2, 1]];
for (const [label, imdb, s, e] of EPISODES) {
  const tv = (await tmdb(`/find/${imdb}?external_source=imdb_id`)).tv_results[0];
  const d = await tmdb(`/tv/${tv.id}/season/${s}/episode/${e}?append_to_response=credits,images`);
  const cast = [...d.credits.cast, ...d.credits.guest_stars].filter((p: { id: number; profile_path?: string }, i: number, a: { id: number }[]) => p.profile_path && a.findIndex(q => q.id === p.id) === i);
  const refs: { item: string; embedding: Float32Array }[] = [];
  for (const p of cast) {
    const img = await rgba(`https://image.tmdb.org/t/p/w185${p.profile_path}`);
    const faces = await detect(img);
    const big = faces.sort((x, y) => (y.box[2] - y.box[0]) * (y.box[3] - y.box[1]) - (x.box[2] - x.box[0]) * (x.box[3] - x.box[1]))[0];
    if (big) refs.push({ item: p.name, embedding: await embed(img, big) });
  }
  for (const [i, st] of (d.images?.stills ?? []).slice(0, 6).entries()) {
    const img = await rgba(`https://image.tmdb.org/t/p/w780${st.file_path}`);
    const t0 = performance.now();
    const faces = await detect(img);
    const embedded = await Promise.all(faces.map(async face => ({ face, embedding: await embed(img, face) })));
    const ms = Math.round(performance.now() - t0);
    const matches = matchFaces(embedded, refs);
    console.log(`${label.replace(/ /g, "_")}_${i}: ${refs.length}/${cast.length} refs · ${faces.length} gezichten · ${ms} ms | ${matches.map(m => `${m.item} ${m.similarity.toFixed(2)}/${m.margin.toFixed(2)}`).join(" | ") || "—"}`);
  }
}
