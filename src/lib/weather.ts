"use client";

import * as React from "react";

/**
 * Weer voor het tablet-dashboard via Open-Meteo (gratis, geen sleutel). Vaste plaats (Kontich);
 * vandaag per uur + morgen als min/max. Ververst elke 30 minuten.
 */

export type WeatherKind = "zon" | "half" | "bewolkt" | "mist" | "regen" | "buien" | "onweer" | "sneeuw";

export type WeatherHour = { hour: number; kind: WeatherKind; temp: number; rainChance: number };
export type WeatherDay = { kind: WeatherKind; max: number; min: number; label: string };
export type Weather = {
  place: string;
  now: { kind: WeatherKind; temp: number; label: string };
  today: WeatherDay;
  tomorrow: WeatherDay;
  /** Volgende uren vanaf nu (maximaal 6). */
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
  daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
};

export function parseWeather(json: OpenMeteo, now: Date = new Date()): Weather | null {
  const daily = json.daily;
  if (!json.current || !daily?.weather_code || daily.weather_code.length < 2) return null;
  const day = (i: number): WeatherDay => {
    const w = weatherFromCode(daily.weather_code?.[i] ?? 3);
    return { kind: w.kind, label: w.label, max: Math.round(daily.temperature_2m_max?.[i] ?? 0), min: Math.round(daily.temperature_2m_min?.[i] ?? 0) };
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
    if (hours.length < 6) {
      hours.push({ hour, kind: weatherFromCode(json.hourly?.weather_code?.[i] ?? 3).kind, temp: Math.round(json.hourly?.temperature_2m?.[i] ?? 0), rainChance });
    }
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
      url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
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
