/**
 * Een scherm dat dagen open blijft (kalender en dashboard op de tablet aan de muur) mag nooit gisteren tonen.
 * `startWakeRefresh` roept `run` op wanneer dat nodig is: elke `everyMs`, precies na middernacht, en zodra het
 * toestel wakker wordt (pagina weer zichtbaar, focus, `pageshow`, weer online). Timers staan op een slapende
 * tablet stil, dus alleen een interval is niet genoeg. Meerdere wakker-wordt-signalen vlak na elkaar tellen als één.
 */

/** Milliseconden tot net na de volgende lokale middernacht (2 s marge); klopt ook bij zomer- en wintertijd. */
export function msUntilNextDay(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2).getTime() - now.getTime();
}

/** Zoveel ms na een wakker-wordt-signaal negeren we de volgende (focus, pageshow en zichtbaar komen samen). */
const WAKE_DEBOUNCE_MS = 1500;

export type WakeTargets = {
  win: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  doc: Pick<EventTarget, "addEventListener" | "removeEventListener"> & { readonly visibilityState: string };
};

export function startWakeRefresh(run: () => void, everyMs: number | null, { win, doc }: WakeTargets): () => void {
  let lastWake = -Infinity;
  const wake = () => {
    const now = Date.now();
    if (now - lastWake < WAKE_DEBOUNCE_MS) return;
    lastWake = now;
    run();
  };
  const onVisible = () => {
    if (doc.visibilityState === "visible") wake();
  };
  let midnight: ReturnType<typeof setTimeout>;
  const armMidnight = () => {
    midnight = setTimeout(() => {
      run();
      armMidnight();
    }, msUntilNextDay());
  };
  armMidnight();
  const interval = everyMs ? setInterval(run, everyMs) : null;
  doc.addEventListener("visibilitychange", onVisible);
  win.addEventListener("focus", wake);
  win.addEventListener("pageshow", wake);
  win.addEventListener("online", wake);
  return () => {
    clearTimeout(midnight);
    if (interval) clearInterval(interval);
    doc.removeEventListener("visibilitychange", onVisible);
    win.removeEventListener("focus", wake);
    win.removeEventListener("pageshow", wake);
    win.removeEventListener("online", wake);
  };
}
