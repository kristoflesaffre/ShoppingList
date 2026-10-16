"use client";

import * as React from "react";

/**
 * Weer voor het tablet-dashboard via Open-Meteo (gratis, geen sleutel). Vaste plaats (Kontich);
 * vandaag per uur + morgen als min/max. Ververst elke 30 minuten.
 */

export type WeatherKind = "zon" | "half" | "bewolkt" | "mist" | "regen" | "buien" | "onweer" | "sneeuw";

export type WeatherHour = { hour: number; kind: WeatherKind; temp: number; rainChance: number };
/**
 * Een hele dag: `kind`/`label` uit de daggemiddelde weercode van Open-Meteo (zoals weer-apps het dagbeeld
 * tonen: een buiige dag is «buien», ook al schijnt nu de zon), `rainChance` = hoogste kans op neerslag (%).
 */
export type WeatherDay = { kind: WeatherKind; max: number; min: number; label: string; rainChance: number };
export type Weather = {
  place: string;
  now: { kind: WeatherKind; temp: number; label: string };
  today: WeatherDay;
  tomorrow: WeatherDay;
  /** Alle uren van vandaag vanaf nu (tot en met 23 u); kies er een spreiding uit met `spreadHours`. */
  hours: WeatherHour[];
  /** Eerste uur vandaag met kans op regen ≥ 50 %, of null. */
  rainFromHour: number | null;
};

export const WEATHER_PLACE = { name: "Kontich", latitude: 51.1345, longitude: 4.4447 };

/** WMO-weercode → soort + Nederlandse omschrijving. */
export function weatherFromCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "zon", label: "Zonnig" };
  if (code === 1) return { kind: "zon", label: "Overwegend zonnig" };
  if (code === 2) return { kind: "half", label: "Half bewolkt" };
  if (code === 3) return { kind: "bewolkt", label: "Bewolkt" };
  if (code === 45 || code === 48) return { kind: "mist", label: "Mist" };
  if (code >= 51 && code <= 57) return { kind: "regen", label: "Motregen" };
  if (code >= 61 && code <= 67) return { kind: "regen", label: "Regen" };
  if (code >= 71 && code <= 77) return { kind: "sneeuw", label: "Sneeuw" };
  if (code >= 80 && code <= 82) return { kind: "buien", label: "Buien" };
  if (code === 85 || code === 86) return { kind: "sneeuw", label: "Sneeuwbuien" };
  if (code >= 95) return { kind: "onweer", label: "Onweer" };
  return { kind: "bewolkt", label: "Bewolkt" };
}

type OpenMeteo = {
  current?: { temperature_2m?: number; weather_code?: number };
  hourly?: { time?: string[]; temperature_2m?: number[]; weather_code?: number[]; precipitation_probability?: number[] };
  daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] };
};

export function parseWeather(json: OpenMeteo, now: Date = new Date()): Weather | null {
  const daily = json.daily;
  if (!json.current || !daily?.weather_code || daily.weather_code.length < 2) return null;
  const day = (i: number): WeatherDay => {
    const w = weatherFromCode(daily.weather_code?.[i] ?? 3);
    return {
      kind: w.kind,
      label: w.label,
      max: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      min: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      rainChance: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
    };
  };
  const cur = weatherFromCode(json.current.weather_code ?? 3);
  const times = json.hourly?.time ?? [];
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hours: WeatherHour[] = [];
  let rainFromHour: number | null = null;
  times.forEach((t, i) => {
    if (!t.startsWith(todayKey)) return;
    const hour = Number(t.slice(11, 13));
    const rainChance = json.hourly?.precipitation_probability?.[i] ?? 0;
    if (hour < now.getHours()) return;
    if (rainFromHour == null && rainChance >= 50) rainFromHour = hour;
    hours.push({ hour, kind: weatherFromCode(json.hourly?.weather_code?.[i] ?? 3).kind, temp: Math.round(json.hourly?.temperature_2m?.[i] ?? 0), rainChance });
  });
  return {
    place: WEATHER_PLACE.name,
    now: { kind: cur.kind, label: cur.label, temp: Math.round(json.current.temperature_2m ?? 0) },
    today: day(0),
    tomorrow: day(1),
    hours,
    rainFromHour,
  };
}

/**
 * `count` uren gelijk verspreid van nu tot de avond (`lastHour`, standaard 22 u), zodat je ziet hoe de
 * hele dag verloopt i.p.v. enkel de komende uren. Het eerste uur is altijd «nu»; zijn er minder uren
 * over dan `count`, dan tonen we ze allemaal.
 */
export function spreadHours(hours: readonly WeatherHour[], count: number, lastHour = 22): WeatherHour[] {
  const until = hours.filter((h, i) => i === 0 || h.hour <= lastHour);
  if (count <= 0 || until.length === 0) return [];
  if (until.length <= count) return [...until];
  if (count === 1) return [until[0]];
  // Vaste stap in hele uren, terugtellend vanaf de avond: «Nu, 7u, 10u, 13u, …, 22u» i.p.v. 2-3-2-3.
  const first = until[0].hour;
  const last = until[until.length - 1].hour;
  const step = Math.ceil((last - first) / (count - 1));
  const byHour = new Map(until.map((h) => [h.hour, h]));
  const picked: WeatherHour[] = [];
  for (let h = last; h > first; h -= step) {
    const hit = byHour.get(h);
    if (hit) picked.unshift(hit);
  }
  return [until[0], ...picked];
}

export function useWeather(): Weather | null {
  const [weather, setWeather] = React.useState<Weather | null>(null);
  React.useEffect(() => {
    let active = true;
    const load = () => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(WEATHER_PLACE.latitude));
      url.searchParams.set("longitude", String(WEATHER_PLACE.longitude));
      url.searchParams.set("current", "temperature_2m,weather_code");
      url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
      url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
      url.searchParams.set("timezone", "Europe/Brussels");
      url.searchParams.set("forecast_days", "2");
      fetch(url, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<OpenMeteo>) : null))
        .then((json) => {
          if (active && json) setWeather(parseWeather(json));
        })
        .catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 30 * 60_000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, []);
  return weather;
}
