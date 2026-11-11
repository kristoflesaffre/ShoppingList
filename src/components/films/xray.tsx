"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useGoogleAuthToken } from "@/lib/google-client";
import { cn } from "@/lib/utils";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { headerGlassButtonClass } from "@/components/ui/header_round_button";
import { clockTime, displayPosition, freshPlayback, parsePlayback, type Playback } from "@/lib/cinema-companion";
import type { XrayIdentity, XrayKind, XrayMessage } from "@/lib/cinema-xray";

/**
 * X-Ray tijdens het afspelen (canvas «X-Ray · A2» en «X-Ray · gsm · variant 4 Ladder»).
 * Tablet/desktop: cover rechts die uitvloeit in het doek, links titel + voortgang + terugspoelen + snelle vragen,
 * rechts de chat. Gsm: cover bovenaan, terugspoelen, de vier vragen als ladder van kort naar lang, chat eronder.
 */

type XrayInfo = { name: string; backdrop: string | null; poster: string | null; episodeTitle: string | null } | null;
type XrayState = { playback: Playback | null; live: boolean; identity: XrayIdentity | null; info: XrayInfo; messages: XrayMessage[]; hidden: number; aiConfigured: boolean };

const QUESTIONS: { kind: Exclude<XrayKind, "vraag">; label: string; short: string; scope: string; series?: boolean }[] = [
  { kind: "net", label: "Wat is er net gebeurd?", short: "Net gebeurd", scope: "Laatste 2 minuten" },
  { kind: "afl", label: "Wat is er tot hier in de aflevering gebeurd?", short: "Deze aflevering", scope: "Van het begin tot nu" },
  { kind: "seizoen", label: "Wat is er tot hier in het seizoen gebeurd?", short: "Dit seizoen", scope: "Vorige afleveringen + nu", series: true },
  { kind: "eerder", label: "Wat moet ik weten uit vorige afleveringen?", short: "Vorige afleveringen", scope: "Alles wat eraan voorafging", series: true },
];
const TONE: Record<Exclude<XrayKind, "vraag">, string> = {
  net: "text-[var(--cinema-rose)] bg-[color-mix(in_srgb,var(--cinema-rose)_16%,transparent)]",
  afl: "text-[var(--cinema-butter)] bg-[color-mix(in_srgb,var(--cinema-butter)_16%,transparent)]",
  seizoen: "text-[var(--cinema-lavender)] bg-[color-mix(in_srgb,var(--cinema-lavender)_18%,transparent)]",
  eerder: "text-[var(--cinema-mint)] bg-[color-mix(in_srgb,var(--cinema-mint)_16%,transparent)]",
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
  "bridge-unavailable": "De Pi is niet bereikbaar, terugspoelen lukt nu niet.",
  "projector-busy": "De projector is nog bezig met een vorige opdracht.",
};

const icon = (path: React.ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>
);
const ICONS = {
  net: <><path d="M11 7l-6 5 6 5V7zM19 7l-6 5 6 5V7z" /></>,
  afl: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M3 15h18M8 5v4M16 5v4M8 15v4M16 15v4" /></>,
  seizoen: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  eerder: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  rewind: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  send: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  chev: <><path d="M9 6l6 6-6 6" /></>,
};

/** Live projectorstatus (compact record, owner-only). */
export function useLivePlayback() {
  const { user } = db.useAuth();
  const q = db.useQuery(user ? { cinemaPlayback: { $: { where: { ownerId: user.id } } } } : null);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const playbacks = (q.data?.cinemaPlayback ?? []).map(r => parsePlayback(r.payload)).filter((p): p is Playback => !!p);
  const playback = playbacks.sort((a, b) => b.observedAt - a.observedAt)[0] ?? null;
  const live = !!playback && freshPlayback(playback, now) && playback.state !== "stopped";
  return { playback, live, now, position: playback ? displayPosition(playback, now) : 0 };
}

function useXray(active: boolean) {
  const token = useGoogleAuthToken();
  const { playback, live, now, position } = useLivePlayback();
  const [state, setState] = React.useState<XrayState | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<XrayKind | null>(null);
  const [rewinding, setRewinding] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState("");
  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/cinema/xray", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      const v = await r.json();
      if (r.ok) setState(v);
    } catch { /* volgende poging */ }
  }, [token]);
  const sessionKey = `${playback?.sessionId ?? ""}`;
  const jumpKey = playback ? Math.floor(playback.positionMs / 30_000) : 0;
  React.useEffect(() => { if (!active) return; void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 20_000); return () => clearInterval(t); }, [active, load, sessionKey]);
  // Terugspoelen of een andere aflevering: meteen opnieuw ophalen (antwoorden voorbij het nieuwe tijdstip verdwijnen).
  const lastJump = React.useRef(jumpKey);
  React.useEffect(() => { if (active && (jumpKey < lastJump.current || jumpKey > lastJump.current + 2)) void load(); lastJump.current = jumpKey; }, [active, jumpKey, load]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 5000); return () => clearTimeout(t); }, [toast]);

  const post = async (body: object) => {
    const r = await fetch("/api/cinema/xray", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const v = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(typeof v.error === "string" ? v.error : "xray-unavailable");
    return v;
  };
  const ask = async (kind: XrayKind, question?: string) => {
    if (busy) return;
    setBusy(kind); setError("");
    try {
      const m: XrayMessage = await post({ action: "ask", kind, question });
      setState(s => s ? { ...s, messages: [...s.messages.filter(x => x.id !== m.id), m] } : s);
    } catch (e) { setError(ERRORS[e instanceof Error ? e.message : ""] ?? "X-Ray is even niet bereikbaar."); }
    finally { setBusy(null); }
  };
  const rewind = async (minutes: number) => {
    if (rewinding) return;
    setRewinding(minutes); setError("");
    try { await post({ action: "rewind", minutes }); setToast(`Stremio springt ${minutes} min terug`); }
    catch (e) { setError(ERRORS[e instanceof Error ? e.message : ""] ?? "Terugspoelen lukte niet."); }
    finally { setTimeout(() => setRewinding(null), 2500); }
  };
  return { state, playback, live, now, position, error, busy, rewinding, toast, ask, rewind, setError };
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

function LivePill() {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-fixed-white/[0.12] px-2.5 text-[12px] font-bold text-[var(--cinema-rose)]">
      <span className="size-[7px] rounded-full bg-[var(--cinema-velvet)]" aria-hidden />NU OP DE PROJECTOR
    </span>
  );
}

function RewindRow({ x, compact }: { x: X; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", compact && "w-full")}>
      {!compact && <span className="mr-1 text-[12px] font-extrabold tracking-[.06em] text-fixed-white/60">TERUG</span>}
      {[1, 2, 5].map(m => (
        <button key={m} type="button" aria-label={`${m} minuut terug in Stremio`} disabled={!!x.rewinding} onClick={() => void x.rewind(m)}
          className={cn("inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-md transition-colors",
            x.rewinding === m ? "bg-fixed-white text-[var(--cinema-screen)]" : "bg-fixed-white/[0.12] [@media(hover:hover)]:hover:bg-fixed-white/20", compact && "flex-1 px-2")}>
          {icon(ICONS.rewind, 16)}{m} min
        </button>
      ))}
    </div>
  );
}

function Message({ m, faded }: { m: XrayMessage; faded?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3", faded && "opacity-40")}>
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

function ChatInput({ x, id }: { x: X; id: string }) {
  const [text, setText] = React.useState("");
  const send = () => { const q = text.trim(); if (!q || x.busy) return; setText(""); void x.ask("vraag", q); };
  return (
    <form className="flex h-[52px] items-center gap-2 rounded-2xl bg-fixed-white/10 pl-4 pr-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" onSubmit={e => { e.preventDefault(); send(); }}>
      <label htmlFor={id} className="sr-only">Vraag iets over wat je zag</label>
      <input id={id} value={text} onChange={e => setText(e.target.value)} maxLength={600} placeholder="Vraag iets over wat je zag…" enterKeyHint="send"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-fixed-white outline-none placeholder:text-fixed-white/50" />
      <button type="submit" aria-label="Vraag versturen" disabled={!text.trim() || !!x.busy}
        className="flex size-[38px] items-center justify-center rounded-full bg-[var(--cinema-lavender)] text-[var(--cinema-screen)] disabled:opacity-40">{icon(ICONS.send)}</button>
    </form>
  );
}

function Conversation({ x, className }: { x: X; className?: string }) {
  const end = React.useRef<HTMLDivElement>(null);
  const messages = x.state?.messages ?? [];
  React.useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length, x.busy]);
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain", className)} aria-live="polite">
      <div className="mt-auto" />
      {messages.length === 0 && !x.busy && !x.error && (
        <p className="self-center px-4 text-center text-[14px] leading-[1.5] text-fixed-white/55">Kies een snelle vraag of typ zelf iets over wat je zag. X-Ray kent enkel wat tot nu toe gebeurde.</p>
      )}
      {x.state && x.state.hidden > 0 && (
        <p className="self-center text-center text-[12px] font-semibold text-fixed-white/55">{x.state.hidden} {x.state.hidden === 1 ? "antwoord gaat" : "antwoorden gaan"} over later in de aflevering en {x.state.hidden === 1 ? "is" : "zijn"} even verborgen</p>
      )}
      {messages.map(m => <Message key={m.id} m={m} />)}
      {x.busy && <div className="self-start rounded-[18px_18px_18px_6px] bg-fixed-white/10 px-4 py-3 text-[14px] text-fixed-white/70">X-Ray denkt na…</div>}
      {x.error && <p className="self-start text-[13.5px] font-semibold text-[var(--cinema-rose)]">{x.error}</p>}
      <div ref={end} />
    </div>
  );
}

function Cover({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      {src && <img src={src} alt="" className="absolute right-0 top-0 h-full w-[74%] object-cover object-center" />}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--cinema-screen)_27%,color-mix(in_srgb,var(--cinema-screen)_82%,transparent)_42%,color-mix(in_srgb,var(--cinema-screen)_25%,transparent)_62%,transparent_78%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--cinema-screen)_4%,color-mix(in_srgb,var(--cinema-screen)_55%,transparent)_30%,transparent_55%)]" />
    </div>
  );
}

function titleLines(x: X) {
  const id = x.state?.identity, info = x.state?.info, p = x.playback;
  const title = info?.name ?? id?.title ?? p?.title ?? "Stremio";
  const eyebrow = id?.type === "series" && id.season && id.episode ? `S${id.season} · A${id.episode}${info?.episodeTitle ? ` · ${info.episodeTitle}` : ""}` : id ? "Film" : "Wordt herkend…";
  return { title, eyebrow };
}
const questionsFor = (x: X) => QUESTIONS.filter(q => !q.series || x.state?.identity?.type !== "movie");

function Toast({ x }: { x: X }) {
  if (!x.toast) return null;
  return <div role="status" className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full bg-fixed-white px-4 py-2.5 text-[14px] font-bold text-[var(--cinema-screen)] shadow-[0_14px_30px_-12px_rgba(16,17,48,.6)]">{x.toast}</div>;
}

/** Tablet en desktop: canvas «X-Ray · A2 · Doek met chat en terugspoelen». */
export function XrayTablet({ x, onBack }: { x: X; onBack: () => void }) {
  const p = x.playback, { title, eyebrow } = titleLines(x);
  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--cinema-screen)] text-fixed-white">
      <Cover src={x.state?.info?.backdrop ?? null} />
      <Toast x={x} />
      <div className="absolute bottom-[26px] left-8 top-6 flex w-[min(600px,calc(100%-500px))] flex-col">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Terug" onClick={onBack} className={headerGlassButtonClass}>{RoundIcons.back}</button>
          <LivePill />
        </div>
        <div className="mt-auto flex flex-col gap-2.5">
          <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-[var(--cinema-rose)]">{eyebrow}</div>
          <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-none tracking-[-.03em]">{title}</h1>
          {p && (
            <div className="mt-1.5 flex items-center gap-3 text-[14px] font-bold">
              <span>{clockTime(x.position)}</span>
              <Progress position={x.position} duration={p.durationMs} className="w-[300px] max-w-[45%]" />
              {p.durationMs > 0 && <span className="text-fixed-white/60">nog {clockTime(p.durationMs - x.position)}</span>}
            </div>
          )}
          <div className="mt-2.5"><RewindRow x={x} /></div>
          <div className="mt-2 flex flex-wrap gap-2">
            {questionsFor(x).map(q => (
              <button key={q.kind} type="button" disabled={!!x.busy} onClick={() => void x.ask(q.kind)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-fixed-white/10 px-3.5 text-[13px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-md [@media(hover:hover)]:hover:bg-fixed-white/20 disabled:opacity-60">
                {icon(ICONS[q.kind], 15)}{x.busy === q.kind ? "Even denken…" : q.short}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section aria-label="Vraag het X-Ray" className="absolute bottom-6 right-6 top-6 flex w-[420px] flex-col gap-3 rounded-[24px] bg-[color-mix(in_srgb,var(--cinema-screen)_74%,transparent)] p-[18px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-extrabold">Vraag het X-Ray</h2>
          <span className="ml-auto text-[12px] font-bold text-fixed-white/55">Zonder spoilers</span>
        </div>
        <Conversation x={x} />
        <ChatInput x={x} id="xray-tablet-vraag" />
      </section>
    </div>
  );
}

/** Gsm: canvas «X-Ray · gsm · variant 4 Ladder van kort naar lang». */
export function XrayPhone({ x, onBack }: { x: X; onBack: () => void }) {
  const p = x.playback, { title, eyebrow } = titleLines(x);
  const hasMessages = (x.state?.messages.length ?? 0) > 0 || !!x.busy;
  const qs = questionsFor(x);
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--cinema-screen)] text-fixed-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px]" aria-hidden>
        {x.state?.info?.backdrop && <img src={x.state.info.backdrop} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--cinema-screen)_6%,color-mix(in_srgb,var(--cinema-screen)_50%,transparent)_45%,color-mix(in_srgb,var(--cinema-screen)_15%,transparent)_100%)]" />
      </div>
      <Toast x={x} />
      <div className="relative flex flex-1 flex-col gap-4 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(12px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Terug" onClick={onBack} className={headerGlassButtonClass}>{RoundIcons.back}</button>
          <LivePill />
        </div>
        <div className="mt-[88px] flex flex-col gap-2">
          <div className="text-[12px] font-extrabold uppercase tracking-[.08em] text-[var(--cinema-rose)]">{eyebrow}</div>
          <h1 className="text-[34px] font-extrabold leading-none tracking-[-.02em]">{title}</h1>
          {p && (
            <div className="flex items-center gap-2.5 text-[13px] font-bold">
              <span>{clockTime(x.position)}</span>
              <Progress position={x.position} duration={p.durationMs} className="flex-1" />
              {p.durationMs > 0 && <span className="whitespace-nowrap text-fixed-white/60">nog {clockTime(p.durationMs - x.position)}</span>}
            </div>
          )}
          <div className="mt-1"><RewindRow x={x} compact /></div>
        </div>
        {hasMessages ? (
          <div className="-mr-4 flex gap-2 overflow-x-auto pr-4 [scrollbar-width:none]">
            {qs.map(q => (
              <button key={q.kind} type="button" disabled={!!x.busy} onClick={() => void x.ask(q.kind)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-fixed-white/10 px-3 text-[13px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] disabled:opacity-60">
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
        <Conversation x={x} className={hasMessages ? "" : "flex-none"} />
        <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))]"><ChatInput x={x} id="xray-gsm-vraag" /></div>
      </div>
    </div>
  );
}

/** Enkel in development (`?demo=1`): duidelijk fictief voorbeeld om de schermen te bekijken zonder projector. */
function useDemo(x: X, on: boolean): X {
  const [ladder, setLadder] = React.useState(true);
  if (!on) return x;
  const now = Date.now();
  const playback: Playback = { sessionId: "demo-session-01", sequence: 1, mediaKey: "demo", streamFingerprint: "0".repeat(64), imdbId: null, mediaType: "series", season: 2, episode: 4, title: "Vuurtoren", positionMs: 1_425_000, durationMs: 2_890_000, speed: 1, state: "paused", observedAt: now, uncertaintyMs: 1500, deviceUpdateElapsedMs: null };
  const messages: XrayMessage[] = ladder ? [] : [
    { id: "d1", videoId: "demo", kind: "net", question: "Wat is er net gebeurd?", answer: "Voorbeeld: Lotte vindt in de kelder het logboek van haar vader en verstopt het voor Jonas.", refs: [{ label: "21:40", timeMs: 1_300_000 }, { label: "23:10", timeMs: 1_390_000 }], askedAtMs: 1_400_000, contextEndMs: 1_400_000, createdAt: now, costUsd: 0.0006, model: "demo" },
    { id: "d2", videoId: "demo", kind: "vraag", question: "Waarom liegt Lotte tegen Jonas?", answer: "Voorbeeld: ze lijkt hem niet te vertrouwen, omdat de havenmeester hem aannam.", refs: [{ label: "S2 A2", timeMs: null }], askedAtMs: 1_405_000, contextEndMs: 1_405_000, createdAt: now, costUsd: 0.002, model: "demo" },
  ];
  return { ...x, playback, live: true, position: 1_425_000, now, state: { playback, live: true, identity: { imdbId: "tt0000000", type: "series", season: 2, episode: 4, videoId: "demo", title: "Vuurtoren", source: "stremio" }, info: { name: "Vuurtoren (voorbeeld)", backdrop: null, poster: null, episodeTitle: "Laag water" }, messages, hidden: 0, aiConfigured: true },
    ask: async () => setLadder(false), rewind: async () => {} };
}

/** Volledige X-Ray-pagina (`/films-series/nu-kijken`): A2 vanaf tablet, ladder op gsm. */
export function XrayPage({ onBack }: { onBack: () => void }) {
  const [demoOn, setDemoOn] = React.useState(false);
  React.useEffect(() => { setDemoOn(process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("demo") === "1"); }, []);
  const x = useDemo(useXray(!demoOn), demoOn);
  if (!x.live && !x.playback) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--cinema-screen)] px-6 text-center text-fixed-white">
        <h1 className="text-[22px] font-extrabold">Er speelt nu niets op de projector</h1>
        <p className="max-w-[340px] text-[15px] text-fixed-white/65">Start een film of aflevering in Stremio; X-Ray verschijnt dan vanzelf.</p>
        <button type="button" onClick={onBack} className="h-[42px] rounded-full bg-fixed-white px-5 text-[15px] font-bold text-[var(--cinema-screen)]">Terug</button>
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
    <div className="fixed inset-0 z-[60] hidden md:block">
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
  const [info, setInfo] = React.useState<{ title: string; eyebrow: string; backdrop: string | null } | null>(null);
  const session = playback?.sessionId;
  React.useEffect(() => {
    if (!live || !token || !session) return;
    let gone = false;
    void fetch("/api/cinema/xray", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).then(r => r.ok ? r.json() : null).then((v: XrayState | null) => {
      if (gone || !v) return;
      const id = v.identity;
      setInfo({ title: v.info?.name ?? id?.title ?? playback?.title ?? "Stremio", eyebrow: id?.type === "series" && id.season && id.episode ? `S${id.season} · A${id.episode}` : "Film", backdrop: v.info?.backdrop ?? null });
    }).catch(() => {});
    return () => { gone = true; };
  }, [live, token, session, playback?.title]);
  if (!live || !playback) return null;
  return (
    <Link href="/films-series/nu-kijken" className={cn("relative flex h-[104px] items-center gap-3 overflow-hidden rounded-[20px] bg-[var(--cinema-screen)] pl-4 pr-3.5 text-fixed-white", className)}>
      {info?.backdrop && <img src={info.backdrop} alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-[62%] object-cover" />}
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--cinema-screen)_40%,color-mix(in_srgb,var(--cinema-screen)_70%,transparent)_62%,color-mix(in_srgb,var(--cinema-screen)_10%,transparent)_100%)]" />
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5"><span className="size-[7px] rounded-full bg-[var(--cinema-velvet)]" aria-hidden /><span className="text-[11px] font-extrabold tracking-[.08em] text-[var(--cinema-rose)]">NU OP DE PROJECTOR</span></span>
        <span className="truncate text-[19px] font-extrabold leading-tight tracking-[-.01em]">{info?.title ?? playback.title}</span>
        <span className="flex items-center gap-2 text-[12px] font-bold text-fixed-white/75">
          <span>{info?.eyebrow ? `${info.eyebrow} · ` : ""}{clockTime(position)}</span>
          {playback.durationMs > 0 && <Progress position={position} duration={playback.durationMs} className="h-1 w-[70px]" />}
        </span>
      </span>
      <span className="relative inline-flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full bg-fixed-white px-3 text-[13px] font-bold text-[var(--cinema-screen)]">X-Ray{icon(ICONS.chev, 14)}</span>
    </Link>
  );
}
