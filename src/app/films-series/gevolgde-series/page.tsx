"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { SearchBar } from "@/components/ui/search_bar";
import { Shimmer } from "@/components/ui/shimmer";
import { Snackbar } from "@/components/ui/snackbar";
import { Poster } from "@/components/films/film_tiles";
import { FollowedSeriesTile, useFollowedSeriesOrder } from "@/components/films/series_follow";
import { useFollowedSeries, useUnreviewedOngoingSeries, type FollowedSeries } from "@/hooks/use_series_follow";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";

type SearchResult = { id: string; tmdbId: number; type: "movie" | "tv"; title: string; year: string; posterUrl: string | null };

/** Series zoeken bij TMDB (zelfde route als de zoekbalk op «Films & series»), enkel series. */
function useSeriesSearch(query: string) {
  const [results, setResults] = React.useState<FollowedSeries[] | null>(null);
  React.useEffect(() => {
    const q = query.trim();
    setResults(null);
    if (q.length < 2) return;
    const controller = new AbortController();
    const id = window.setTimeout(() => {
      fetch(`/api/films/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ results?: SearchResult[] }>) : { results: [] }))
        .then((d) =>
          setResults(
            (d.results ?? [])
              .filter((r) => r.type === "tv")
              .map((r) => ({ tmdbId: String(r.tmdbId), title: r.title, year: r.year, posterUrl: r.posterUrl })),
          ),
        )
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query]);
  return results;
}

/**
 * «Lopende series die je volgt»: alle gevolgde series met de stand van het volgende seizoen.
 * Zoeken om er een bij te zetten, ✕ om te stoppen met volgen (met «Zet terug»).
 */
export default function GevolgdeSeriesPage() {
  const router = useRouter();
  const { followed, loading, follow, unfollow, isFollowing } = useFollowedSeries();
  const unreviewed = useUnreviewedOngoingSeries(true);
  const [query, setQuery] = React.useState("");
  const results = useSeriesSearch(query);
  const { sorted: sortedFollowed, onOrder } = useFollowedSeriesOrder(followed);
  const [snackbar, setSnackbar] = React.useState<{ message: string; undo: () => void } | null>(null);
  const snackbarTimer = React.useRef<number | null>(null);
  const showSnackbar = (message: string, undo: () => void) => {
    if (snackbarTimer.current) window.clearTimeout(snackbarTimer.current);
    setSnackbar({ message, undo });
    snackbarTimer.current = window.setTimeout(() => setSnackbar(null), 5000);
  };
  React.useEffect(() => () => {
    if (snackbarTimer.current) window.clearTimeout(snackbarTimer.current);
  }, []);

  const handleUnfollow = (series: FollowedSeries) => {
    void unfollow(series.tmdbId);
    showSnackbar(`Je volgt ${series.title || "deze serie"} niet meer`, () => void follow(series));
  };

  const searching = query.trim().length >= 2;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:gap-5 lg:pt-10">
        {/* Mobiel: terug · titel; desktop: ronde terugknop naast de grote titel */}
        <div className="flex h-11 items-center gap-2 lg:hidden">
          <button type="button" aria-label="Terug naar films en series" onClick={() => router.push("/films-series")} className={headerRoundButtonClass}>
            {RoundIcons.back}
          </button>
        </div>
        {/* Desktop: zoekveld rechts van de titel, smal; gsm: eronder over de volle breedte */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
          <PageBackButton href="/films-series" label="Terug naar films en series" className="hidden lg:inline-flex" />
          <h1 className="min-w-0 flex-1 text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">Series die je volgt</h1>
          <div className="w-full lg:w-[300px] lg:shrink-0">
            <SearchBar surface="app" value={query} onValueChange={setQuery} placeholder="Serie zoeken om te volgen" aria-label="Serie zoeken om te volgen" />
          </div>
        </div>

        {searching ? (
          <section aria-label="Zoekresultaten" className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
            {results === null ? (
              <div className="flex flex-col gap-3 p-4">
                <Shimmer className="h-[66px] rounded-[12px]" />
                <Shimmer className="h-[66px] rounded-[12px]" />
              </div>
            ) : results.length === 0 ? (
              <p className="p-4 text-[14.5px] text-[var(--text-secondary)]">Geen series gevonden.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {results.map((r) => {
                  const following = isFollowing(r.tmdbId);
                  return (
                    <li key={r.tmdbId} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-11 shrink-0">
                        <Poster src={r.posterUrl} alt="" className="rounded-[8px] shadow-none" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-[var(--text-primary)]">{r.title}</p>
                        {r.year ? <p className="text-[13px] text-[var(--text-secondary)]">{r.year}</p> : null}
                      </div>
                      <Button
                        variant={following ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => (following ? handleUnfollow(r) : void follow(r))}
                        aria-pressed={following}
                      >
                        {following ? "Volg je" : "Volgen"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {unreviewed && unreviewed.length > 0 && !searching ? (
          <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--white)] px-4 py-3 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
            <p className="text-[14px] leading-5 text-[var(--text-secondary)]">
              Nog <span className="font-bold text-[var(--text-primary)]">{unreviewed.length}</span> lopende series om te overlopen
            </p>
            <Button variant="secondary" size="sm" onClick={() => router.push("/films-series/series-volgen")}>
              Overlopen
            </Button>
          </div>
        ) : null}

        <section aria-label="Gevolgde series" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {followed.length} {followed.length === 1 ? "serie" : "series"}
          </h2>
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 lg:gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Shimmer key={i} className="aspect-[2/3] rounded-[14px]" />
              ))}
            </div>
          ) : followed.length === 0 ? (
            <p className="text-[14.5px] text-[var(--text-secondary)]">Je volgt nog geen series. Zoek er een hierboven, of overloop de lopende series.</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-4">
              {sortedFollowed.map((s) => (
                <FollowedSeriesTile
                  key={s.tmdbId}
                  series={s}
                  onOrder={onOrder}
                  onOpen={() => router.push(`/films-series/tv-${s.tmdbId}`)}
                  onUnfollow={() => handleUnfollow(s)}
                  className="w-full"
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {snackbar ? (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS} role="region" aria-label="Melding">
          <Snackbar
            message={snackbar.message}
            actionLabel="Zet terug"
            onAction={() => {
              snackbar.undo();
              setSnackbar(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
