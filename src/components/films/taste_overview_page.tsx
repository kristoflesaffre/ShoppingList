"use client";

import * as React from "react";
import { useEdgeFade } from "@/hooks/use_edge_fade";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerGlassButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { SearchBar } from "@/components/ui/search_bar";
import { Shimmer } from "@/components/ui/shimmer";
import { Poster } from "@/components/films/film_tiles";
import { RatedSeriesTile, TasteProfileCard, TasteRatingSheet, TasteRecommendationTile, TasteStars, TasteWallBanner, type TasteSheetSeries } from "@/components/films/series_taste";
import { useTaste } from "@/hooks/use_series_taste";
import { MIN_LIKED_FOR_RECOMMENDATIONS, TASTE_LEVELS, buildTasteWall, tasteLabel, tastePosterUrl, tasteStars, type TasteLevel } from "@/lib/series-taste";
import { MOVIE_TASTE, SERIES_TASTE, type TasteKind } from "@/lib/taste-kinds";
import { setForcedDark } from "@/lib/theme";
import { cn } from "@/lib/utils";

type SearchResult = { tmdbId: number; type: "movie" | "tv"; title: string; year: string; posterUrl: string | null };
type Filter = "all" | TasteLevel;

const nl = (n: number) => n.toLocaleString("nl-BE");

const useBrowserLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Series of films zoeken bij TMDB (zelfde route als de zoekbalk op «Films & series»). */
function useTitleSearch(query: string, type: TasteKind["type"]) {
  const [results, setResults] = React.useState<TasteSheetSeries[] | null>(null);
  React.useEffect(() => {
    const q = query.trim();
    setResults(null);
    if (q.length < 2) return;
    const controller = new AbortController();
    const id = window.setTimeout(() => {
      fetch(`/api/films/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ results?: SearchResult[] }>) : { results: [] }))
        .then((d) =>
          setResults((d.results ?? []).filter((r) => r.type === type).map((r) => ({ id: r.tmdbId, title: r.title, year: r.year, posterUrl: r.posterUrl }))),
        )
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query, type]);
  return results;
}

/**
 * «Jouw seriesmaak» en «Jouw filmsmaak» (canvas «Smaak D · Alles aan de muur»): alle titels die je beoordeelde als
 * muur die traag voorbijschuift, wat je smaak daaruit leert, en wat je waarschijnlijk ook goed zal vinden.
 * Altijd donker, ongeacht het gekozen thema. Met een filter gaat de rest weg en staan de titels meteen onder de kop.
 */
export function TasteOverviewPage({ kind }: { kind: TasteKind }) {
  const router = useRouter();
  const { one, many, Many } = kind.words;
  const One = one[0].toUpperCase() + one.slice(1);
  const other = kind.type === "tv" ? MOVIE_TASTE : SERIES_TASTE;
  const taste = useTaste(kind, { recommend: true });
  const { rated, recommendations, profile, askable, explicit, auto, unseenIds, ratings, loading } = taste;
  const [filter, setFilter] = React.useState<Filter>("all");
  /** Genre binnen «… series beoordeeld»; `null` = alle genres. */
  const [genre, setGenre] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [sheet, setSheet] = React.useState<TasteSheetSeries | null>(null);
  const results = useTitleSearch(query, kind.type);
  useBrowserLayoutEffect(() => {
    setForcedDark(true);
    return () => setForcedDark(false);
  }, []);
  const searching = query.trim().length >= 2;
  const recommendScrollRef = React.useRef<HTMLDivElement>(null);
  useEdgeFade(recommendScrollRef);

  const counts = React.useMemo(() => {
    const out: Record<TasteLevel, number> = { top: 0, great: 0, good: 0, no: 0 };
    for (const s of rated) out[s.level]++;
    return out;
  }, [rated]);
  /** Het raster toont bij «Alles» enkel wat je minstens goed vindt; «Niet goed» zie je via die chip. */
  const byLevel = React.useMemo(() => rated.filter((s) => (filter === "all" ? s.level !== "no" : s.level === filter)), [rated, filter]);
  /** Genres van wat het oordeel-filter toont, meest voorkomende eerst; het gekozen genre blijft staan, ook bij 0. */
  const genreCounts = React.useMemo(() => {
    const out = new Map<string, number>();
    for (const s of byLevel) for (const g of s.g) out.set(g, (out.get(g) ?? 0) + 1);
    if (genre && !out.has(genre)) out.set(genre, 0);
    return Array.from(out.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
  }, [byLevel, genre]);
  const visible = React.useMemo(() => (genre ? byLevel.filter((s) => s.g.includes(genre)) : byLevel), [byLevel, genre]);
  const { total: catalogTotal, toGo, pct, autoCount } = taste.progress;
  const likedCount = rated.length - counts.no;
  const wall = React.useMemo(() => (loading ? [] : buildTasteWall(rated, askable ?? [])), [loading, rated, askable]);
  const showOverview = !searching && filter === "all";

  const sheetRating = sheet ? ratings.get(sheet.id) : undefined;
  const closeSheet = () => setSheet(null);

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <TasteWallBanner tiles={wall} filter={filter} />
      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+12px)] z-10 mx-auto flex w-full max-w-[1160px] items-start justify-between gap-3 px-4 lg:top-10">
        <div>
          <button type="button" aria-label="Terug naar films en series" onClick={() => router.push("/films-series")} className={cn(headerGlassButtonClass, "lg:hidden")}>
            {RoundIcons.back}
          </button>
          <PageBackButton href="/films-series" label="Terug naar films en series" tone="glass" />
        </div>
        <Link
          href={other.overviewPath}
          className="flex h-10 shrink-0 items-center rounded-pill bg-fixed-white/[0.12] px-4 text-[14px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-md transition-[background-color] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 [@media(hover:hover)]:hover:bg-fixed-white/[0.2]"
        >
          {other.title}
        </Link>
      </div>

      <main className="relative mx-auto flex w-full max-w-[1160px] flex-1 flex-col gap-8 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[252px] lg:gap-11 lg:pt-[398px]">
        <header className="flex flex-col gap-4 lg:gap-5">
          <div>
            <h1 className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.04em] text-[var(--text-primary)] lg:text-[72px] lg:leading-none">{kind.title}</h1>
            <p className="mt-2 text-[14.5px] leading-5 text-[var(--text-secondary)] lg:mt-3 lg:text-[17px] lg:leading-6">
              {loading
                ? "\u00a0"
                : likedCount > 0
                  ? `${nl(likedCount)} ${likedCount === 1 ? one : many} die je goed vindt. Hoe beter je ze vond, hoe groter en feller ze hangen.`
                  : "Je muur is nog leeg. Wat je goed vindt, bepaalt wat de app je voorstelt."}
            </p>
          </div>

          {!taste.error && !loading && rated.length > 0 ? (
            <FilterChipRow ariaLabel="Filter op oordeel">
              <FilterChip selected={filter === "all"} onClick={() => setFilter("all")} count={likedCount}>
                Alles
              </FilterChip>
              {TASTE_LEVELS.slice()
                .reverse()
                .map(({ level, label }) => (
                  <FilterChip key={level} selected={filter === level} onClick={() => setFilter(level)} count={counts[level]}>
                    {label}
                  </FilterChip>
                ))}
            </FilterChipRow>
          ) : null}

          {!taste.error && !loading ? (
            <section className="flex flex-col gap-3 rounded-[20px] bg-fixed-white/[0.07] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] lg:flex-row lg:items-center lg:gap-5 lg:py-3.5 lg:pl-5 lg:pr-4">
              <div className="min-w-0 lg:w-[340px] lg:shrink-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{toGo > 0 ? `Nog ${nl(toGo)} van de ${nl(catalogTotal)} te overlopen` : `Je overliep alle ${nl(catalogTotal)} ${many}`}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-fixed-white/10" aria-hidden>
                  <div className="h-full rounded-pill bg-[var(--blue-500)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <SearchBar surface="glass" value={query} onValueChange={setQuery} placeholder={`${One} zoeken om te beoordelen`} aria-label={`${One} zoeken om te beoordelen`} className="min-w-0 lg:flex-1" />
              {toGo > 0 || autoCount > 0 ? (
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {toGo > 0 ? (
                    <Button size="md" onClick={() => router.push(kind.ratePath)} className="w-full sm:w-auto sm:flex-1 lg:flex-none">
                      {Many} beoordelen
                    </Button>
                  ) : null}
                  {autoCount > 0 ? (
                    <Button variant="secondary" size="md" onClick={() => router.push(`${kind.ratePath}?modus=automatisch`)} className="w-full sm:w-auto sm:flex-1 lg:flex-none">
                      {autoCount} automatisch verfijnen
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </header>

        {taste.error ? (
          <div className="flex flex-col items-center gap-3 pt-10 text-center">
            <p className="text-[15px] text-[var(--text-secondary)]">De {many} konden niet geladen worden.</p>
            <Button variant="secondary" size="md" onClick={taste.retry}>
              Opnieuw proberen
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-4">
            <Shimmer className="h-[72px] rounded-[20px]" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 lg:gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Shimmer key={i} className="aspect-[2/3] rounded-[14px]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {searching ? (
              <section aria-label="Zoekresultaten" className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
                {results === null ? (
                  <div className="flex flex-col gap-3 p-4">
                    <Shimmer className="h-[66px] rounded-[12px]" />
                    <Shimmer className="h-[66px] rounded-[12px]" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="p-4 text-[14.5px] text-[var(--text-secondary)]">Geen {many} gevonden.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {results.map((r) => {
                      const rating = ratings.get(r.id);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setSheet(r)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
                          >
                            <span className="w-11 shrink-0">
                              <Poster src={r.posterUrl} alt="" className="rounded-[8px] shadow-none" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-bold text-[var(--text-primary)]">{r.title}</span>
                              {r.year ? <span className="block text-[13px] text-[var(--text-secondary)]">{r.year}</span> : null}
                            </span>
                            {rating ? (
                              <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-500)]">
                                {tasteStars(rating.level) > 0 ? <TasteStars count={tasteStars(rating.level)} /> : null}
                                {tasteLabel(rating.level)}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[13px] font-semibold text-[var(--blue-500)]">Beoordeel</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}

            {showOverview && recommendations.length > 0 ? (
              <section aria-label="Suggestie op basis van jouw smaak" className="flex flex-col gap-3 lg:gap-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)] lg:text-[21px]">Suggestie op basis van jouw smaak</h2>
                <div ref={recommendScrollRef} className="edge-fade -mx-4 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <div className="flex items-start gap-3 lg:gap-[19px]" style={{ width: "max-content" }}>
                    {recommendations.map((r) => (
                      <TasteRecommendationTile key={r.series.id} recommendation={r} className="w-[132px] lg:w-[172px]" onOpen={() => router.push(`/films-series/${kind.libraryId(r.series.id)}`)} />
                    ))}
                  </div>
                </div>
              </section>
            ) : showOverview && likedCount < MIN_LIKED_FOR_RECOMMENDATIONS ? (
              <p className="rounded-[20px] bg-fixed-white/[0.07] p-4 text-[14px] leading-5 text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                Nog {MIN_LIKED_FOR_RECOMMENDATIONS - likedCount} goede {MIN_LIKED_FOR_RECOMMENDATIONS - likedCount === 1 ? one : many} en je krijgt hier je eerste voorstellen.
              </p>
            ) : null}

            {showOverview && profile.genres.length > 0 ? <TasteProfileCard profile={profile} /> : null}

            {!searching ? (
              <section aria-label={`Beoordeelde ${many}`} className="flex flex-col gap-3 lg:gap-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)] lg:text-[21px]">
                  {filter === "all" && !genre
                    ? `${nl(byLevel.length)} ${byLevel.length === 1 ? one : many} die je goed vindt`
                    : `${[filter === "all" ? null : tasteLabel(filter), genre].filter(Boolean).join(" · ")} · ${nl(visible.length)}`}
                </h2>
                {genreCounts.length > 1 || genre ? (
                  <FilterChipRow ariaLabel="Filter op genre">
                    <FilterChip selected={genre === null} onClick={() => setGenre(null)} count={byLevel.length}>
                      Alle genres
                    </FilterChip>
                    {genreCounts.map(([name, count]) => (
                      <FilterChip key={name} selected={genre === name} onClick={() => setGenre(genre === name ? null : name)} count={count}>
                        {name}
                      </FilterChip>
                    ))}
                  </FilterChipRow>
                ) : null}
                {rated.length === 0 ? (
                  <p className="text-[14.5px] text-[var(--text-secondary)]">Nog niets beoordeeld. Begin met de bekendste {many}, of zoek er een hierboven.</p>
                ) : visible.length === 0 ? (
                  <p className="text-[14.5px] text-[var(--text-secondary)]">{genre ? `Geen ${many} in dit genre met dit oordeel.` : `Geen ${many} met dit oordeel.`}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-[19px]">
                    {visible.map((s) => (
                      <RatedSeriesTile
                        key={s.id}
                        series={s}
                        rating={{ level: s.level, auto: s.auto }}
                        onOpen={() => setSheet({ id: s.id, title: s.n, year: s.y ? String(s.y) : "", posterUrl: tastePosterUrl(s) })}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </>
        )}
      </main>

      <TasteRatingSheet
        series={sheet}
        value={sheetRating?.level ?? null}
        auto={Boolean(sheetRating?.auto)}
        kind={kind}
        onClose={closeSheet}
        onRate={(level) => {
          if (sheet) void taste.rate(sheet.id, level, { title: sheet.title, year: sheet.year, posterUrl: sheet.posterUrl });
          closeSheet();
        }}
        onUnseen={() => {
          if (sheet) void taste.markUnseen(sheet.id);
          closeSheet();
        }}
        onOpenSeries={() => {
          if (sheet) router.push(`/films-series/${kind.libraryId(sheet.id)}`);
        }}
      />
    </div>
  );
}
