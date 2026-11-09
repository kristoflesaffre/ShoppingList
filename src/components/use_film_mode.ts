"use client";

import * as React from "react";
import { useGoogleAuthToken } from "@/lib/google-client";
import { filmMessage, filmModeIsOn, runFilmMode } from "@/lib/film-mode";
import type { StremioTarget } from "@/lib/stremio";
import { toIsoDate } from "@/lib/calendar-utils";

const FILM_MODE_KEY = "dashboard-film-mode";
const FILM_MODE_EVENT = "dashboard-film-mode";


/**
 * Filmmodus, gedeeld door de knop in «Aan het kijken» en het bedieningsvenster: dezelfde stand (bewaard op dit
 * toestel) en dezelfde actie. Elke tik stuurt elke stap precies één keer (zie lib/film-mode).
 */
export function useFilmMode() {
  const token = useGoogleAuthToken();
  const [on, setOn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    const read = () => {
      try { setOn(filmModeIsOn(localStorage.getItem(FILM_MODE_KEY), toIsoDate(new Date()))); } catch { /* geen opslag: start uit */ }
    };
    read();
    // Het dashboard blijft dagen open: om middernacht (en bij terugkeren) springt de knop terug naar «Film starten».
    const id = window.setInterval(read, 60_000);
    window.addEventListener(FILM_MODE_EVENT, read);
    window.addEventListener("storage", read);
    document.addEventListener("visibilitychange", read);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(FILM_MODE_EVENT, read);
      window.removeEventListener("storage", read);
      document.removeEventListener("visibilitychange", read);
    };
  }, []);
  React.useEffect(() => {
    if (!message || busy) return;
    const id = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(id);
  }, [message, busy]);
  /** `target` (enkel bij starten): opent die titel ook in Stremio. Mag een belofte zijn (IMDb-nummer opzoeken). */
  const setMode = async (start: boolean, target?: StremioTarget | null | Promise<StremioTarget | null>) => {
    if (busy || !token) return;
    setBusy(true);
    setMessage(start ? "Film starten… projector, scherm en licht" : "Film stoppen… projector, scherm en licht");
    try {
      const title = start ? await target : null;
      if (title) setMessage("Film starten… projector, scherm, licht en Stremio");
      const result = await runFilmMode(start, token, title);
      setMessage(filmMessage(start, result));
      // De stand wisselt ook bij een gedeeltelijke fout: de knop toont dan wat je daarna wil doen.
      setOn(start);
      try { localStorage.setItem(FILM_MODE_KEY, start ? `on:${toIsoDate(new Date())}` : "off"); } catch { /* negeren */ }
      window.dispatchEvent(new Event(FILM_MODE_EVENT));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (target?: StremioTarget | null | Promise<StremioTarget | null>) => setMode(!on, target);
  return { on, busy, message, toggle, setMode, disabled: busy || !token };
}
