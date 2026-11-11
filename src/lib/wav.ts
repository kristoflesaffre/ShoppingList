/**
 * Kleine hulpjes om een opname als WAV (16-bit PCM, mono) door te sturen. WAV kan elk spraakmodel lezen, ongeacht of
 * de browser zelf mp4 (Safari) of webm (Chrome) opneemt.
 */

/** Float-samples (-1…1) naar een WAV-bestand. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

/** Bytes naar base64, in stukken (een grote opname in één keer laat `String.fromCharCode` struikelen). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(binary);
}

/** Is dit een WAV-bestand zoals `encodeWav` het maakt (PCM, mono, 16-bit)? Voor de controle op de server. */
export function isPcmWav(bytes: Uint8Array): boolean {
  if (bytes.length < 44) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 4)));
  return tag(0) === "RIFF" && tag(8) === "WAVE" && tag(12) === "fmt " && view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1 && view.getUint16(34, true) === 16;
}
