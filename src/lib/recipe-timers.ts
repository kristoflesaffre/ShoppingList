/**
 * Wekkers in een recept (canvas «Recept · Wekkers» A): tijden herkennen in een bereidingsstap
 * («20 minuten», «1 uur en 15 minuten», «een kwartier») en lopende wekkers per toestel bewaren.
 */

export type StepDuration = {
  /** Duur in milliseconden. */
  ms: number;
  /** Kort label voor de knop: «20 min», «1 u 15 min», «30 sec». */
  label: string;
};

export type RecipeTimer = {
  /** Uniek per stap en duur, zodat dezelfde knop zijn eigen wekker terugvindt. */
  id: string;
  stepIndex: number;
  durationMs: number;
  label: string;
  /** Tijdstip (ms sinds epoch) waarop de wekker afgaat. */
  endsAt: number;
};

const MINUTE = 60_000;
const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const RANGE = String.raw`(?:\s*(?:à|a|tot|-|–)\s*\d+(?:[.,]\d+)?)?`;
const UNIT = String.raw`(minuten|minuut|min\.?|uren|uur|seconden|seconde|sec\.?)`;
const AMOUNT_RE = new RegExp(String.raw`(?<![\w.,])${NUMBER}${RANGE}\s*${UNIT}(?![a-z])`, "gi");
const WORDS: [RegExp, number][] = [
  [/\banderhalf uur\b/gi, 90 * MINUTE],
  [/\b(?:een )?half uur(?:tje)?\b/gi, 30 * MINUTE],
  [/\b(?:een )?kwartier(?:tje)?\b/gi, 15 * MINUTE],
];
/** «1 uur en 15 minuten» of «1 uur 15 min»: het tweede deel hoort bij het eerste. */
const MINUTES_AFTER_HOUR = /^\s*(?:en\s+)?(\d+)\s*(?:minuten|minuut|min\.?)(?![a-z])/i;

const toNumber = (raw: string) => Number(raw.replace(",", "."));

export function formatDurationLabel(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} u` : `${hours} u ${minutes} min`;
}

/**
 * Alle tijden in een stap, in volgorde van de tekst, zonder dubbels. Bij «20 à 25 minuten» telt de
 * kortste tijd: je kijkt beter iets te vroeg dan te laat.
 */
export function findStepDurations(text: string): StepDuration[] {
  const found: { at: number; ms: number }[] = [];
  const taken: [number, number][] = [];
  for (const match of Array.from(text.matchAll(AMOUNT_RE))) {
    const at = match.index ?? 0;
    const value = toNumber(match[1]);
    const unit = match[2].toLowerCase();
    let ms = unit.startsWith("u") ? value * 60 * MINUTE : unit.startsWith("s") ? value * 1000 : value * MINUTE;
    let end = at + match[0].length;
    if (unit.startsWith("u")) {
      const extra = MINUTES_AFTER_HOUR.exec(text.slice(end));
      if (extra) {
        ms += Number(extra[1]) * MINUTE;
        end += extra[0].length;
      }
    }
    if (taken.some(([s, e]) => at < e && end > s)) continue;
    taken.push([at, end]);
    if (ms > 0 && ms <= 24 * 60 * MINUTE) found.push({ at, ms: Math.round(ms) });
  }
  for (const [re, ms] of WORDS) {
    for (const match of Array.from(text.matchAll(re))) {
      const at = match.index ?? 0;
      const end = at + match[0].length;
      if (taken.some(([s, e]) => at < e && end > s)) continue;
      taken.push([at, end]);
      found.push({ at, ms });
    }
  }
  const seen = new Set<number>();
  return found
    .sort((a, b) => a.at - b.at)
    .filter(({ ms }) => (seen.has(ms) ? false : (seen.add(ms), true)))
    .map(({ ms }) => ({ ms, label: formatDurationLabel(ms) }));
}

export function timerId(stepIndex: number, durationMs: number): string {
  return `${stepIndex}-${durationMs}`;
}

/** Resterende tijd als «14:32», of «1:02:05» vanaf een uur. Nooit negatief. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function timersStorageKey(recipeId: string): string {
  return `recipe-timers:${recipeId}`;
}

/** Leest bewaarde wekkers; alles wat er niet uitziet als een wekker valt weg. */
export function parseStoredTimers(raw: string | null): RecipeTimer[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (t): t is RecipeTimer =>
        !!t &&
        typeof t.id === "string" &&
        typeof t.stepIndex === "number" &&
        typeof t.durationMs === "number" &&
        typeof t.label === "string" &&
        typeof t.endsAt === "number",
    );
  } catch {
    return [];
  }
}

/** Wekkergeluiden (public/sounds/timer/<id>.mp3, gemaakt met scripts/generate-timer-sounds.mjs). */
export const TIMER_SOUNDS = [
  { id: "klokje", label: "Zacht klokje" },
  { id: "bel", label: "Belletje" },
  { id: "kalimba", label: "Kalimba" },
  { id: "harp", label: "Harp" },
] as const;

export type TimerSoundId = (typeof TIMER_SOUNDS)[number]["id"];
export const DEFAULT_TIMER_SOUND: TimerSoundId = "klokje";
/** Gekozen geluid, per toestel. */
export const TIMER_SOUND_STORAGE_KEY = "recipe-timer-sound";

export function parseTimerSound(raw: string | null): TimerSoundId {
  return TIMER_SOUNDS.some((s) => s.id === raw) ? (raw as TimerSoundId) : DEFAULT_TIMER_SOUND;
}

export const timerSoundUrl = (id: TimerSoundId) => `/sounds/timer/${id}.mp3`;
