"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { SearchBar } from "@/components/ui/search_bar";
import { Shimmer } from "@/components/ui/shimmer";
import { Poster } from "@/components/films/film_tiles";
import { RatedSeriesTile, TasteRatingSheet, TasteRecommendationTile, TasteStars, type TasteSheetSeries } from "@/components/films/series_taste";
import { useSeriesTaste } from "@/hooks/use_series_taste";
import { MIN_LIKED_FOR_RECOMMENDATIONS, TASTE_LEVELS, tasteLabel, tastePosterUrl, tasteStars, type TasteLevel } from "@/lib/series-taste";

type SearchResult = { tmdbId: number; type: "movie" | "tv"; title: string; year: string; posterUrl: string | null };
type Filter = "all" | TasteLevel;

const nl = (n: number) => n.toLocaleString("nl-BE");

/** Series zoeken bij TMDB (zelfde route als de zoekbalk op «Films & series»). */
function useSeriesSearch(query: string) {
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
          setResults((d.results ?? []).filter((r) => r.type === "tv").map((r) => ({ id: r.tmdbId, title: r.title, year: r.year, posterUrl: r.posterUrl }))),
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
 * «Jouw seriesmaak»: alle series die je goed vond (ook die vanzelf meetellen), wat je smaak daaruit
 * leert, en wat je waarschijnlijk ook goed zal vinden.
 */
export default function SmaakPage() {
  const router = useRouter();
  const taste = useSeriesTaste({ recommend: true });
  const { rated, recommendations, profile, catalog, explicit, auto, unseenIds, ratings, loading } = taste;
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [sheet, setSheet] = React.useState<TasteSheetSeries | null>(null);
  const results = useSeriesSearch(query);
  const searching = query.trim().length >= 2;

  const counts = React.useMemo(() => {
    const out: Record<TasteLevel, number> = { top: 0, great: 0, good: 0, no: 0 };
    for (const s of rated) out[s.level]++;
    return out;
  }, [rated]);
  const visible = React.useMemo(() => (filter === "all" ? rated : rated.filter((s) => s.level === filter)), [rated, filter]);
  const autoCount = React.useMemo(() => rated.filter((s) => s.auto).length, [rated]);

  const catalogTotal = catalog?.length ?? 0;
  const answeredInCatalog = React.useMemo(
    () => (catalog ?? []).filter((s) => explicit.has(s.id) || auto.has(s.id) || unseenIds.has(s.id)).length,
    [catalog, explicit, auto, unseenIds],
  );
  const toGo = Math.max(0, catalogTotal - answeredInCatalog);
  const pct = catalogTotal > 0 ? (answeredInCatalog / catalogTotal) * 100 : 0;
  const likedCount = rated.length - counts.no;

  const sheetRating = sheet ? ratings.get(sheet.id) : undefined;
  const closeSheet = () => setSheet(null);

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:gap-5 lg:pt-10">
        <div className="flex h-11 items-center gap-2 lg:hidden">
          <button type="button" aria-label="Terug naar films en series" onClick={() => router.push("/films-series")} className={headerRoundButtonClass}>
            {RoundIcons.back}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <PageBackButton href="/films-series" label="Terug naar films en series" className="hidden lg:inline-flex" />
          <div className="min-w-0">
            <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">Jouw seriesmaak</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Wat je goed vond, bepaalt wat de app je voorstelt. Series die je volgt of zag, tellen vanzelf mee.</p>
          </div>
        </div>

        {taste.error ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <p className="text-[15px] text-[var(--text-secondary)]">De series konden niet geladen worden.</p>
            <Button variant="secondary" size="md" onClick={taste.retry}>
              Opnieuw proberen
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-4">
            <Shimmer className="h-[132px] rounded-[20px]" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 lg:gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Shimmer key={i} className="aspect-[2/3] rounded-[14px]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-[20px] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:flex-row lg:items-center lg:gap-6 lg:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[var(--text-primary)]">{toGo > 0 ? `Nog ${nl(toGo)} van de ${nl(catalogTotal)} series te overlopen` : `Je overliep alle ${nl(catalogTotal)} series`}</p>
                <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--text-secondary)]">IMDb 7,5 of hoger, gestart in de laatste 20 jaar. De bekendste komen eerst.</p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-[var(--gray-100)]" aria-hidden>
                  <div className="h-full rounded-pill bg-[var(--blue-500)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 lg:flex-row">
                {toGo > 0 ? (
                  <Button size="md" onClick={() => router.push("/films-series/smaak/beoordelen")} className="w-full lg:w-auto">
                    Series beoordelen
                  </Button>
                ) : null}
                {autoCount > 0 ? (
                  <Button variant="secondary" size="md" onClick={() => router.push("/films-series/smaak/beoordelen?modus=automatisch")} className="w-full lg:w-auto">
                    {autoCount} automatische verfijnen
                  </Button>
                ) : null}
              </div>
            </section>

            <SearchBar surface="app" value={query} onValueChange={setQuery} placeholder="Serie zoeken om te beoordelen" aria-label="Serie zoeken om te beoordelen" />

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

            {!searching && recommendations.length > 0 ? (
              <section aria-label="Waarschijnlijk iets voor jou" className="flex flex-col gap-3">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Waarschijnlijk iets voor jou</h2>
                <div className="edge-fade -mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }}>
                  <div className="flex items-start gap-3" style={{ width: "max-content" }}>
                    {recommendations.map((r) => (
                      <TasteRecommendationTile key={r.series.id} recommendation={r} onOpen={() => router.push(`/films-series/tv-${r.series.id}`)} />
                    ))}
                  </div>
                </div>
              </section>
            ) : !searching && likedCount < MIN_LIKED_FOR_RECOMMENDATIONS ? (
              <p className="rounded-[20px] bg-[var(--white)] p-4 text-[14px] leading-5 text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
                Nog {MIN_LIKED_FOR_RECOMMENDATIONS - likedCount} goede {MIN_LIKED_FOR_RECOMMENDATIONS - likedCount === 1 ? "serie" : "series"} en je krijgt hier je eerste voorstellen.
              </p>
            ) : null}

            {!searching && (profile.genres.length > 0 || profile.makers.length > 0) ? (
              <section aria-label="Wat je smaak zegt" className="flex flex-col gap-2 rounded-[20px] bg-[image:var(--gradient-store-default)] p-4 lg:px-5">
                <p className="text-[11.5px] font-extrabold tracking-[0.06em] text-[var(--blue-500)]">JE SMAAK TOT NU TOE</p>
                {profile.genres.length > 0 ? <p className="text-[15px] font-bold leading-[21px] text-[var(--text-primary)]">{profile.genres.join(" · ")}</p> : null}
                {profile.makers.length > 0 ? <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Vaak van {profile.makers.join(", ")}</p> : null}
              </section>
            ) : null}

            {!searching ? (
              <section aria-label="Beoordeelde series" className="flex flex-col gap-3">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {nl(rated.length)} {rated.length === 1 ? "serie" : "series"} beoordeeld
                </h2>
                {rated.length > 0 ? (
                  <FilterChipRow ariaLabel="Filter op oordeel">
                    <FilterChip selected={filter === "all"} onClick={() => setFilter("all")} count={rated.length}>
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
                {rated.length === 0 ? (
                  <p className="text-[14.5px] text-[var(--text-secondary)]">Nog niets beoordeeld. Begin met de bekendste series, of zoek er een hierboven.</p>
                ) : visible.length === 0 ? (
                  <p className="text-[14.5px] text-[var(--text-secondary)]">Geen series met dit oordeel.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-4">
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
          if (sheet) router.push(`/films-series/tv-${sheet.id}`);
        }}
      />
    </div>
  );
}
