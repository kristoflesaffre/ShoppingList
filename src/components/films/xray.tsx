"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useGoogleAuthToken } from "@/lib/google-client";
import { cn } from "@/lib/utils";
import { useDictation } from "@/hooks/use_dictation";
import { clockTime, displayPosition, freshPlayback, parsePlayback, type Playback } from "@/lib/cinema-companion";
import { XRAY_LENGTH_DEFAULT, XRAY_LENGTHS, type XrayIdentity, type XrayKind, type XrayLength, type XrayMessage } from "@/lib/cinema-xray";
import { SegmentedControl } from "@/components/ui/segmented_control";
import type { BridgeStatus } from "@/lib/server/cinema-xray";

/**
 * X-Ray tijdens het afspelen (canvas «X-Ray · A2» en «X-Ray · gsm · variant 4 Ladder»).
 * De cover staat volledig in beeld, zonder vervaging: op tablet schermvullend met de bediening in glazen panelen,
 * op gsm bovenaan in 16:9. Bediening: grote play/pauze, 1 · 2 · 5 min terug, «Stop» (hele bioscoop af), snelle vragen
 * (serie of film) en een chat. Alles past binnen het scherm, ook met de veilige zones van een iPad.
 */

type XrayInfo = { tmdbId?: number | null; name: string; backdrop: string | null; poster: string | null; episodeTitle: string | null } | null;
type CastMember = { name: string; character: string; profileUrl: string | null };
type XrayState = { playback: Playback | null; live: boolean; identity: XrayIdentity | null; info: XrayInfo; messages: XrayMessage[]; hidden: number; aiConfigured: boolean; test?: boolean; bridge?: BridgeStatus | null };
type QuickKind = Exclude<XrayKind, "vraag">;
type Question = { kind: QuickKind; label: string; short: string; scope: string };

const SERIES_QUESTIONS: Question[] = [
  { kind: "net", label: "Wat is er net gebeurd?", short: "Net gebeurd", scope: "Laatste 2 minuten" },
  { kind: "afl", label: "Wat is er tot hier in de aflevering gebeurd?", short: "Deze aflevering", scope: "Van het begin tot nu" },
  { kind: "seizoen", label: "Wat is er tot hier in het seizoen gebeurd?", short: "Dit seizoen", scope: "Vorige afleveringen + nu" },
  { kind: "eerder", label: "Wat moet ik weten uit vorige afleveringen?", short: "Vorige afleveringen", scope: "Alles wat eraan voorafging" },
];
const MOVIE_QUESTIONS: Question[] = [
  { kind: "net", label: "Wat is er net gebeurd?", short: "Net gebeurd", scope: "Laatste 2 minuten" },
  { kind: "afl", label: "Wat is er tot hier in de film gebeurd?", short: "De film tot nu", scope: "Van het begin tot nu" },
  { kind: "wie", label: "Wie is wie tot nu toe?", short: "Wie is wie?", scope: "Personages en hun band" },
  { kind: "open", label: "Welke vragen staan nog open?", short: "Open vragen", scope: "Wat nog niet duidelijk is" },
];
const TONE: Record<QuickKind, string> = {
  net: "text-[var(--cinema-rose)] bg-[color-mix(in_srgb,var(--cinema-rose)_16%,transparent)]",
  afl: "text-[var(--cinema-butter)] bg-[color-mix(in_srgb,var(--cinema-butter)_16%,transparent)]",
  seizoen: "text-[var(--cinema-lavender)] bg-[color-mix(in_srgb,var(--cinema-lavender)_18%,transparent)]",
  eerder: "text-[var(--cinema-mint)] bg-[color-mix(in_srgb,var(--cinema-mint)_16%,transparent)]",
  wie: "text-[var(--cinema-lavender)] bg-[color-mix(in_srgb,var(--cinema-lavender)_18%,transparent)]",
  open: "text-[var(--cinema-mint)] bg-[color-mix(in_srgb,var(--cinema-mint)_16%,transparent)]",
};
const ERRORS: Record<string, string> = {
  "no-active-session": "Er speelt nu niets op de projector.",
  "title-unknown": "Ik weet nog niet welke titel er speelt. Open hem in Stremio op de projector; dat duurt soms een minuutje.",
  "no-subtitles": "Er zijn geen Engelse of Nederlandse ondertitels gevonden voor deze titel.",
  "subtitle-provider-unavailable": "De ondertitels zijn even niet bereikbaar. Probeer het zo opnieuw.",
  "no-dialogue": "Er is nog geen dialoog tot op dit moment.",
  "analysis-busy": "Die vraag wordt al beantwoord.",
  "hourly-limit": "De limiet van vragen per uur is bereikt.",
  "ai-not-configured": "De AI is nog niet ingesteld.",
  "ai-unavailable": "De AI is even niet bereikbaar. Probeer het zo opnieuw.",
  "invalid-ai-output": "Er ging iets mis met het antwoord. Probeer het opnieuw.",
  "scene-changed": "Je spoelde terug of de aflevering veranderde. Stel de vraag opnieuw.",
  "bridge-unavailable": "De Pi is niet bereikbaar, de projector kan nu niet bediend worden.",
  "projector-busy": "De projector is nog bezig met een vorige opdracht.",
  "database-busy": "X-Ray heeft het even te druk. Probeer het over een paar seconden opnieuw.",
  "invalid-audio": "De opname kon niet gelezen worden. Probeer het opnieuw.",
  "no-test-title": "Ik vond geen titel met ondertitels in je Stremio-lijst om mee te testen.",
};

/** Wat de Pi ziet als er niets live is (bridge ≥ 1.20.0). */
const BRIDGE_HINT: Record<BridgeStatus["stage"], string | null> = {
  "projector-off": "De Pi ziet de projector als uitgeschakeld.",
  "adb-failed": "De projector staat aan, maar de Pi kan hem niet uitlezen (ADB). Hij herstelt die verbinding zelf binnen enkele minuten.",
  "no-stremio-session": "De projector staat aan, maar de Pi ziet niets spelen in Stremio.",
  "publish-failed": "De Pi ziet Stremio spelen, maar kan het even niet doorsturen.",
  stremio: null,
};

const LENGTH_KEY = "xray-answer-length";
const LENGTH_OPTIONS = [{ value: "kort", label: "Kort" }, { value: "normaal", label: "Normaal" }, { value: "lang", label: "Lang" }] as const;
/** Keuze Kort · Normaal · Lang voor de antwoorden (segmentknop `tone="cinema"`, op het donkere doek). */
function LengthToggle({ x, className }: { x: X; className?: string }) {
  return <SegmentedControl options={LENGTH_OPTIONS} value={x.length} onChange={x.setLength} ariaLabel="Lengte van de antwoorden" tone="cinema" fill={false} className={className} />;
}

const icon = (path: React.ReactNode, size = 18, fill = false) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>
);
const ICONS = {
  net: <><path d="M11 7l-6 5 6 5V7zM19 7l-6 5 6 5V7z" /></>,
  afl: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M3 15h18M8 5v4M16 5v4M8 15v4M16 15v4" /></>,
  seizoen: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  eerder: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  wie: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.7-3.2 2.9-5 5.5-5s4.8 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.3.2 3.9 1.9 4.5 4.8" /></>,
  open: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9M12 16.6h.01" /></>,
  rewind: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  send: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  chev: <><path d="M9 6l6 6-6 6" /></>,
  play: <><path d="M8 5.5v13l11-6.5-11-6.5z" /></>,
  pause: <><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></>,
  stop: <><rect x="6" y="6" width="12" height="12" rx="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
};

/** Live projectorstatus (compact record, owner-only). Een korte hapering van de Pi (tot 60 s) telt nog als «live». */
export function useLivePlayback() {
  const { user } = db.useAuth();
  const q = db.useQuery(user ? { cinemaPlayback: { $: { where: { ownerId: user.id } } } } : null);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const playbacks = (q.data?.cinemaPlayback ?? []).map(r => parsePlayback(r.payload)).filter((p): p is Playback => !!p);
  const playback = playbacks.sort((a, b) => b.observedAt - a.observedAt)[0] ?? null;
  const fresh = !!playback && freshPlayback(playback, now) && playback.state !== "stopped";
  const lastFresh = React.useRef<{ session: string; at: number } | null>(null);
  if (fresh && playback) lastFresh.current = { session: playback.sessionId, at: now };
  const graced = !!playback && playback.state !== "stopped" && lastFresh.current?.session === playback.sessionId && now - lastFresh.current.at < 60_000;
  return { playback, live: fresh || graced, now, position: playback ? displayPosition(playback, now) : 0 };
}

/**
 * `testStart`: testmodus (gesimuleerde kijksessie van een willekeurige titel uit je Stremio-lijst, zie
 * `startXrayTest`). Dan komen titel en positie van de server i.p.v. de projector en raakt niets de Pi.
 */
function useXray(active: boolean, testStart = false) {
  const token = useGoogleAuthToken();
  const auth = db.useAuth();
  const signedOut = !auth.isLoading && !auth.user;
  const real = useLivePlayback();
  const [test, setTest] = React.useState(testStart);
  React.useEffect(() => { if (testStart) setTest(true); }, [testStart]);
  const [state, setState] = React.useState<XrayState | null>(null);
  const receivedAt = React.useRef(0);
  // Lengte van de antwoorden (Kort · Normaal · Lang), onthouden per toestel.
  const [length, setLengthState] = React.useState<XrayLength>(XRAY_LENGTH_DEFAULT);
  React.useEffect(() => { try { const v = localStorage.getItem(LENGTH_KEY); if (XRAY_LENGTHS.includes(v as XrayLength)) setLengthState(v as XrayLength); } catch { /* geen opslag */ } }, []);
  const setLength = (v: XrayLength) => { setLengthState(v); try { localStorage.setItem(LENGTH_KEY, v); } catch { /* geen opslag */ } };
  const testPlayback = test ? state?.playback ?? null : null;
  const playback = test ? testPlayback : real.playback;
  const live = test ? !!testPlayback : real.live;
  const now = real.now;
  const position = test
    ? testPlayback ? Math.min(testPlayback.durationMs, testPlayback.positionMs + (testPlayback.state === "playing" ? Math.max(0, now - receivedAt.current) : 0)) : 0
    : real.position;
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<XrayKind | null>(null);
  const [rewinding, setRewinding] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState<null | "play" | "pause" | "stop">(null);
  const [toast, setToast] = React.useState("");
  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/cinema/xray${test ? "?test=1" : ""}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      const v: XrayState = await r.json();
      if (!r.ok) return;
      receivedAt.current = Date.now();
      // Titel en cover nooit laten wegvallen door één mislukte herkenning tijdens dezelfde sessie.
      setState(prev => {
        const same = prev?.playback?.sessionId && prev.playback.sessionId === v.playback?.sessionId;
        return same ? { ...v, identity: v.identity ?? prev!.identity, info: v.info ?? prev!.info } : v;
      });
    } catch { /* volgende poging */ }
  }, [token, test]);
  const sessionKey = `${playback?.sessionId ?? ""}`;
  const jumpKey = playback ? Math.floor(playback.positionMs / 30_000) : 0;
  React.useEffect(() => { if (!active) return; void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 20_000); return () => clearInterval(t); }, [active, load, sessionKey]);
  // Terugspoelen of een andere aflevering: meteen opnieuw ophalen (antwoorden voorbij het nieuwe tijdstip verdwijnen).
  const lastJump = React.useRef(jumpKey);
  React.useEffect(() => { if (active && (jumpKey < lastJump.current || jumpKey > lastJump.current + 2)) void load(); lastJump.current = jumpKey; }, [active, jumpKey, load]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 5000); return () => clearTimeout(t); }, [toast]);
  // Optimistische play/pauze: wissel meteen het icoon, tot de projector de nieuwe toestand meldt.
  const state_ = playback?.state;
  React.useEffect(() => { setPending(p => (p === "play" && state_ === "playing") || (p === "pause" && state_ === "paused") ? null : p); }, [state_]);
  React.useEffect(() => { if (!pending) return; const t = setTimeout(() => setPending(null), 12_000); return () => clearTimeout(t); }, [pending]);

  const post = async (body: object) => {
    const r = await fetch("/api/cinema/xray", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(test ? { ...body, test: true } : body) });
    const v = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(typeof v.error === "string" ? v.error : "xray-unavailable");
    return v;
  };
  const fail = (e: unknown, fallback: string) => setError(ERRORS[e instanceof Error ? e.message : ""] ?? fallback);
  const ask = async (kind: XrayKind, question?: string) => {
    if (busy) return;
    setBusy(kind); setError("");
    try {
      const m: XrayMessage = await post({ action: "ask", kind, question, length });
      setState(s => s ? { ...s, messages: [...s.messages.filter(x => x.id !== m.id), m] } : s);
    } catch (e) { fail(e, "X-Ray is even niet bereikbaar."); }
    finally { setBusy(null); }
  };
  const rewind = async (minutes: number) => {
    if (rewinding) return;
    setRewinding(minutes); setError("");
    try { await post({ action: "rewind", minutes }); setToast(test ? `Test: ${minutes} min terug` : `Stremio springt ${minutes} min terug`); if (test) void load(); }
    catch (e) { fail(e, "Terugspoelen lukte niet."); }
    finally { setTimeout(() => setRewinding(null), 2500); }
  };
  const playing = pending === "play" ? true : pending === "pause" ? false : playback?.state === "playing";
  const playPause = async () => {
    if (pending) return;
    setPending(playing ? "pause" : "play"); setError("");
    try { await post({ action: "play-pause" }); if (test) void load(); }
    catch (e) { setPending(null); fail(e, "Pauzeren lukte niet."); }
  };
  const stop = async () => {
    setPending("stop"); setError("");
    try {
      await post({ action: "stop" });
      if (test) { setTest(false); setState(null); setPending(null); return; }
      setToast("Bioscoop stopt: scherm omlaag, projector uit");
    }
    catch (e) { setPending(null); fail(e, "Stoppen lukte niet."); }
  };
  const transcribe = async (audio: string) => {
    try { return String((await post({ action: "transcribe", audio, hint: state?.info?.name ?? "" })).text ?? ""); }
    catch (e) { throw new Error(ERRORS[e instanceof Error ? e.message : ""] ?? "Omzetten naar tekst lukte niet. Probeer het opnieuw."); }
  };
  const [starting, setStarting] = React.useState(false);
  /** Testmodus starten, of in de testmodus een andere willekeurige titel kiezen. */
  const startTest = async () => {
    if (starting || !token) return;
    setStarting(true); setError("");
    try {
      const r = await fetch("/api/cinema/xray", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ action: "test-start" }) });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof v.error === "string" ? v.error : "xray-unavailable");
      receivedAt.current = Date.now();
      setTest(true); setState(v as XrayState); setPending(null);
    } catch (e) { fail(e, "De testmodus kon niet starten."); }
    finally { setStarting(false); }
  };
  // Testmodus via het adres (`?test=1`) zonder lopende test: meteen een titel kiezen.
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (!test || !token || autoStarted.current) return;
    autoStarted.current = true;
    void (async () => {
      const r = await fetch("/api/cinema/xray?test=1", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
      const v: XrayState | null = r?.ok ? await r.json() : null;
      if (v?.playback) { receivedAt.current = Date.now(); setState(v); } else void startTest();
    })();
  }, [test, token]); // eslint-disable-line react-hooks/exhaustive-deps
  return { state, playback, live, now, position, error, busy, rewinding, toast, playing, pending, ask, rewind, playPause, stop, setError, transcribe, test, starting, startTest, signedOut, length, setLength };
}

type X = ReturnType<typeof useXray>;

function Progress({ position, duration, className }: { position: number; duration: number; className?: string }) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : null;
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-fixed-white/20", className)} role="progressbar" aria-label="Voortgang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
      {pct !== null && <div className="h-full rounded-full bg-[var(--cinema-velvet)]" style={{ width: `${pct}%` }} />}
    </div>
  );
}

/** Testmodus: gele pil + «Andere titel» (kiest een nieuwe willekeurige titel). */
function TestPill({ x }: { x: X }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--cinema-screen)_55%,transparent)] px-2.5 text-[12px] font-bold text-[var(--cinema-butter)] backdrop-blur-md">
        <span className="size-[7px] rounded-full bg-[var(--cinema-butter)]" aria-hidden />TESTMODUS
      </span>
      <button type="button" onClick={() => void x.startTest()} disabled={x.starting}
        className={cn(glassPill, "h-[30px] bg-[color-mix(in_srgb,var(--cinema-screen)_72%,transparent)] px-3 text-[12.5px] font-bold [@media(hover:hover)]:hover:bg-[color-mix(in_srgb,var(--cinema-screen)_86%,transparent)]")}>
        {icon(<><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>, 14)}{x.starting ? "Even zoeken…" : "Andere titel"}
      </button>
    </span>
  );
}

function LivePill() {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--cinema-screen)_55%,transparent)] px-2.5 text-[12px] font-bold text-[var(--cinema-rose)] backdrop-blur-md">
      <span className="size-[7px] rounded-full bg-[var(--cinema-velvet)]" aria-hidden />NU OP DE PROJECTOR
    </span>
  );
}

const glassPill = "inline-flex items-center justify-center gap-1.5 rounded-full text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-md transition-colors disabled:opacity-60";

/** Terug: duidelijke glazen pil met pijl en tekst, op dezelfde donkere glaslaag als de panelen (leesbaar op elke cover). */
function BackPill({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} aria-label="Terug"
      className={cn(glassPill, "h-11 bg-[color-mix(in_srgb,var(--cinema-screen)_72%,transparent)] pl-3 pr-4 text-[14px] font-bold [@media(hover:hover)]:hover:bg-[color-mix(in_srgb,var(--cinema-screen)_86%,transparent)]")}>
      {icon(<path d="M15 6l-6 6 6 6" />, 18)}Terug
    </button>
  );
}

function PlayButton({ x, size = 64 }: { x: X; size?: number }) {
  return (
    <button type="button" onClick={() => void x.playPause()} disabled={x.pending === "stop"} aria-label={x.playing ? "Pauzeren" : "Verder spelen"}
      className="flex shrink-0 items-center justify-center rounded-full bg-fixed-white text-[var(--cinema-screen)] shadow-[0_14px_30px_-12px_rgba(0,0,0,.6)] transition-transform motion-safe:active:scale-95 disabled:opacity-60"
      style={{ width: size, height: size }}>
      {icon(x.playing ? ICONS.pause : ICONS.play, Math.round(size * 0.42), true)}
    </button>
  );
}

function RewindButtons({ x, stretch }: { x: X; stretch?: boolean }) {
  return (
    <>
      {[1, 2, 5].map(m => (
        <button key={m} type="button" aria-label={`${m} minuut terug in Stremio`} disabled={!!x.rewinding} onClick={() => void x.rewind(m)}
          className={cn(glassPill, "h-11 whitespace-nowrap px-4 text-[14px] font-bold", x.rewinding === m ? "bg-fixed-white !text-[var(--cinema-screen)]" : "bg-fixed-white/[0.12] [@media(hover:hover)]:hover:bg-fixed-white/20", stretch && "flex-1 px-2")}>
          {icon(ICONS.rewind, 16)}{m} min
        </button>
      ))}
    </>
  );
}

/** «Stop» = hele bioscoop af. Eerst bevestigen: dit brengt het scherm omlaag en zet de projector uit. */
function StopButton({ x, compact, stacked }: { x: X; compact?: boolean; stacked?: boolean }) {
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 6000); return () => clearTimeout(t); }, [confirm]);
  if (x.pending === "stop") return <span className={cn(glassPill, "h-11 bg-fixed-white/[0.12] px-4 text-[14px] font-bold")}>Stoppen…</span>;
  return confirm ? (
    <span className={cn("inline-flex items-center gap-1.5", stacked && "flex-col items-stretch")}>
      <button type="button" onClick={() => { setConfirm(false); void x.stop(); }} className={cn(glassPill, "h-11 bg-[var(--cinema-velvet)] px-4 text-[14px] font-extrabold shadow-none")}>
        {icon(ICONS.stop, 15, true)}{compact ? "Stop" : "Ja, stop alles"}
      </button>
      <button type="button" onClick={() => setConfirm(false)} className={cn(glassPill, "h-11 bg-fixed-white/[0.12] px-3.5 text-[14px] font-bold")}>Annuleer</button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} aria-label="Bioscoop stoppen: scherm omlaag, projector uit" className={cn(glassPill, "h-11 bg-fixed-white/[0.12] px-4 text-[14px] font-bold [@media(hover:hover)]:hover:bg-fixed-white/20")}>
      {icon(ICONS.stop, 15, true)}Stop
    </button>
  );
}

function Message({ m }: { m: XrayMessage }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-w-[86%] flex-col items-end gap-1 self-end">
        <div className="rounded-[18px_18px_6px_18px] bg-[var(--cinema-lavender)] px-3.5 py-2.5 text-[14.5px] font-semibold leading-[1.4] text-[var(--cinema-screen)]">{m.question}</div>
        <span className="text-[11px] font-semibold text-fixed-white/50">Vraag op {clockTime(m.askedAtMs)}</span>
      </div>
      <div className="flex max-w-[94%] flex-col gap-1.5 self-start">
        <div className="whitespace-pre-line rounded-[18px_18px_18px_6px] bg-fixed-white/10 px-3.5 py-3 text-[14.5px] leading-[1.5] text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">{m.answer}</div>
        {m.refs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.refs.map(r => <span key={r.label} className="inline-flex h-[22px] items-center rounded-full bg-[color-mix(in_srgb,var(--cinema-butter)_16%,transparent)] px-2 text-[11px] font-bold text-[var(--cinema-butter)]">{r.label}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Vraagveld met microfoon: spreek je vraag in (Nederlands of Engels), de tekst komt in het veld en je verstuurt zelf. */
function ChatInput({ x, id, floating }: { x: X; id: string; floating?: boolean }) {
  const [text, setText] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const dictation = useDictation({
    onText: (t, final) => { setText(t.slice(0, 600)); if (final) x.setError(""); },
    onError: message => x.setError(message),
    transcribe: x.transcribe,
  });
  const live = dictation.status !== "idle";
  const send = () => { const q = text.trim(); if (!q || x.busy || live) return; setText(""); void x.ask("vraag", q); };
  const placeholder = dictation.status === "transcribing" ? "Even omzetten…" : live ? "Ik luister… stel je vraag" : "Vraag iets over wat je zag…";
  return (
    <form onSubmit={e => { e.preventDefault(); send(); }}
      className={cn("flex h-[52px] shrink-0 items-center gap-2 pl-4 pr-[7px]",
        floating
          ? "rounded-full bg-[color-mix(in_srgb,var(--cinema-screen)_45%,transparent)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2),0_20px_40px_-18px_rgba(0,0,0,0.7)] backdrop-blur-[18px] backdrop-saturate-[1.2]"
          : "rounded-2xl bg-fixed-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]")}>
      <label htmlFor={id} className="sr-only">Vraag iets over wat je zag</label>
      <input ref={input} id={id} value={text} onChange={e => setText(e.target.value)} maxLength={600} placeholder={placeholder} enterKeyHint="send" readOnly={live}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-fixed-white outline-none placeholder:text-fixed-white/50" />
      {dictation.supported && dictation.chooseLang && !text && !live && (
        <button type="button" onClick={() => dictation.setLang(dictation.lang === "nl" ? "en" : "nl")}
          aria-label={`Taal van de microfoon: ${dictation.lang === "nl" ? "Nederlands" : "Engels"}. Tik om te wisselen.`}
          className="h-[28px] shrink-0 rounded-full bg-fixed-white/10 px-2.5 text-[12px] font-bold tracking-wide text-fixed-white/75 [@media(hover:hover)]:hover:bg-fixed-white/20">
          {dictation.lang === "nl" ? "NL" : "EN"}
        </button>
      )}
      {dictation.supported && (
        <button type="button" onClick={() => live ? dictation.stop() : dictation.start()} disabled={dictation.status === "transcribing" || !!x.busy}
          aria-label={dictation.status === "transcribing" ? "Bezig met omzetten" : live ? "Stoppen met luisteren" : "Vraag inspreken"} aria-pressed={live}
          className={cn("relative flex size-[38px] shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60",
            live ? "bg-[var(--cinema-rose)] text-[var(--cinema-screen)]" : "bg-fixed-white/15 text-fixed-white [@media(hover:hover)]:hover:bg-fixed-white/20")}>
          {dictation.status === "listening" && <span className="absolute inset-0 rounded-full bg-[var(--cinema-rose)] opacity-50 motion-safe:animate-ping" aria-hidden />}
          {dictation.status === "recording" && <span className="absolute inset-0 rounded-full bg-[var(--cinema-rose)] opacity-40 transition-transform duration-100 motion-reduce:hidden" style={{ transform: `scale(${1 + dictation.level * 0.6})` }} aria-hidden />}
          {dictation.status === "transcribing"
            ? <span className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />
            : <span className="relative">{icon(live ? ICONS.stop : ICONS.mic, live ? 14 : 18, live)}</span>}
        </button>
      )}
      <button type="submit" aria-label="Vraag versturen" disabled={!text.trim() || !!x.busy || live}
        className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--cinema-lavender)] text-[var(--cinema-screen)] disabled:opacity-40">{icon(ICONS.send)}</button>
    </form>
  );
}

function Conversation({ x, className, hint = true }: { x: X; className?: string; hint?: boolean }) {
  const end = React.useRef<HTMLDivElement>(null);
  const messages = x.state?.messages ?? [];
  React.useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length, x.busy]);
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain", className)} aria-live="polite">
      <div className="mt-auto" />
      {hint && messages.length === 0 && !x.busy && !x.error && (
        <p className="self-center px-4 text-center text-[14px] leading-[1.5] text-fixed-white/55">Kies een snelle vraag of typ zelf iets over wat je zag. X-Ray kent enkel wat tot nu toe gebeurde.</p>
      )}
      {x.state && x.state.hidden > 0 && (
        <p className="self-center text-center text-[12px] font-semibold text-fixed-white/55">{x.state.hidden} {x.state.hidden === 1 ? "antwoord gaat" : "antwoorden gaan"} over later in het verhaal en {x.state.hidden === 1 ? "is" : "zijn"} even verborgen</p>
      )}
      {messages.map(m => <Message key={m.id} m={m} />)}
      {x.busy && <div className="self-start rounded-[18px_18px_18px_6px] bg-fixed-white/10 px-4 py-3 text-[14px] text-fixed-white/70">X-Ray denkt na…</div>}
      {x.error && <p className="self-start text-[13.5px] font-semibold text-[var(--cinema-rose)]">{x.error}</p>}
      <div ref={end} />
    </div>
  );
}

function titleLines(x: X) {
  const id = x.state?.identity, info = x.state?.info, p = x.playback;
  const title = info?.name ?? id?.title ?? p?.title ?? "Stremio";
  const eyebrow = id?.type === "series" && id.season && id.episode ? `S${id.season} · A${id.episode}${info?.episodeTitle ? ` · ${info.episodeTitle}` : ""}` : id ? "Film" : "Wordt herkend…";
  return { title, eyebrow };
}
const questionsFor = (x: X) => (x.state?.identity?.type === "movie" ? MOVIE_QUESTIONS : SERIES_QUESTIONS);

function Toast({ x }: { x: X }) {
  if (!x.toast) return null;
  return <div role="status" className="absolute left-1/2 top-[calc(20px+env(safe-area-inset-top,0px))] z-10 -translate-x-1/2 rounded-full bg-fixed-white px-4 py-2.5 text-[14px] font-bold text-[var(--cinema-screen)] shadow-[0_14px_30px_-12px_rgba(16,17,48,.6)]">{x.toast}</div>;
}

/** Cover van TMDB, volledig en zonder vervaging. Blijft staan zolang de sessie loopt (zie useXray). */
function CoverImage({ src, className }: { src: string | null | undefined; className?: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden decoding="async" className={className} />;
}

/** Rookglas van canvas «XD · 3 Hoeken»: weinig tint en veel vervaging, zodat de cover doorschijnt. */
const smokeGlass = "bg-[color-mix(in_srgb,var(--cinema-screen)_38%,transparent)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_24px_50px_-20px_rgba(0,0,0,0.65)] backdrop-blur-[18px] backdrop-saturate-[1.2]";

/** Cast van wat er speelt (TMDB): de aflevering (vaste cast + gasten) of de film. */
function useXrayCast(x: X): CastMember[] {
  const info = x.state?.info, id = x.state?.identity;
  const tmdbId = info?.tmdbId ?? null;
  const url = !tmdbId || !id ? null
    : id.type === "series" ? (id.season && id.episode ? `/api/films/episode?id=${tmdbId}&season=${id.season}&episode=${id.episode}` : `/api/films/cast?type=tv&id=${tmdbId}`)
    : `/api/films/cast?type=movie&id=${tmdbId}`;
  const [cast, setCast] = React.useState<{ url: string; cast: CastMember[] } | null>(null);
  React.useEffect(() => {
    if (!url || cast?.url === url) return;
    let alive = true;
    fetch(url).then(r => (r.ok ? r.json() : null)).then((v: { cast?: CastMember[] } | null) => {
      if (alive && Array.isArray(v?.cast)) setCast({ url, cast: v.cast.filter(c => c?.name).slice(0, 80) });
    }).catch(() => {});
    return () => { alive = false; };
  }, [url, cast?.url]);
  return cast?.url === url ? cast.cast : [];
}

function CastFace({ c, size = 64 }: { c: CastMember; size?: number }) {
  return (
    <div className="flex w-[96px] flex-col items-center text-center">
      <span className="block shrink-0 overflow-hidden rounded-full bg-fixed-white/10 shadow-[0_0_0_2px_rgba(255,255,255,0.18)]" style={{ width: size, height: size }}>
        {c.profileUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.profileUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-[22px] font-extrabold text-fixed-white/70">{c.name.charAt(0)}</span>}
      </span>
      <b className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-4">{c.name}</b>
      {c.character && <span className="line-clamp-2 text-[12px] font-semibold leading-[15px] text-fixed-white/70">{c.character}</span>}
    </div>
  );
}

/** Ronde knoppen rechtsboven in het bedieningspaneel: pauze (wit) en stop (glas), even groot. Stop vraagt eerst bevestiging. */
function RoundControls({ x, onStop }: { x: X; onStop: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <PlayButton x={x} size={44} />
      <button type="button" onClick={onStop} disabled={x.pending === "stop"} aria-label="Bioscoop stoppen: scherm omlaag, projector uit"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fixed-white/15 text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-colors disabled:opacity-60 [@media(hover:hover)]:hover:bg-fixed-white/25">
        {x.pending === "stop" ? <span className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden /> : icon(ICONS.stop, 16, true)}
      </button>
    </div>
  );
}

/** Dikkere voortgangsbalk met bolletje (canvas «XD»). */
function ProgressKnob({ position, duration }: { position: number; duration: number }) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : null;
  return (
    <div className="relative mt-4 h-1.5 rounded-full bg-fixed-white/20" role="progressbar" aria-label="Voortgang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
      {pct !== null && <>
        <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--cinema-velvet)]" style={{ width: `${pct}%` }} />
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fixed-white shadow-[0_1px_6px_rgba(0,0,0,0.4)]" style={{ left: `${pct}%` }} aria-hidden />
      </>}
    </div>
  );
}

/** Alle acteurs van wat er speelt, als glazen raster boven de cover. */
function CastOverlay({ cast, onClose }: { cast: CastMember[]; onClose: () => void }) {
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Alle acteurs" className="absolute inset-0 z-20 flex flex-col bg-[color-mix(in_srgb,var(--cinema-screen)_55%,transparent)] px-[max(24px,env(safe-area-inset-left,0px))] pb-[max(24px,env(safe-area-inset-bottom,0px))] pt-[max(24px,env(safe-area-inset-top,0px))] backdrop-blur-[22px]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Sluiten" className={cn(glassPill, "size-11 bg-fixed-white/15")}>{icon(<path d="M15 6l-6 6 6 6" />, 18)}</button>
        <h2 className="text-[28px] font-extrabold tracking-[-.02em]">Alle acteurs</h2>
        <span className="rounded-full bg-fixed-white/15 px-2.5 py-0.5 text-[14px] font-extrabold">{cast.length}</span>
      </div>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-x-3 gap-y-6 overflow-y-auto overscroll-contain pb-4">
        {cast.map(c => <div key={`${c.name}-${c.character}`} className="flex justify-center"><CastFace c={c} size={84} /></div>)}
      </div>
    </div>
  );
}

/**
 * Tablet en desktop: canvas «XD · 3 Hoeken». Elk blok in zijn eigen hoek in rookglas, het midden blijft beeld:
 * bediening linksboven (pauze + stop rechtsboven, 1 · 2 · 5 min), cast linksonder met «Alle n», vragen rechtsonder
 * (meteen een vraagveld met microfoon, snelle vragen erboven; het gesprek verschijnt erboven zodra er een is).
 */
export function XrayTablet({ x, onBack }: { x: X; onBack: () => void }) {
  const p = x.playback, { title, eyebrow } = titleLines(x);
  const cast = useXrayCast(x);
  const [allCast, setAllCast] = React.useState(false);
  const [confirmStop, setConfirmStop] = React.useState(false);
  React.useEffect(() => { if (!confirmStop) return; const t = setTimeout(() => setConfirmStop(false), 6000); return () => clearTimeout(t); }, [confirmStop]);
  const hasConversation = (x.state?.messages.length ?? 0) > 0 || !!x.busy || !!x.error || (x.state?.hidden ?? 0) > 0;
  const inset = "px-[max(24px,env(safe-area-inset-left,0px))] pb-[max(24px,env(safe-area-inset-bottom,0px))] pt-[max(24px,env(safe-area-inset-top,0px))] pr-[max(24px,env(safe-area-inset-right,0px))]";
  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--cinema-screen)] text-fixed-white">
      <CoverImage src={x.state?.info?.backdrop} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <Toast x={x} />
      <div className={cn("relative grid h-full grid-cols-[minmax(0,400px)_1fr_minmax(0,440px)] grid-rows-[auto_1fr] gap-4", inset)}>
        {/* Linksboven: terug + bediening */}
        <div className="col-start-1 row-start-1 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <BackPill onBack={onBack} />
            {x.test ? <TestPill x={x} /> : <LivePill />}
          </div>
          <section aria-label="Bediening" className={cn("rounded-[22px] px-[18px] pb-4 pt-4", smokeGlass)}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11.5px] font-extrabold uppercase tracking-[.12em] text-[var(--cinema-rose)]">{eyebrow}</div>
                <h1 className="mt-1 line-clamp-2 text-[28px] font-extrabold leading-8 tracking-[-.02em] [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">{title}</h1>
              </div>
              <RoundControls x={x} onStop={() => setConfirmStop(true)} />
            </div>
            {p && <>
              <ProgressKnob position={x.position} duration={p.durationMs} />
              <div className="mt-2 flex justify-between text-[12px] font-bold tabular-nums text-fixed-white/70">
                <span>{clockTime(x.position)}</span>
                {p.durationMs > 0 && <span>nog {clockTime(p.durationMs - x.position)}</span>}
              </div>
            </>}
            {confirmStop ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="mr-auto min-w-0 text-[13px] font-bold leading-4 text-fixed-white/85">Scherm omlaag, projector uit?</span>
                <button type="button" onClick={() => setConfirmStop(false)} className={cn(glassPill, "h-9 shrink-0 whitespace-nowrap bg-fixed-white/15 px-3 text-[13px] font-bold")}>Annuleer</button>
                <button type="button" onClick={() => { setConfirmStop(false); void x.stop(); }} className={cn(glassPill, "h-9 shrink-0 whitespace-nowrap bg-[var(--cinema-velvet)] px-3 text-[13px] font-extrabold shadow-none")}>{icon(ICONS.stop, 13, true)}Stop</button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2"><RewindButtons x={x} stretch /></div>
            )}
          </section>
        </div>

        {/* Linksonder: cast van wat er speelt, met «Alle n» */}
        {cast.length > 0 && (
          <section aria-label="Cast" className={cn("col-start-1 row-start-2 self-end justify-self-start rounded-[22px] p-4", smokeGlass, "w-[min(100%,330px)]")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-extrabold">Cast</h2>
              <button type="button" onClick={() => setAllCast(true)} className={cn(glassPill, "h-[30px] gap-0.5 bg-fixed-white/15 pl-3 pr-2 text-[12.5px] font-extrabold [@media(hover:hover)]:hover:bg-fixed-white/25")}>
                Alle {cast.length}{icon(ICONS.chev, 15)}
              </button>
            </div>
            <div className="flex gap-1">{cast.slice(0, 3).map(c => <CastFace key={`${c.name}-${c.character}`} c={c} />)}</div>
          </section>
        )}

        {/* Rechtsonder: vragen, meteen met vraagveld en microfoon */}
        <section aria-label="Vraag het X-Ray" className="col-start-3 row-span-2 row-start-1 flex min-h-0 flex-col justify-end gap-2.5">
          {hasConversation && (
            <div className={cn("flex min-h-0 flex-col gap-3 rounded-[22px] p-4", smokeGlass)}>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-extrabold">X-Ray</h2>
                <LengthToggle x={x} className="ml-auto" />
              </div>
              <Conversation x={x} hint={false} />
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-1.5">
            {questionsFor(x).map(q => (
              <button key={q.kind} type="button" disabled={!!x.busy} onClick={() => void x.ask(q.kind)}
                className={cn(glassPill, "h-[34px] bg-[color-mix(in_srgb,var(--cinema-screen)_40%,transparent)] px-3 text-[13px] font-bold backdrop-blur-[16px] [@media(hover:hover)]:hover:bg-[color-mix(in_srgb,var(--cinema-screen)_60%,transparent)]")}>
                {icon(ICONS[q.kind], 14)}{x.busy === q.kind ? "Even denken…" : q.short}
              </button>
            ))}
          </div>
          <ChatInput x={x} id="xray-tablet-vraag" floating />
        </section>
      </div>
      {allCast && <CastOverlay cast={cast} onClose={() => setAllCast(false)} />}
    </div>
  );
}

/** Gsm: canvas «X-Ray · gsm · variant 4 Ladder van kort naar lang». Cover volledig bovenaan (16:9). */
export function XrayPhone({ x, onBack }: { x: X; onBack: () => void }) {
  const p = x.playback, { title, eyebrow } = titleLines(x);
  const hasMessages = (x.state?.messages.length ?? 0) > 0 || !!x.busy;
  const qs = questionsFor(x);
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--cinema-screen)] text-fixed-white">
      <Toast x={x} />
      <div className="relative w-full pt-[env(safe-area-inset-top,0px)]">
        <div className="relative aspect-video w-full overflow-hidden bg-fixed-white/5">
          <CoverImage src={x.state?.info?.backdrop} className="h-full w-full object-cover" />
          <div className="absolute inset-x-4 top-3 flex items-center gap-2.5">
            <BackPill onBack={onBack} />
            {x.test ? <TestPill x={x} /> : <LivePill />}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4">
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-extrabold uppercase tracking-[.08em] text-[var(--cinema-rose)]">{eyebrow}</div>
          <h1 className="text-[30px] font-extrabold leading-none tracking-[-.02em]">{title}</h1>
          {p && (
            <div className="flex items-center gap-2.5 text-[13px] font-bold">
              <span>{clockTime(x.position)}</span>
              <Progress position={x.position} duration={p.durationMs} className="flex-1" />
              {p.durationMs > 0 && <span className="whitespace-nowrap text-fixed-white/60">nog {clockTime(p.durationMs - x.position)}</span>}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5 [&>button:not(:first-child)]:px-1 [&>button:not(:first-child)]:text-[13px]">
            <PlayButton x={x} size={52} />
            <RewindButtons x={x} stretch />
          </div>
          <div className="flex justify-end"><StopButton x={x} compact /></div>
        </div>
        {hasMessages ? (
          <div className="-mr-4 flex gap-2 overflow-x-auto pr-4 [scrollbar-width:none]">
            {qs.map(q => (
              <button key={q.kind} type="button" disabled={!!x.busy} onClick={() => void x.ask(q.kind)}
                className={cn(glassPill, "h-9 shrink-0 bg-fixed-white/10 px-3 text-[13px] font-bold")}>
                {icon(ICONS[q.kind], 15)}{q.short}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-extrabold tracking-[.06em] text-fixed-white/55">HOE VER TERUG?</h2>
              <span className="text-[12px] font-semibold text-fixed-white/45">van kort naar lang</span>
            </div>
            <ol className="flex flex-col gap-1.5 rounded-[20px] bg-fixed-white/5 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
              {qs.map((q, i) => (
                <li key={q.kind} className="relative">
                  {i < qs.length - 1 && <span className="absolute bottom-[-14px] left-[17px] top-[44px] w-0.5 bg-fixed-white/15" aria-hidden />}
                  <button type="button" disabled={!!x.busy} onClick={() => void x.ask(q.kind)} className="flex w-full items-center gap-3.5 py-1.5 text-left disabled:opacity-60">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]", TONE[q.kind])}>{icon(ICONS[q.kind], 17)}</span>
                    <span className="flex flex-1 flex-col gap-0.5"><span className="text-[15px] font-bold leading-tight">{q.short}</span><span className="text-[12px] font-semibold text-fixed-white/55">{q.scope}</span></span>
                    <span className="text-fixed-white/45">{icon(ICONS.chev, 16)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <Conversation x={x} className={hasMessages ? "" : "flex-none"} hint={false} />
        <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold tracking-[.06em] text-fixed-white/55">ANTWOORD</span>
            <LengthToggle x={x} />
          </div>
          <ChatInput x={x} id="xray-gsm-vraag" />
        </div>
      </div>
    </div>
  );
}

/** Enkel in development (`?demo=1`): duidelijk fictief voorbeeld om de schermen te bekijken zonder projector. */
function useDemo(x: X, on: boolean, movie: boolean): X {
  const [chat, setChat] = React.useState(false);
  const [playing, setPlaying] = React.useState(true);
  if (!on) return x;
  const now = Date.now();
  const playback: Playback = { sessionId: "demo-session-01", sequence: 1, mediaKey: "demo", streamFingerprint: "0".repeat(64), imdbId: null, mediaType: movie ? "movie" : "series", season: movie ? null : 2, episode: movie ? null : 4, title: "Vuurtoren", positionMs: 1_425_000, durationMs: 2_890_000, speed: 1, state: playing ? "playing" : "paused", observedAt: now, uncertaintyMs: 1500, deviceUpdateElapsedMs: null };
  const messages: XrayMessage[] = chat ? [
    { id: "d1", videoId: "demo", kind: "net", question: "Wat is er net gebeurd?", answer: "Voorbeeld: Lotte vindt in de kelder het logboek van haar vader en verstopt het voor Jonas.", refs: [{ label: "21:40", timeMs: 1_300_000 }, { label: "23:10", timeMs: 1_390_000 }], askedAtMs: 1_400_000, contextEndMs: 1_400_000, createdAt: now, costUsd: 0.0006, model: "demo" },
  ] : [];
  return { ...x, playback, live: true, position: 1_425_000, now, playing, pending: null,
    state: { playback, live: true, identity: { imdbId: "tt0000000", type: movie ? "movie" : "series", season: movie ? null : 2, episode: movie ? null : 4, videoId: "demo", title: "Vuurtoren", source: "stremio" },
      // tmdbId: echte cast in de demo (series: Slow Horses, film: Oppenheimer), enkel om de castpanelen te bekijken.
      info: { tmdbId: movie ? 872585 : 95480, name: "Vuurtoren (voorbeeld)", backdrop: "/images/films/cinema_velvet_1920.webp", poster: null, episodeTitle: movie ? null : "Laag water" }, messages, hidden: 0, aiConfigured: true },
    ask: async () => setChat(true), rewind: async () => {}, playPause: async () => setPlaying(v => !v), stop: async () => {} };
}

/** Volledige X-Ray-pagina (`/films-series/nu-kijken`): A2 vanaf tablet, ladder op gsm. */
export function XrayPage({ onBack }: { onBack: () => void }) {
  const [demo, setDemo] = React.useState<null | "series" | "movie">(null);
  const [testFromUrl, setTestFromUrl] = React.useState(false);
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    setTestFromUrl(params.get("test") === "1");
    if (process.env.NODE_ENV !== "development") return;
    const v = params.get("demo");
    setDemo(v === "1" ? "series" : v === "film" ? "movie" : null);
  }, []);
  const x = useDemo(useXray(!demo, testFromUrl), !!demo, demo === "movie");
  if (x.test && !x.playback) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--cinema-screen)] px-6 text-center text-fixed-white">
        {x.error || x.signedOut
          ? <><p className="max-w-[340px] text-[15px] text-fixed-white/75">{x.signedOut ? "Log eerst in om de testmodus te gebruiken." : x.error}</p><button type="button" onClick={onBack} className="h-[42px] rounded-full bg-fixed-white px-5 text-[15px] font-bold text-[var(--cinema-screen)]">Terug</button></>
          : <><span className="size-8 rounded-full border-[3px] border-fixed-white/80 border-t-transparent motion-safe:animate-spin" aria-hidden /><p className="text-[15px] text-fixed-white/70">Testmodus: een titel uit je Stremio-lijst kiezen…</p></>}
      </div>
    );
  }
  if (!x.live && !x.playback) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--cinema-screen)] px-6 text-center text-fixed-white">
        <h1 className="text-[22px] font-extrabold">Er speelt nu niets op de projector</h1>
        <p className="max-w-[340px] text-[15px] text-fixed-white/65">Start een film of aflevering in Stremio; X-Ray verschijnt dan vanzelf.</p>
        {x.state?.bridge && BRIDGE_HINT[x.state.bridge.stage] && (
          <p className="max-w-[360px] rounded-2xl bg-fixed-white/10 px-4 py-3 text-[13.5px] font-semibold text-fixed-white/80">{BRIDGE_HINT[x.state.bridge.stage]}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={onBack} className="h-[42px] rounded-full bg-fixed-white px-5 text-[15px] font-bold text-[var(--cinema-screen)]">Terug</button>
          <button type="button" onClick={() => void x.startTest()} disabled={x.starting}
            className="h-[42px] rounded-full bg-fixed-white/10 px-5 text-[15px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] disabled:opacity-60">
            {x.starting ? "Titel kiezen…" : "Testmodus"}
          </button>
        </div>
        {x.error && <p className="max-w-[340px] text-[13.5px] font-semibold text-[var(--cinema-rose)]">{x.error}</p>}
      </div>
    );
  }
  return (
    <>
      <div className="md:hidden"><XrayPhone x={x} onBack={onBack} /></div>
      <div className="hidden h-dvh md:block"><XrayTablet x={x} onBack={onBack} /></div>
    </>
  );
}

/** Tablet-dashboard: tijdens het afspelen schermvullend X-Ray. «Terug» verbergt het tot de volgende titel. */
export function XrayDashboardOverlay() {
  const { playback, live } = useLivePlayback();
  const [dismissed, setDismissed] = React.useState<string | null>(null);
  const show = live && !!playback && playback.state !== "unknown" && dismissed !== playback.sessionId;
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] hidden h-dvh md:block">
      <XrayDashboardInner onBack={() => setDismissed(playback!.sessionId)} />
    </div>
  );
}
function XrayDashboardInner({ onBack }: { onBack: () => void }) {
  const x = useXray(true);
  return <XrayTablet x={x} onBack={onBack} />;
}

/** Gsm-startpagina: banner tijdens het afspelen die naar de volledige X-Ray-pagina leidt. */
export function XrayHomeBanner({ className }: { className?: string }) {
  const { playback, live, position } = useLivePlayback();
  const token = useGoogleAuthToken();
  const [info, setInfo] = React.useState<{ session: string; title: string; eyebrow: string; backdrop: string | null } | null>(null);
  const session = playback?.sessionId;
  React.useEffect(() => {
    if (!live || !token || !session || info?.session === session) return;
    let gone = false;
    void fetch("/api/cinema/xray", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).then(r => r.ok ? r.json() : null).then((v: XrayState | null) => {
      if (gone || !v?.identity) return;
      const id = v.identity;
      setInfo({ session, title: v.info?.name ?? id.title, eyebrow: id.type === "series" && id.season && id.episode ? `S${id.season} · A${id.episode}` : "Film", backdrop: v.info?.backdrop ?? null });
    }).catch(() => {});
    return () => { gone = true; };
  }, [live, token, session, info?.session]);
  if (!live || !playback) return null;
  const known = info?.session === session ? info : null;
  return (
    <Link href="/films-series/nu-kijken" className={cn("relative flex h-[104px] items-center gap-3 overflow-hidden rounded-[20px] bg-[var(--cinema-screen)] pl-4 pr-3.5 text-fixed-white", className)}>
      {known?.backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={known.backdrop} alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-[46%] object-cover" />
      )}
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5"><span className="size-[7px] rounded-full bg-[var(--cinema-velvet)]" aria-hidden /><span className="text-[11px] font-extrabold tracking-[.08em] text-[var(--cinema-rose)]">NU OP DE PROJECTOR</span></span>
        <span className="truncate text-[19px] font-extrabold leading-tight tracking-[-.01em]">{known?.title ?? playback.title}</span>
        <span className="flex items-center gap-2 text-[12px] font-bold text-fixed-white/75">
          <span>{known?.eyebrow ? `${known.eyebrow} · ` : ""}{clockTime(position)}</span>
          {playback.durationMs > 0 && <Progress position={position} duration={playback.durationMs} className="h-1 w-[70px]" />}
        </span>
      </span>
      <span className="relative inline-flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full bg-fixed-white px-3 text-[13px] font-bold text-[var(--cinema-screen)]">X-Ray{icon(ICONS.chev, 14)}</span>
    </Link>
  );
}
