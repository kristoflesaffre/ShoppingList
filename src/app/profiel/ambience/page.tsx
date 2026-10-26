"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { PageBackButton } from "@/components/ui/page_back_button";
import { cn } from "@/lib/utils";
import type { AmbienceVideo } from "@/lib/server/ambience-routes";

const QUICK = [
  { label: "Ambience", q: "ambience" },
  { label: "Haardvuur", q: "fireplace ambience" },
  { label: "Regen", q: "rain ambience cozy" },
  { label: "Café", q: "cafe ambience" },
  { label: "Aquarium", q: "aquarium ambience 4k" },
  { label: "Natuur", q: "nature ambience 4k" },
] as const;

const ERRORS: Record<string, string> = {
  "no-api-key": "Zoeken staat nog niet aan: zet YOUTUBE_API_KEY in .env.local op je Mac en herstart de app.",
  "quota-or-key": "YouTube weigert de zoekopdracht (sleutel of daglimiet). Probeer het later opnieuw.",
  "mac-required": "Open de app op je Mac (of op het thuisnetwerk) om de tv te bedienen.",
  "not-configured": "De tv is nog niet gekoppeld.",
  "tv-not-waking": "De tv reageert niet. Staat «Inschakelen met mobiel» aan en zit de netwerkkabel erin?",
  "tv-remote-unauthorized": "De tv weigert de bediening. Koppel opnieuw en klik «Toestaan» op de tv.",
  busy: "De tv is al bezig met een vorige opdracht.",
};

export default function AmbiencePage() {
  const { user, isLoading } = db.useAuth();
  const token = useGoogleAuthToken();
  const router = useRouter();
  const [query, setQuery] = React.useState("ambience");
  const [videos, setVideos] = React.useState<AmbienceVideo[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState<{ id: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => { if (!isLoading && !user) router.replace("/auth"); }, [isLoading, user, router]);

  const search = React.useCallback(async (q: string) => {
    if (!token || !q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSelected(null);
    try {
      const response = await fetch("/api/youtube/search", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify({ q }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "search-failed");
      setVideos(data.videos as AmbienceVideo[]);
    } catch (error) {
      setSearchError(ERRORS[(error as Error).message] ?? "Zoeken lukte niet. Probeer het opnieuw.");
    } finally {
      setSearching(false);
    }
  }, [token]);

  // Meteen zoeken op «ambience» zodra de login er is.
  const searchedOnce = React.useRef(false);
  React.useEffect(() => {
    if (!token || searchedOnce.current) return;
    searchedOnce.current = true;
    void search("ambience");
  }, [token, search]);

  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - playing.startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  const play = async (video: AmbienceVideo) => {
    if (!token || playing) return;
    setPlaying({ id: video.id, startedAt: Date.now() });
    setElapsed(0);
    setMessage(null);
    try {
      const response = await fetch("/api/tv/ambience", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify({ action: "play", videoId: video.id }) });
      const data = await response.json();
      if (!response.ok || !data.accepted) throw new Error(data?.error ?? "command-not-confirmed");
      setMessage(`«${video.title}» speelt op de tv.`);
      setSelected(null);
    } catch (error) {
      setMessage(ERRORS[(error as Error).message] ?? "De tv bevestigde de opdracht niet. Kijk even op de tv en probeer opnieuw.");
    } finally {
      setPlaying(null);
    }
  };

  if (!user) return null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-28">
      <PageBackButton href="/profiel" />
      <header>
        <h1 className="text-3xl font-bold">Ambience</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Kies een video. Pas dan gaat de tv aan, opent YouTube op het profiel van Chloé en start de video.</p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void search(query); }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Zoeken op YouTube"
          className="h-12 min-w-0 flex-1 rounded-pill border border-[var(--border-subtle)] bg-[var(--white)] px-5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
        <button type="submit" disabled={searching || !query.trim()} className="h-12 shrink-0 rounded-pill bg-action-primary px-5 font-bold text-[var(--white)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]">
          Zoeken
        </button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => { setQuery(chip.q); void search(chip.q); }}
            className={cn(
              "h-9 shrink-0 rounded-pill border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              query === chip.q ? "border-transparent bg-action-primary text-[var(--white)]" : "border-[var(--border-subtle)] bg-[var(--white)]",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <p role="status" aria-live="polite" className={cn("text-sm", !playing && !message && "sr-only")}>
        {playing ? `Bezig op de tv: aanzetten, YouTube openen, Chloé kiezen en afspelen… (${elapsed} s)` : message}
      </p>

      {searchError && <p className="rounded-2xl bg-[var(--gray-25)] p-4 text-sm">{searchError}</p>}
      {searching && !videos && <p className="text-sm text-[var(--text-secondary)]">Zoeken…</p>}
      {videos && videos.length === 0 && !searching && <p className="text-sm text-[var(--text-secondary)]">Geen video’s gevonden.</p>}

      {videos && videos.length > 0 && (
        <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", searching && "opacity-60")}>
          {videos.map((video) => {
            const isSelected = selected === video.id;
            const isPlaying = playing?.id === video.id;
            return (
              <li key={video.id}>
                <div className={cn("overflow-hidden rounded-[20px] border bg-[var(--white)] transition-shadow", isSelected ? "border-action-primary shadow-[0_0_0_2px_var(--border-focus)]" : "border-[var(--border-subtle)]")}>
                  <button type="button" onClick={() => setSelected(isSelected ? null : video.id)} aria-pressed={isSelected} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]">
                    <div className="relative aspect-video bg-[var(--gray-25)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {video.duration && <span className="absolute bottom-2 right-2 rounded-md bg-[rgba(16,17,48,0.8)] px-1.5 py-0.5 text-xs font-bold text-[var(--white)]">{video.duration}</span>}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 font-bold">{video.title}</p>
                      <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{video.channel}</p>
                    </div>
                  </button>
                  {isSelected && (
                    <div className="px-3 pb-3">
                      <button type="button" disabled={!!playing} onClick={() => void play(video)} className="h-11 w-full rounded-pill bg-action-primary font-bold text-[var(--white)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]">
                        {isPlaying ? `Bezig… ${elapsed} s` : "▶ Op tv afspelen"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
