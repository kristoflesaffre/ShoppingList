"use client";

import * as React from "react";
import { toIsoDate } from "@/lib/calendar-utils";

/** Hoe vaak we nakijken of het al een nieuwe dag is (ook als het scherm slaapt of in always-on staat). */
const CHECK_MS = 60_000;

/**
 * De datum van vandaag («2026-11-09») die mee verspringt om middernacht. Een scherm dat dagen open blijft
 * (het tablet-dashboard) toont zo nooit het eten van gisteren. Kijkt elke minuut na en meteen bij terugkeren.
 */
export function useCurrentDay(): string {
  const [day, setDay] = React.useState(() => toIsoDate(new Date()));
  React.useEffect(() => {
    const check = () => setDay(toIsoDate(new Date()));
    const id = window.setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);
  return day;
}
