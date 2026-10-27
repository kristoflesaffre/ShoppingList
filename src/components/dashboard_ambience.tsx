"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useGoogleAuthToken } from "@/lib/google-client";
import { ambienceShelves, type AmbienceShelf } from "@/lib/ambience-seasons";
import {
  ambienceAvailable,
  ambienceErrorText,
  cachedAmbience,
  getPlayState,
  onLastAmbienceChange,
  playAmbienceOnTv,
  prefetchAmbience,
  readLastAmbience,
  saveLastAmbience,
  searchAmbience,
  setPlayState,
  subscribePlayState,
  tvPlaybackCommand,
  type AmbienceVideo,
} from "@/lib/ambience-client";
import { cn } from "@/lib/utils";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { MiniButton } from "@/components/ui/mini_button";

const tile = "relative overflow-hidden rounded-[24px]";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
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
        setPlayState("playing");
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
    <li className="w-[200px] shrink-0 snap-start md:w-[232px]">
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
            <span key={i} className="h-[170px] w-[200px] shrink-0 md:h-[190px] md:w-[232px] animate-pulse rounded-[18px] bg-fixed-white/[0.06]" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-fixed-white/60">Geen video’s gevonden.</p>
      ) : (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:-mx-7 md:scroll-px-7 md:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    <div role="dialog" aria-modal="true" aria-label="Sfeer op tv" onClick={() => !player.playing && onClose()} className="fixed inset-0 z-[70] flex items-end bg-[rgba(8,9,24,0.6)] pt-10 backdrop-blur-sm motion-safe:animate-fade-up md:items-stretch md:p-7">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full min-h-0 w-full flex-col gap-4 rounded-t-[26px] bg-[linear-gradient(160deg,#232b48_0%,#1a2036_55%,#141a2c_100%)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2.5 text-fixed-white md:h-auto md:gap-5 md:rounded-[28px] md:px-7 md:py-6 shadow-[inset_0_0_0_1px_rgba(160,180,255,0.22),0_40px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        {/* Gsm: blad met greepje; titel + sluiten op één rij, zoeken eronder over de volle breedte. */}
        <span aria-hidden className="mx-auto h-[5px] w-9 shrink-0 rounded-full bg-fixed-white/30 md:hidden" />
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="min-w-0 pr-12 md:pr-0">
            <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/60">SFEER OP TV</p>
            <h2 className="mt-0.5 text-[24px] font-extrabold tracking-[-0.02em] md:text-[30px]">Kies je sfeer</h2>
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
              className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill md:w-[300px] md:flex-none bg-fixed-white/[0.12] pl-4 pr-1.5"
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
            <button type="button" onClick={onClose} disabled={!!player.playing} aria-label="Sluiten" className={cn("absolute right-4 top-6 flex size-10 items-center md:static justify-center rounded-full bg-fixed-white/[0.12] disabled:opacity-40", focusRing)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 pb-2 md:-mx-7 md:px-7">
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
  const playState = React.useSyncExternalStore(subscribePlayState, getPlayState, () => "idle" as const);
  const [toggling, setToggling] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const busy = !!player.playing || toggling;

  /** Pauze ↔ verder via YouTube op de tv; staat de tv uit of weet de app niets, dan opnieuw opzetten. */
  const togglePlay = async () => {
    if (!last || busy) return;
    if (playState === "idle") {
      await player.play(last);
      return;
    }
    setToggling(true);
    try {
      await tvPlaybackCommand(token, playState === "playing" ? "pause" : "resume");
      setPlayState(playState === "playing" ? "paused" : "playing");
    } catch {
      setPlayState("idle");
      if (playState === "paused") await player.play(last);
    } finally {
      setToggling(false);
    }
  };

  const pill = "pointer-events-auto flex h-9 items-center justify-center rounded-pill text-[12.5px] font-extrabold disabled:opacity-70";
  return (
    <section aria-label="Sfeer op tv" className={cn(tile, "flex w-[124px] shrink-0 flex-col bg-[#17131d] text-fixed-white shadow-[0_14px_32px_-24px_rgba(0,0,0,0.65)]")}>
      {/* Only YouTube thumbnails need the zoom that removes their letterbox bars. */}
      <span aria-hidden className={cn("absolute inset-0", last && "scale-[1.34]")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Generated local default or selected YouTube thumbnail. */}
        <img src={last?.thumbnail ?? "/images/ambience/fireplace-default.webp"} alt="" className={cn("size-full object-cover", last ? "aod-kenburns [[data-theme=dark]_&]:brightness-[0.85]" : "origin-top scale-[1.25] object-[50%_30%] brightness-110")} />
      </span>
      {!last ? <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] backdrop-blur-[2px] [mask-image:linear-gradient(180deg,transparent,black)]" /> : null}
      <span aria-hidden className={cn("pointer-events-none absolute inset-0", last ? "bg-[linear-gradient(180deg,rgba(12,10,18,0.35)_0%,rgba(12,10,18,0)_28%,rgba(23,19,29,0.12)_48%,rgba(23,19,29,0.94)_100%)]" : "bg-[linear-gradient(180deg,transparent_50%,rgba(12,10,18,0.2)_75%,rgba(12,10,18,0.38)_100%)]")} />
      <span aria-hidden className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)]" />
      <button type="button" onClick={() => setOpen(true)} aria-label="Sfeer kiezen" className={cn("absolute inset-0 z-[1] rounded-[24px]", focusRing)} />
      <div className={cn("pointer-events-none relative z-[2] flex flex-1 flex-col items-center gap-2 px-2.5 py-3 text-center", last ? "justify-between" : "justify-end")}>
        {last ? <span className="text-[11px] font-extrabold tracking-normal text-fixed-white/90">SFEER OP TV</span> : null}
        <span className="flex w-full flex-col items-center gap-2">
          <span className={cn("line-clamp-3 font-extrabold leading-tight", last ? "text-[12.5px]" : "text-[15px]")}>{last ? player.playing ? `Bezig… ${player.elapsed} s` : last.title : "Sfeer op tv"}</span>
          {last ? (
            <span className="flex w-full items-center gap-1.5">
              <button
                type="button"
                onClick={() => void togglePlay()}
                disabled={busy}
                aria-label={playState === "playing" ? "Pauzeren op de tv" : `«${last.title}» afspelen op de tv`}
                className={cn(pill, "size-9 shrink-0 bg-fixed-white text-[#2a2148]", focusRing)}
              >
                {playState === "playing" ? <PauseIcon className="size-4" /> : <PlayIcon className="ml-0.5 size-4" />}
              </button>
              <button type="button" onClick={() => setOpen(true)} className={cn(pill, "flex-1 bg-fixed-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-[6px]", focusRing)}>
                Wijzig
              </button>
            </span>
          ) : (
            <span className="flex h-9 items-center rounded-pill bg-fixed-white/25 px-3 text-[12.5px] font-extrabold">Kiezen</span>
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

/* ---------------- Startpagina «Woonkamer»: tv met sfeer starten ---------------- */

/** Witte kaart onder de woonkamerbediening: laatste sfeer opnieuw starten of een andere kiezen. Enkel als de tv bedienbaar is. */
export function AmbienceLauncherOrNothing() {
  const token = useGoogleAuthToken();
  const [available, setAvailable] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    void ambienceAvailable(token).then((ok) => active && setAvailable(ok));
    return () => {
      active = false;
    };
  }, [token]);
  return available ? <AmbienceLauncher /> : null;
}

function AmbienceLauncher() {
  const token = useGoogleAuthToken();
  const last = useLastAmbience();
  const player = useTvPlayer(token);
  const [open, setOpen] = React.useState(false);
  return (
    <section aria-label="Sfeer op tv" className="flex min-w-0 items-center gap-3 rounded-[20px] bg-[var(--white)] p-2.5 pr-3 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
      <span aria-hidden className="relative aspect-video w-[96px] shrink-0 overflow-hidden rounded-[12px] bg-[#17131d]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Generated local default or selected YouTube thumbnail. */}
        <img src={last?.thumbnail ?? "/images/ambience/fireplace-default.webp"} alt="" className={cn("size-full object-cover", last && "scale-[1.34]")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">Tv met sfeer</span>
        <span role="status" aria-live="polite" className="block truncate text-[12.5px] leading-4 text-[var(--text-secondary)]">
          {player.playing ? `Tv aanzetten en afspelen… ${player.elapsed} s` : player.message ?? last?.title ?? "Haardvuur, regen, sneeuw… op de tv"}
        </span>
      </span>
      {last ? (
        <RoundIconButton tone="primary" size={36} aria-label={`«${last.title}» afspelen op de tv`} disabled={!!player.playing || !token} onClick={() => void player.play(last)}>
          <PlayIcon className="ml-0.5" />
        </RoundIconButton>
      ) : null}
      <MiniButton variant="secondary" onClick={() => setOpen(true)} disabled={!!player.playing}>{last ? "Wijzig" : "Kies sfeer"}</MiniButton>
      {open ? <AmbienceModal onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
