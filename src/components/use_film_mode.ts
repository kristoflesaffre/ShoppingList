"use client";

import * as React from "react";
import { useGoogleAuthToken } from "@/lib/google-client";
import { filmMessage, runFilmMode } from "@/lib/film-mode";

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
      try { setOn(localStorage.getItem(FILM_MODE_KEY) === "on"); } catch { /* geen opslag: start uit */ }
    };
    read();
    window.addEventListener(FILM_MODE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(FILM_MODE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  React.useEffect(() => {
    if (!message || busy) return;
    const id = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(id);
  }, [message, busy]);
  const setMode = async (start: boolean) => {
    if (busy || !token) return;
    setBusy(true);
    setMessage(start ? "Film starten… projector, scherm en licht" : "Film stoppen… projector, scherm en licht");
    try {
      const result = await runFilmMode(start, token);
      setMessage(filmMessage(start, result));
      // De stand wisselt ook bij een gedeeltelijke fout: de knop toont dan wat je daarna wil doen.
      setOn(start);
      try { localStorage.setItem(FILM_MODE_KEY, start ? "on" : "off"); } catch { /* negeren */ }
      window.dispatchEvent(new Event(FILM_MODE_EVENT));
    } finally {
      setBusy(false);
    }
  };
  const toggle = () => setMode(!on);
  return { on, busy, message, toggle, setMode, disabled: busy || !token };
}
