"use client";

import * as React from "react";
import { bytesToBase64, encodeWav } from "@/lib/wav";

/**
 * Spraak naar tekst voor X-Ray. Eerst de ingebouwde herkenning van de browser (gratis, live tekst; op de iPad dezelfde
 * als de microfoon van het toetsenbord) in de gekozen taal. Lukt die niet (bv. niet toegelaten in een app op het
 * beginscherm, of geen netwerk voor de herkenning), dan neemt de app zelf op tot je stil valt en zet de server het om
 * (Gemini, herkent zelf Nederlands en Engels).
 */

export type DictationLang = "nl" | "en";
export type DictationStatus = "idle" | "listening" | "recording" | "transcribing";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => Recognition;

const LANG_KEY = "xray-dictation-lang";
const BROWSER_LANG: Record<DictationLang, string> = { nl: "nl-BE", en: "en-US" };
/** Fouten waarbij opnemen + de server wél nog kan werken. «no-speech» en «aborted» horen daar niet bij. */
const FALLBACK_ERRORS = new Set(["not-allowed", "service-not-allowed", "network", "language-not-supported", "bad-grammar"]);
const TARGET_RATE = 16_000;
const MAX_MS = 20_000;
const SILENCE_MS = 1_400;
const NO_SPEECH_MS = 7_000;
const LOUD = 0.02;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/** Opname naar 16 kHz mono WAV (base64). */
async function toWavBase64(blob: Blob): Promise<string> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * TARGET_RATE)), TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return bytesToBase64(encodeWav(rendered.getChannelData(0), TARGET_RATE));
  } finally { void ctx.close(); }
}

export function useDictation({ onText, onError, transcribe }: {
  /** Tussentijdse en definitieve tekst. */
  onText: (text: string, final: boolean) => void;
  onError: (message: string) => void;
  /** WAV (base64) naar tekst op de server. */
  transcribe: (audioBase64: string) => Promise<string>;
}) {
  const [status, setStatus] = React.useState<DictationStatus>("idle");
  const [lang, setLangState] = React.useState<DictationLang>("nl");
  const [supported, setSupported] = React.useState({ browser: false, any: false });
  const stopRef = React.useRef<(() => void) | null>(null);
  const cancelRef = React.useRef<(() => void) | null>(null);
  // Weigert de browserherkenning het één keer (bv. app op het beginscherm), dan meteen opnemen de volgende keren.
  const browserBlocked = React.useRef(false);
  const cb = React.useRef({ onText, onError, transcribe });
  cb.current = { onText, onError, transcribe };

  React.useEffect(() => {
    const browser = !!recognitionCtor();
    setSupported({ browser, any: browser || canRecord() });
    try { const v = localStorage.getItem(LANG_KEY); if (v === "nl" || v === "en") setLangState(v); } catch { /* geen opslag */ }
  }, []);
  React.useEffect(() => () => cancelRef.current?.(), []);

  const setLang = (v: DictationLang) => {
    setLangState(v);
    try { localStorage.setItem(LANG_KEY, v); } catch { /* geen opslag */ }
  };

  const record = async () => {
    if (!canRecord()) { setStatus("idle"); cb.current.onError("Spraak wordt op dit toestel niet ondersteund."); return; }
    // AudioContext nog binnen de tik aanmaken (iOS laat hem anders niet starten).
    const meter = new AudioContext();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      void meter.close();
      setStatus("idle");
      cb.current.onError("Geef X-Ray toegang tot de microfoon om een vraag in te spreken.");
      return;
    }
    const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(m => MediaRecorder.isTypeSupported?.(m));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    let heard = false, cancelled = false, timer = 0;
    const analyser = meter.createAnalyser();
    analyser.fftSize = 1024;
    meter.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const startedAt = Date.now();
    let lastLoud = startedAt;
    const finish = () => { window.clearInterval(timer); if (recorder.state !== "inactive") recorder.stop(); };
    timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const now = Date.now();
      if (Math.sqrt(sum / buf.length) > LOUD) { heard = true; lastLoud = now; }
      if ((heard && now - lastLoud > SILENCE_MS) || (!heard && now - startedAt > NO_SPEECH_MS) || now - startedAt > MAX_MS) finish();
    }, 100);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      window.clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      void meter.close();
      stopRef.current = null;
      if (cancelled) { setStatus("idle"); return; }
      if (!heard || !chunks.length) { setStatus("idle"); cb.current.onError("Ik hoorde niets. Tik op de microfoon en stel je vraag."); return; }
      setStatus("transcribing");
      try {
        const text = (await cb.current.transcribe(await toWavBase64(new Blob(chunks, { type: recorder.mimeType || mime })))).trim();
        if (text) cb.current.onText(text, true);
        else cb.current.onError("Ik verstond het niet. Probeer het nog eens.");
      } catch (e) {
        cb.current.onError(e instanceof Error && e.message.length > 12 ? e.message : "Omzetten naar tekst lukte niet. Probeer het opnieuw.");
      } finally { setStatus("idle"); }
    };
    // Tik tijdens het opnemen = nu stoppen en omzetten. Weggaan = stoppen zonder omzetten.
    stopRef.current = () => { if (recorder.state === "inactive") return; finish(); };
    cancelRef.current = () => { cancelled = true; finish(); };
    recorder.start();
    setStatus("recording");
  };

  const start = () => {
    if (status !== "idle") return;
    const Ctor = recognitionCtor();
    if (!Ctor || browserBlocked.current) { void record(); return; }
    const rec = new Ctor();
    rec.lang = BROWSER_LANG[lang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let got = "", fellBack = false;
    rec.onresult = e => {
      let text = "", final = true;
      for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; final = final && e.results[i].isFinal; }
      got = text.trim();
      if (got) cb.current.onText(got, final);
    };
    rec.onerror = e => {
      if (!got && FALLBACK_ERRORS.has(e.error)) {
        fellBack = true;
        if (e.error === "not-allowed" || e.error === "service-not-allowed") browserBlocked.current = true;
        void record();
      } else if (e.error === "no-speech") cb.current.onError("Ik hoorde niets. Tik op de microfoon en stel je vraag.");
      else if (e.error === "audio-capture") cb.current.onError("Er is geen microfoon gevonden.");
    };
    rec.onend = () => {
      if (fellBack) return;
      stopRef.current = null;
      setStatus("idle");
      if (got) cb.current.onText(got, true);
    };
    stopRef.current = () => rec.stop();
    cancelRef.current = () => { fellBack = true; rec.abort(); };
    try { rec.start(); setStatus("listening"); }
    catch { browserBlocked.current = true; void record(); }
  };

  const stop = () => stopRef.current?.();
  return { status, lang, setLang, supported: supported.any, chooseLang: supported.browser && !browserBlocked.current, start, stop };
}
