"use client";

import * as React from "react";
import { toIsoDate } from "@/lib/calendar-utils";
import { useWakeRefresh } from "@/hooks/use_wake_refresh";

/** Hoe vaak we nakijken of het al een nieuwe dag is (naast middernacht en wakker worden). */
const CHECK_MS = 60_000;

/**
 * De datum van vandaag («2026-11-09») die mee verspringt om middernacht. Een scherm dat dagen open blijft
 * (kalender en tablet-dashboard) toont zo nooit het eten van gisteren. Kijkt elke minuut na, precies na middernacht
 * en meteen bij wakker worden (zie `useWakeRefresh`).
 */
export function useCurrentDay(): string {
  const [day, setDay] = React.useState(() => toIsoDate(new Date()));
  useWakeRefresh(() => setDay(toIsoDate(new Date())), CHECK_MS);
  return day;
}
