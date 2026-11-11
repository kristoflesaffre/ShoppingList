import { describe, expect, it } from "vitest";
import { bytesToBase64, encodeWav, isPcmWav } from "./wav";

describe("encodeWav", () => {
  it("schrijft een geldige mono 16-bit WAV", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 0.5]), 16000);
    expect(wav.length).toBe(44 + 8);
    expect(isPcmWav(wav)).toBe(true);
    const view = new DataView(wav.buffer);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
  });
  it("knipt waarden buiten -1…1 af", () => {
    const view = new DataView(encodeWav(new Float32Array([3, -3]), 8000).buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe("isPcmWav", () => {
  it("weigert iets anders dan WAV", () => {
    expect(isPcmWav(new Uint8Array(10))).toBe(false);
    expect(isPcmWav(new TextEncoder().encode("x".repeat(60)))).toBe(false);
  });
});

describe("bytesToBase64", () => {
  it("geeft hetzelfde als Buffer, ook voor grote reeksen", () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 251);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});
