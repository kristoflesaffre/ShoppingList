"use client";

import * as React from "react";
import Link from "next/link";
import { useStremio } from "@/hooks/use_stremio";
import { stremioProgressLabel, stremioTimeLabel } from "@/lib/stremio-progress";

const button = "min-h-11 rounded-lg bg-[var(--blue-500)] px-4 py-2 text-sm font-bold text-fixed-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

export function StremioConnection() {
  const state = useStremio();
  const [replace, setReplace] = React.useState(false);
  return <section className="mt-5 border-t border-[var(--border-subtle)] pt-5">
    <h2 className="text-lg font-bold text-[var(--text-primary)]">Stremio</h2>
    {state.loading ? <p role="status" className="mt-2 text-sm">Koppeling controleren...</p> : <>
      {state.connected ? <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">Gekoppeld · {state.items.length} titels</span>
        <button type="button" disabled={state.busy} className="min-h-11 text-sm font-semibold text-[var(--blue-500)] disabled:opacity-40" onClick={() => void state.refresh()}>Vernieuwen</button>
        <button type="button" disabled={state.busy} className="min-h-11 text-sm font-semibold text-[var(--blue-500)] disabled:opacity-40" onClick={() => setReplace(!replace)}>Opnieuw aanmelden</button>
        <button type="button" disabled={state.busy} className="min-h-11 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-40" onClick={() => void state.disconnect()}>Ontkoppelen</button>
      </div> : null}
      {!state.connected || replace ? <form className="mt-3 flex max-w-md flex-col gap-3" onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget, values = new FormData(form);
        const email = String(values.get("email") ?? ""), password = String(values.get("password") ?? "");
        (form.elements.namedItem("password") as HTMLInputElement).value = "";
        void state.connect(email, password).then(ok => { if (ok) { form.reset(); setReplace(false); } });
      }}>
        <label className="flex flex-col gap-1 text-sm font-semibold">Stremio-e-mailadres<input required name="email" type="email" autoComplete="username" maxLength={254} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--white)] px-3 font-normal" /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Stremio-wachtwoord<input required name="password" type="password" autoComplete="current-password" maxLength={4096} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--white)] px-3 font-normal" /></label>
        <p className="text-xs leading-5 text-[var(--text-secondary)]">Je inloggegevens gaan via deze server naar Stremio. Je wachtwoord wordt niet bewaard; je sessiesleutel wordt versleuteld opgeslagen. De koppeling leest alleen en wijzigt je Stremio-bibliotheek niet.</p>
        <button type="submit" disabled={state.busy} className={`${button} self-start`}>{state.busy ? "Koppelen..." : "Stremio koppelen"}</button>
      </form> : null}
    </>}
    {state.error ? <p role="alert" className="mt-3 text-sm text-[var(--text-secondary)]">{state.error}</p> : null}
    {state.syncedAt ? <p className="mt-2 text-xs text-[var(--text-secondary)]">Laatst opgehaald: {new Date(state.syncedAt).toLocaleString("nl-BE")}</p> : null}
  </section>;
}

export function StremioEpisodeStatus({ imdbId, tmdbId, tone = "default", at }: {
  imdbId?: string | null; tmdbId?: string;
  /** `cinema`: op het donkere doek; staat Stremio op deze aflevering (`at`), dan een dun voortgangsbalkje. */
  tone?: "default" | "cinema"; at?: { s: number; e: number };
}) {
  const state = useStremio();
  if (state.loading) return null;
  if (tone === "cinema") return <CinemaStatus state={state} imdbId={imdbId} tmdbId={tmdbId} at={at} />;
  if (!state.connected) return <Link href="/films-series/instellingen" className="mt-3 inline-block text-sm font-semibold text-[var(--blue-500)]">Stremio koppelen</Link>;
  const item = state.items.find(item => item.imdbId === imdbId);
  if (!item) return <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{state.error ?? "Nog geen Stremio-voortgang voor deze titel."}</p>;
  return <div className="mt-3 text-sm text-[var(--text-secondary)]">
    <p>Stremio: {stremioProgressLabel(item)}{state.error ? " · mogelijk verouderd" : ""}</p>
    {tmdbId && item.type === "tv" ? <Link href={`/films-series/tv-${tmdbId}/episodes/s${item.season}e${item.episode}`} className="mt-1 inline-block font-semibold text-[var(--blue-500)]">Naar deze aflevering</Link> : null}
  </div>;
}

function CinemaStatus({ state, imdbId, tmdbId, at }: { state: ReturnType<typeof useStremio>; imdbId?: string | null; tmdbId?: string; at?: { s: number; e: number } }) {
  if (!state.connected) return <Link href="/films-series/instellingen" className="mt-3.5 inline-block text-[13px] font-semibold text-fixed-white/70 underline-offset-2 hover:underline">Stremio koppelen</Link>;
  const item = state.items.find(item => item.imdbId === imdbId);
  if (!item) return null;
  const stale = state.error ? " · mogelijk verouderd" : "";
  if (item.type === "tv" && at && (item.season !== at.s || item.episode !== at.e)) {
    return <p className="mt-3.5 text-[13px] font-semibold text-fixed-white/60">
      Stremio staat op S{item.season} A{item.episode}{stale}
      {tmdbId ? <> · <Link href={`/films-series/tv-${tmdbId}/episodes/s${item.season}e${item.episode}`} className="text-fixed-white underline-offset-2 hover:underline">Naar die aflevering</Link></> : null}
    </p>;
  }
  const left = item.durationMs ? Math.max(0, Math.round((item.durationMs - item.positionMs) / 60_000)) : null;
  return <div className="mt-3.5 flex items-center gap-3 text-[13px] font-semibold text-fixed-white/65">
    <span role="progressbar" aria-label="Voortgang in Stremio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percent ?? 0}
      className="h-[5px] w-24 shrink-0 overflow-hidden rounded-pill bg-fixed-white/20 lg:w-[140px]">
      <span className="block h-full rounded-pill bg-fixed-white" style={{ width: `${item.percent ?? 0}%` }} />
    </span>
    <span className="min-w-0 truncate">Stremio{left != null ? ` · nog ${left} min` : ""} · {stremioTimeLabel(item)}{stale}</span>
  </div>;
}
