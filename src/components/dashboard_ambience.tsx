"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useGoogleAuthToken } from "@/lib/google-client";
import { ambienceShelves, type AmbienceShelf } from "@/lib/ambience-seasons";
import {
  ambienceAvailable,
  ambienceErrorText,
  cachedAmbience,
  onLastAmbienceChange,
  playAmbienceOnTv,
  prefetchAmbience,
  readLastAmbience,
  saveLastAmbience,
  searchAmbience,
  type AmbienceVideo,
} from "@/lib/ambience-client";
import { cn } from "@/lib/utils";

const tile = "relative overflow-hidden rounded-[24px]";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white";

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.5c.6 3-1.6 4.6-2.9 6.4C7.9 10.6 7 12.1 7 14.2a5 5 0 0 0 10 0c0-1.7-.7-3-1.5-4.1-.2 1.2-.8 2.2-1.9 2.6.6-3.6-.4-7.6-1.6-10.2z" />
    </svg>
  );
}
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}
function TvIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function useLastAmbience(): AmbienceVideo | null {
  const [last, setLast] = React.useState<AmbienceVideo | null>(null);
  React.useEffect(() => {
    setLast(readLastAmbience());
    return onLastAmbienceChange(() => setLast(readLastAmbience()));
  }, []);
  return last;
}

/** Eén video afspelen op de tv, met teller en foutmelding; gedeeld door de tegel en het venster. */
function useTvPlayer(token: string | null) {
  const [playing, setPlaying] = React.useState<{ id: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [message, setMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - playing.startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [playing]);
  const play = React.useCallback(
    async (video: AmbienceVideo): Promise<boolean> => {
      if (!token || playing) return false;
      setPlaying({ id: video.id, startedAt: Date.now() });
      setElapsed(0);
      setMessage(null);
      try {
        await playAmbienceOnTv(token, video.id);
        saveLastAmbience(video);
        setMessage(`«${video.title}» speelt op de tv.`);
        return true;
      } catch (error) {
        setMessage(ambienceErrorText((error as Error).message, "De tv bevestigde de opdracht niet. Kijk even op de tv en probeer opnieuw."));
        return false;
      } finally {
        setPlaying(null);
      }
    },
    [token, playing],
  );
  return { playing, elapsed, message, play };
}

/* ---------------- Venster (A3: rijen per stemming, seizoen bovenaan) ---------------- */

function VideoCard({ video, busy, locked, elapsed, onPlay }: { video: AmbienceVideo; busy: boolean; locked: boolean; elapsed: number; onPlay: () => void }) {
  return (
    <li className="w-[232px] shrink-0 snap-start">
      <button
        type="button"
        onClick={onPlay}
        disabled={locked}
        aria-label={`«${video.title}» op tv afspelen`}
        className={cn(
          "flex w-full flex-col gap-2 rounded-[18px] p-2 text-left transition-[background-color,box-shadow,opacity] disabled:cursor-default",
          busy ? "bg-fixed-white/[0.14] shadow-[0_0_0_2.5px_#b9a8ff]" : "bg-fixed-white/[0.06] [@media(hover:hover)]:hover:bg-fixed-white/[0.1]",
          locked && !busy && "opacity-50",
          focusRing,
        )}
      >
        <span className="relative block aspect-video overflow-hidden rounded-[12px] bg-[#2a2148]">
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube-miniatuur */}
          <img src={video.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
          {video.duration ? (
            <span className={cn("absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold", video.live ? "bg-[#e5384f]" : "bg-[rgba(10,10,20,0.82)]")}>
              {video.live ? "● LIVE" : video.duration}
            </span>
          ) : null}
          {busy ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(14,12,32,0.62)] text-[13px] font-extrabold">
              <TvIcon className="size-6 motion-safe:animate-pulse" />
              Naar de tv… {elapsed} s
            </span>
          ) : null}
        </span>
        <span className="px-0.5">
          <span className="line-clamp-2 text-[13px] font-bold leading-[1.3]">{video.title}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-fixed-white/60">{video.channel}</span>
        </span>
      </button>
    </li>
  );
}

function Shelf({
  shelf,
  seasonal,
  token,
  player,
  onPlayed,
}: {
  shelf: AmbienceShelf;
  seasonal: boolean;
  token: string | null;
  player: ReturnType<typeof useTvPlayer>;
  onPlayed: () => void;
}) {
  const [videos, setVideos] = React.useState<AmbienceVideo[] | null>(() => cachedAmbience(shelf.query));
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    setVideos(cachedAmbience(shelf.query));
    setError(null);
    searchAmbience(token, shelf.query)
      .then((v) => active && setVideos(v))
      .catch((e: Error) => active && setError(ambienceErrorText(e.message, "Kon deze rij niet laden.")));
    return () => {
      active = false;
    };
  }, [token, shelf.query]);
  return (
    <section aria-label={shelf.label} className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-[17px] font-extrabold">
        {shelf.label}
        {seasonal ? <span className="rounded-pill bg-[linear-gradient(135deg,rgba(255,176,103,0.35),rgba(229,97,138,0.35))] px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-[#ffd8b8]">NU IN HET SEIZOEN</span> : null}
      </h3>
      {error ? (
        <p className="rounded-[16px] bg-fixed-white/[0.06] px-4 py-3 text-sm text-fixed-white/70">{error}</p>
      ) : !videos ? (
        <div className="flex gap-3" aria-busy aria-label={`${shelf.label} laden`}>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="h-[190px] w-[232px] shrink-0 animate-pulse rounded-[18px] bg-fixed-white/[0.06]" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-fixed-white/60">Geen video’s gevonden.</p>
      ) : (
        <ul className="-mx-7 flex snap-x gap-3 overflow-x-auto scroll-px-7 px-7 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              busy={player.playing?.id === v.id}
              locked={!!player.playing}
              elapsed={player.elapsed}
              onPlay={() => void player.play(v).then((ok) => ok && onPlayed())}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AmbienceModal({ onClose }: { onClose: () => void }) {
  const token = useGoogleAuthToken();
  const player = useTvPlayer(token);
  const [draft, setDraft] = React.useState("");
  const [query, setQuery] = React.useState<string | null>(null);
  const shelves = React.useMemo(() => ambienceShelves(new Date()), []);
  const seasonalCount = shelves.findIndex((s) => s.key === "haardvuur");
  const playingRef = React.useRef(player.playing);
  playingRef.current = player.playing;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !playingRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onPlayed = React.useCallback(() => window.setTimeout(onClose, 1400), [onClose]);
  const searchShelf: AmbienceShelf | null = query ? { key: "zoek", label: `Zoekresultaten voor «${query}»`, query } : null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Sfeer op tv" onClick={() => !player.playing && onClose()} className="fixed inset-0 z-[70] flex bg-[rgba(8,9,24,0.6)] p-7 backdrop-blur-sm motion-safe:animate-fade-up">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 w-full flex-col gap-5 rounded-[28px] bg-[linear-gradient(160deg,#232b48_0%,#1a2036_55%,#141a2c_100%)] px-7 py-6 text-fixed-white shadow-[inset_0_0_0_1px_rgba(160,180,255,0.22),0_40px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/60">SFEER OP TV</p>
            <h2 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.02em]">Kies je sfeer</h2>
            <p role="status" aria-live="polite" className={cn("mt-1 text-sm text-fixed-white/75", !player.playing && !player.message && "sr-only")}>
              {player.playing ? `Bezig op de tv: aanzetten, YouTube openen, Chloé kiezen en afspelen… (${player.elapsed} s)` : player.message}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = draft.trim();
                setQuery(q || null);
              }}
              className="flex h-11 w-[300px] items-center gap-2 rounded-pill bg-fixed-white/[0.12] pl-4 pr-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4 shrink-0 text-fixed-white/70">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (!e.target.value) setQuery(null);
                }}
                placeholder="Zoek op YouTube"
                aria-label="Zoek op YouTube"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-fixed-white placeholder:text-fixed-white/50 focus:outline-none"
              />
            </form>
            <button type="button" onClick={onClose} disabled={!!player.playing} aria-label="Sluiten" className={cn("flex size-10 items-center justify-center rounded-full bg-fixed-white/[0.12] disabled:opacity-40", focusRing)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="-mx-7 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-7 pb-2">
          {searchShelf ? <Shelf key={searchShelf.query} shelf={searchShelf} seasonal={false} token={token} player={player} onPlayed={onPlayed} /> : null}
          {shelves.map((shelf, i) => (
            <Shelf key={shelf.key} shelf={shelf} seasonal={i < seasonalCount} token={token} player={player} onPlayed={onPlayed} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Tegel in de avondkolom (A1, even breed als «Morgen») ---------------- */

export function DashboardAmbienceTile() {
  const token = useGoogleAuthToken();
  const last = useLastAmbience();
  const player = useTvPlayer(token);
  const [open, setOpen] = React.useState(false);
  const busy = !!player.playing;
  return (
    <section aria-label="Sfeer op tv" className={cn(tile, "flex w-[124px] shrink-0 flex-col bg-[linear-gradient(165deg,#ff9a5a,#e5618a_70%)] text-fixed-white shadow-[0_14px_32px_-24px_rgba(229,97,138,0.8)] [[data-theme=dark]_&]:bg-[linear-gradient(165deg,#5a2a3a,#3a1f36_60%,#261630)] [[data-theme=dark]_&]:shadow-[0_0_0_1px_#4a2a40] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px]")}>
      {last ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube-miniatuur van de laatst gekozen sfeer */}
          <img src={last.thumbnail} alt="" className="aod-kenburns absolute inset-0 size-full object-cover [[data-theme=dark]_&]:brightness-[0.75]" />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0)_30%,rgba(20,10,30,0.88)_100%)]" />
        </>
      ) : null}
      <button type="button" onClick={() => setOpen(true)} aria-label="Sfeer kiezen" className={cn("absolute inset-0 z-[1] rounded-[24px]", focusRing)} />
      <div className="pointer-events-none relative z-[2] flex flex-1 flex-col items-center justify-between gap-2 px-2.5 py-3 text-center">
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-fixed-white/90">SFEER</span>
        {last ? null : <FlameIcon className="size-14 text-fixed-white/90 drop-shadow-[0_8px_14px_rgba(120,20,40,0.45)]" />}
        <span className="flex w-full flex-col items-center gap-2">
          <span className="line-clamp-3 text-[12.5px] font-extrabold leading-tight">{busy ? `Bezig… ${player.elapsed} s` : last ? last.title : "Ambience op tv"}</span>
          {last ? (
            <button
              type="button"
              onClick={() => void player.play(last)}
              disabled={busy}
              aria-label={`«${last.title}» opnieuw op tv afspelen`}
              className={cn("pointer-events-auto flex h-8 items-center gap-1.5 rounded-pill bg-fixed-white px-3 text-[12px] font-extrabold text-[#2a2148] disabled:opacity-70", focusRing)}
            >
              <PlayIcon className="size-3" />
              Opzetten
            </button>
          ) : (
            <span className="flex h-8 items-center rounded-pill bg-fixed-white/25 px-3 text-[12px] font-extrabold">Kiezen</span>
          )}
        </span>
      </div>
      {player.message && !busy ? <span className="sr-only" role="status">{player.message}</span> : null}
      {open ? <AmbienceModal onClose={() => setOpen(false)} /> : null}
    </section>
  );
}

/** Toont de sfeertegel enkel als de tv vanaf hier bedienbaar is (Mac/thuisnetwerk); anders `fallback`. */
export function AmbienceTileOr({ fallback }: { fallback: React.ReactNode }) {
  const token = useGoogleAuthToken();
  const [available, setAvailable] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    void ambienceAvailable(token).then((ok) => {
      if (!active) return;
      setAvailable(ok);
      // Rijen van het venster alvast laden, zodat het meteen gevuld opent.
      if (ok) prefetchAmbience(token, ambienceShelves(new Date()).map((s) => s.query));
    });
    return () => {
      active = false;
    };
  }, [token]);
  return available ? <DashboardAmbienceTile /> : <>{fallback}</>;
}
