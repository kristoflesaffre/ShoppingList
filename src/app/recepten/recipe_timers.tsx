"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter_chip";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { cn } from "@/lib/utils";
import {
  formatRemaining,
  parseStoredTimers,
  parseTimerSound,
  TIMER_SOUND_STORAGE_KEY,
  TIMER_SOUNDS,
  timerSoundUrl,
  type TimerSoundId,
  timerId,
  timersStorageKey,
  type RecipeTimer,
  type StepDuration,
} from "@/lib/recipe-timers";

/**
 * Wekkers in een recept (canvas «Recept · Wekkers» A): een knop per tijd in een stap, een teller
 * rechtsboven in de kop met alle lopende wekkers, en een melding met geluid als er een afgaat.
 * Per toestel bewaard (localStorage), zodat herladen of even weggaan de wekkers niet wist.
 */

// ---------------------------------------------------------------------------
// Geluid: het gekozen wekkergeluid via Web Audio. De context moet starten tijdens een tik (iOS),
// dus bij «start» en bij het kiezen van een geluid; het bestand wordt dan ook meteen ingeladen.
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;
const soundBuffers = new Map<TimerSoundId, Promise<AudioBuffer | null>>();

function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext ??= new Ctor();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    audioContext = null;
    return null;
  }
}

function loadSound(id: TimerSoundId): Promise<AudioBuffer | null> {
  const ctx = audioContext;
  if (!ctx) return Promise.resolve(null);
  let pending = soundBuffers.get(id);
  if (!pending) {
    pending = fetch(timerSoundUrl(id))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ctx.decodeAudioData(data))
      .then(normalize)
      .catch(() => {
        soundBuffers.delete(id);
        return null;
      });
    soundBuffers.set(id, pending);
  }
  return pending;
}

/** De gemaakte geluiden verschillen sterk in volume: breng elk naar dezelfde piek. */
function normalize(buffer: AudioBuffer): AudioBuffer {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak > 0.001) {
    const gain = 0.8 / peak;
    for (let c = 0; c < buffer.numberOfChannels; c += 1) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
  }
  return buffer;
}

/** Zachte pieptoon als het geluidsbestand (nog) niet geladen is. */
function fallbackBeep(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.65);
}

async function playSound(id: TimerSoundId) {
  const ctx = audioContext;
  if (!ctx) return;
  const buffer = await loadSound(id);
  if (!buffer) {
    fallbackBeep(ctx);
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

/** Gekozen wekkergeluid (per toestel); kiezen speelt het meteen even af. */
export function useTimerSound() {
  const [sound, setSound] = React.useState<TimerSoundId>("klokje");
  React.useEffect(() => {
    try {
      setSound(parseTimerSound(window.localStorage.getItem(TIMER_SOUND_STORAGE_KEY)));
    } catch {
      /* geen opslag: standaardgeluid */
    }
  }, []);
  const choose = React.useCallback((id: TimerSoundId) => {
    setSound(id);
    try {
      window.localStorage.setItem(TIMER_SOUND_STORAGE_KEY, id);
    } catch {
      /* enkel voor deze keer */
    }
    if (unlockAudio()) void playSound(id);
  }, []);
  return { sound, choose };
}

// ---------------------------------------------------------------------------
// Toestand
// ---------------------------------------------------------------------------

export function useRecipeTimers(recipeId: string, sound: TimerSoundId) {
  const [timers, setTimers] = React.useState<RecipeTimer[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  /** Voor welk recept de bewaarde wekkers al ingelezen zijn: eerder bewaren zou ze wissen. */
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setTimers(parseStoredTimers(window.localStorage.getItem(timersStorageKey(recipeId))));
    } catch {
      setTimers([]);
    }
    setLoadedFor(recipeId);
  }, [recipeId]);

  React.useEffect(() => {
    if (loadedFor !== recipeId) return;
    try {
      const key = timersStorageKey(recipeId);
      if (timers.length > 0) window.localStorage.setItem(key, JSON.stringify(timers));
      else window.localStorage.removeItem(key);
    } catch {
      /* privévenster of opslag vol: de wekkers lopen gewoon verder zolang de pagina open is */
    }
  }, [loadedFor, recipeId, timers]);

  // Elke seconde bijwerken zolang er een wekker loopt; ook meteen bij terugkeren naar de app.
  React.useEffect(() => {
    if (timers.length === 0) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timers.length]);

  const ringing = React.useMemo(() => timers.filter((t) => t.endsAt <= now).sort((a, b) => a.endsAt - b.endsAt), [timers, now]);
  const running = React.useMemo(() => timers.filter((t) => t.endsAt > now).sort((a, b) => a.endsAt - b.endsAt), [timers, now]);

  // Zolang er een wekker afgaat: om de anderhalve seconde piepen en trillen.
  const isRinging = ringing.length > 0;
  React.useEffect(() => {
    if (!isRinging) return;
    const ring = () => {
      void playSound(sound);
      try {
        navigator.vibrate?.([300, 150, 300]);
      } catch {
        /* geen trilfunctie */
      }
    };
    ring();
    // Het geluid duurt ± 2,5 s: daarna even stilte, dan opnieuw.
    const interval = window.setInterval(ring, 4000);
    return () => window.clearInterval(interval);
  }, [isRinging, sound]);

  const start = React.useCallback((stepIndex: number, duration: StepDuration) => {
    if (unlockAudio()) void loadSound(sound);
    const id = timerId(stepIndex, duration.ms);
    setNow(Date.now());
    setTimers((cur) => [
      ...cur.filter((t) => t.id !== id),
      { id, stepIndex, durationMs: duration.ms, label: duration.label, endsAt: Date.now() + duration.ms },
    ]);
  }, [sound]);

  const remove = React.useCallback((id: string) => setTimers((cur) => cur.filter((t) => t.id !== id)), []);

  const snooze = React.useCallback((id: string, ms: number) => {
    setNow(Date.now());
    setTimers((cur) => cur.map((t) => (t.id === id ? { ...t, endsAt: Date.now() + ms } : t)));
  }, []);

  return { timers, running, ringing, now, start, remove, snooze };
}

// ---------------------------------------------------------------------------
// Bouwstenen
// ---------------------------------------------------------------------------

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M9.5 2h5" />
    </svg>
  );
}

/** Ring die leegloopt: `fraction` = deel van de tijd dat nog rest. */
function TimerRing({ fraction, size, stroke, track, color, children }: { fraction: number; size: number; stroke: number; track: string; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, fraction)))}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {children}
    </span>
  );
}

const remainingFraction = (t: RecipeTimer, now: number) => (t.endsAt - now) / t.durationMs;

/** Korte naam van een stap voor de teller en de melding: de eerste woorden van de stap. */
export function stepShortName(text: string): string {
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? text;
  return firstSentence.length > 42 ? `${firstSentence.slice(0, 40).trimEnd()}…` : firstSentence;
}

// ---------------------------------------------------------------------------
// In de stap: «20 min» → «Nog 14:32» + ✕
// ---------------------------------------------------------------------------

/**
 * Label in een timerknop, even breed als het langste label van het recept: alle labels staan
 * onzichtbaar in dezelfde rastercel, dus de knop neemt de breedte van de breedste.
 */
function SizedLabel({ text, sizeTo }: { text: string; sizeTo: string[] }) {
  return (
    <span className="grid justify-items-center">
      <span className="[grid-area:1/1]">{text}</span>
      {sizeTo.map((l) => (
        <span key={l} aria-hidden className="invisible [grid-area:1/1]">
          {l}
        </span>
      ))}
    </span>
  );
}

export function StepTimerChips({
  stepIndex,
  durations,
  timers,
  now,
  onStart,
  onRemove,
  allLabels,
}: {
  stepIndex: number;
  durations: StepDuration[];
  /** Alle tijden van het recept («2 min», «1 u 15 min»): elke knop wordt zo breed als de breedste. */
  allLabels: string[];
  timers: RecipeTimer[];
  now: number;
  onStart: (stepIndex: number, duration: StepDuration) => void;
  onRemove: (id: string) => void;
}) {
  if (durations.length === 0) return null;
  return (
    // Tikken hier kiest de stap niet (de kaart zelf is een knop). Rechts uitgelijnd op de rij met de
    // ingrediënten van de stap (`ml-auto`), als echte knop (`Button` outline sm, 34px) en niet als label.
    // Alle timerknoppen van het recept even breed als de breedste (`SizedLabel`), ook terwijl ze lopen.
    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {durations.map((d) => {
        const timer = timers.find((t) => t.id === timerId(stepIndex, d.ms));
        if (!timer) {
          return (
            <Button
              key={d.ms}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStart(stepIndex, d)}
              aria-label={`Timer van ${d.label} starten voor stap ${stepIndex + 1}`}
              className="px-3"
            >
              <ClockGlyph className="size-[15px]" />
              <SizedLabel text={d.label} sizeTo={allLabels} />
            </Button>
          );
        }
        const ringingNow = timer.endsAt <= now;
        return (
          <span key={d.ms} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-[34px] items-center justify-center gap-1.5 rounded-pill px-3 text-sm font-bold tabular-nums",
                ringingNow ? "bg-[var(--secondary-500)] text-[var(--secondary-900)]" : "bg-[var(--blue-500)] text-fixed-white",
              )}
              role="timer"
              aria-label={ringingNow ? `Timer van stap ${stepIndex + 1} is afgelopen` : `Nog ${formatRemaining(timer.endsAt - now)} voor stap ${stepIndex + 1}`}
            >
              <TimerRing fraction={remainingFraction(timer, now)} size={18} stroke={2.5} track="rgba(255,255,255,0.35)" color="#ffffff" />
              <SizedLabel text={ringingNow ? "Tijd om" : `Nog ${formatRemaining(timer.endsAt - now)}`} sizeTo={allLabels} />
            </span>
            <RoundIconButton tone="danger" size={28} onClick={() => onRemove(timer.id)} aria-label={`Timer van stap ${stepIndex + 1} verwijderen`}>
              {RoundIcons.close}
            </RoundIconButton>
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timergeluid kiezen: in de lijst «Timers» en vooraf via de knop naast «Bereiding»
// ---------------------------------------------------------------------------

function TimerSoundChips({ labelledBy, sound, onChoose }: { labelledBy: string; sound: TimerSoundId; onChoose: (id: TimerSoundId) => void }) {
  return (
    <>
      <p className="mb-2 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">Tik om te beluisteren; je keuze blijft op dit toestel.</p>
      <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">
        {TIMER_SOUNDS.map((s) => (
          <FilterChip key={s.id} selected={sound === s.id} onClick={() => onChoose(s.id)}>
            {s.label}
          </FilterChip>
        ))}
      </div>
    </>
  );
}

function SoundGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

/** Ronde knop naast de titel «Bereiding»: het timergeluid kiezen voor je een timer start. */
export function TimerSoundButton({ sound, onChoose }: { sound: TimerSoundId; onChoose: (id: TimerSoundId) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = TIMER_SOUNDS.find((s) => s.id === sound)?.label ?? "";
  return (
    <div ref={rootRef} className="relative shrink-0">
      <RoundIconButton
        tone="primary"
        size={32}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Timergeluid kiezen, nu ${current}`}
        title="Timergeluid"
        onClick={() => setOpen((v) => !v)}
        className={cn(open && "shadow-[0_0_0_3px_var(--blue-100)]")}
      >
        <SoundGlyph />
      </RoundIconButton>
      {open ? (
        <div
          role="dialog"
          aria-labelledby="timer-sound-title"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(300px,calc(100vw-48px))] rounded-[20px] bg-[var(--white)] px-3.5 pb-3.5 pt-3 shadow-[0_2px_4px_rgba(16,17,48,0.06),0_18px_40px_-10px_rgba(16,17,48,0.35)] motion-safe:animate-fade-up"
        >
          <p id="timer-sound-title" className="text-[15px] font-bold text-text-primary">Timergeluid</p>
          <TimerSoundChips labelledBy="timer-sound-title" sound={sound} onChoose={onChoose} />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rechtsboven: teller met de eerstvolgende wekker; tik = lijst met alle wekkers
// ---------------------------------------------------------------------------

export function TimerDock({
  timers,
  now,
  stepText,
  onRemove,
  onJump,
  sound,
  onChooseSound,
}: {
  /** Lopende wekkers, eerst afgelopen eerst. */
  timers: RecipeTimer[];
  now: number;
  stepText: (stepIndex: number) => string;
  onRemove: (id: string) => void;
  onJump: (stepIndex: number) => void;
  sound: TimerSoundId;
  onChooseSound: (id: TimerSoundId) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => {
    if (timers.length === 0) setOpen(false);
  }, [timers.length]);

  if (timers.length === 0) return null;
  const first = timers[0];
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${timers.length === 1 ? "1 timer loopt" : `${timers.length} timers lopen`}, de eerste is klaar over ${formatRemaining(first.endsAt - now)}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-pill bg-[var(--blue-500)] pl-[9px] text-fixed-white shadow-[0_2px_4px_rgba(79,85,241,0.24),0_8px_20px_-4px_rgba(79,85,241,0.45)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
          timers.length > 1 ? "pr-[7px]" : "pr-3.5",
          open && "shadow-[0_0_0_3px_var(--blue-100)]",
        )}
      >
        <TimerRing fraction={remainingFraction(first, now)} size={20} stroke={2.5} track="rgba(255,255,255,0.35)" color="#ffffff" />
        <span className="text-[15px] font-bold tabular-nums">{formatRemaining(first.endsAt - now)}</span>
        {timers.length > 1 ? (
          <span className="flex h-[24px] min-w-[24px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.22)] text-xs font-bold">{timers.length}</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Timers"
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+68px)] z-30 rounded-[20px] lg:absolute lg:inset-x-auto lg:right-0 lg:top-[calc(100%+8px)] lg:w-[320px] bg-[var(--white)] px-3.5 pb-2.5 pt-3.5 shadow-[0_2px_4px_rgba(16,17,48,0.06),0_18px_40px_-10px_rgba(16,17,48,0.35)] motion-safe:animate-fade-up"
        >
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-[17px] font-bold text-text-primary">Timers</p>
            <p className="text-[13px] text-[var(--text-secondary)]">{timers.length === 1 ? "1 loopt" : `${timers.length} lopen`}</p>
          </div>
          <ul>
            {timers.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-t border-[var(--border-subtle)] py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onJump(t.stepIndex);
                  }}
                  aria-label={`Naar stap ${t.stepIndex + 1}, nog ${formatRemaining(t.endsAt - now)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <TimerRing fraction={remainingFraction(t, now)} size={48} stroke={4} track="var(--blue-50)" color="var(--blue-500)">
                    <span className="text-[13px] font-bold text-[var(--blue-500)]">{t.stepIndex + 1}</span>
                  </TimerRing>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--text-secondary)]">Stap {t.stepIndex + 1}</span>
                    <span className="truncate text-[15px] font-semibold leading-5 text-text-primary">{stepShortName(stepText(t.stepIndex))}</span>
                    <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">
                      <b className="text-[15px] text-text-primary">{formatRemaining(t.endsAt - now)}</b> van {t.label}
                    </span>
                  </span>
                </button>
                <RoundIconButton tone="danger" size={32} onClick={() => onRemove(t.id)} aria-label={`Timer van stap ${t.stepIndex + 1} verwijderen`}>
                  {RoundIcons.close}
                </RoundIconButton>
              </li>
            ))}
          </ul>
          <p className="border-t border-[var(--border-subtle)] pt-2 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">Tik op een timer om naar zijn stap te springen.</p>
          <div className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5">
            <p id="timer-dock-sound" className="text-[13px] font-semibold text-text-primary">Geluid</p>
            <TimerSoundChips labelledBy="timer-dock-sound" sound={sound} onChoose={onChooseSound} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// De wekker gaat af
// ---------------------------------------------------------------------------

export function TimerAlarm({
  timer,
  stepText,
  others,
  now,
  onStop,
  onSnooze,
}: {
  timer: RecipeTimer;
  stepText: (stepIndex: number) => string;
  /** Wekkers die nog lopen. */
  others: RecipeTimer[];
  now: number;
  onStop: (id: string) => void;
  onSnooze: (id: string, ms: number) => void;
}) {
  const stopRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    stopRef.current?.focus();
  }, [timer.id]);
  const text = stepText(timer.stepIndex);
  // De volledige stap enkel als de titel ze inkortte.
  const showText = !!text && stepShortName(text) !== text.replace(/[.!?]\s*$/, "").trim();
  const next = others[0];
  const glassBtn =
    "h-[42px] rounded-pill bg-[color-mix(in_srgb,var(--white)_12%,transparent)] px-4 text-[15px] font-semibold text-[var(--white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--white)_28%,transparent)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)]";
  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.45)]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="timer-alarm-title"
        aria-describedby={showText ? "timer-alarm-step" : undefined}
        className="absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+16px)] mx-auto max-w-[460px] rounded-[26px] bg-[var(--blue-800)] px-[18px] pb-4 pt-[18px] text-[var(--white)] shadow-[0_14px_30px_-12px_rgba(16,17,48,0.6)] motion-safe:animate-fade-up"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--white)_16%,transparent)] motion-safe:animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
              <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.06em] opacity-75">Stap {timer.stepIndex + 1} · Tijd om</p>
            <p id="timer-alarm-title" className="mt-0.5 truncate text-xl font-bold leading-[26px]">
              {stepShortName(text) || `Stap ${timer.stepIndex + 1}`}
            </p>
          </div>
        </div>
        {showText ? (
          <p id="timer-alarm-step" className="mt-3 text-[15px] leading-[22px] opacity-85">
            {text}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            ref={stopRef}
            type="button"
            onClick={() => onStop(timer.id)}
            className="h-[42px] flex-1 rounded-pill bg-[var(--white)] text-[15px] font-bold text-[var(--blue-800)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blue-800)]"
          >
            Stop timer
          </button>
          <button type="button" onClick={() => onSnooze(timer.id, 60_000)} className={glassBtn}>
            +1 min
          </button>
          <button type="button" onClick={() => onSnooze(timer.id, 5 * 60_000)} className={glassBtn}>
            +5 min
          </button>
        </div>
        {next ? (
          <p className="mt-3.5 border-t border-[color-mix(in_srgb,var(--white)_16%,transparent)] pt-3 text-[13px] tabular-nums opacity-80">
            Loopt nog: stap {next.stepIndex + 1} · {stepShortName(stepText(next.stepIndex))} · {formatRemaining(next.endsAt - now)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
