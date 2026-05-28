"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { MiniButton } from "@/components/ui/mini_button";
import { cn } from "@/lib/utils";
import { type WatchlistItem, getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/watchlist";

type SearchResult = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  typeLabel: string;
  posterUrl: string | null;
  score: number | null;
  cast: string;
};

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

function ThreeDotsIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="size-4 shrink-0">
      <path
        d="M8 1.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L8 9.387l-3.09 1.623.59-3.44L3 5.133l3.455-.503L8 1.5z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/** Figma 1652:47625 — zoekresultaat-kaart */
function FilmResultCard({
  result,
  onAdd,
  onViewDetail,
}: {
  result: SearchResult;
  onAdd: (result: SearchResult) => void;
  onViewDetail: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-[var(--gray-100)] bg-white py-3 pl-4 pr-3">
      {/* Poster + info: klikbaar naar detailpagina */}
      <button
        type="button"
        aria-label={`${result.title} bekijken`}
        onClick={() => onViewDetail(result.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
      >
      <div className="relative h-16 w-[43px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
        {result.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.posterUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--gray-300)]">
            <MaskIcon src="/icons/films.svg" className="size-6 bg-[var(--gray-200)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Titel + score */}
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[var(--text-primary)]">
            {result.title}
          </p>
          {result.score !== null && (
            <>
              <StarIcon />
              <p className="shrink-0 whitespace-nowrap font-medium leading-none text-[var(--text-primary)]">
                <span className="text-[14px]">{result.score.toFixed(1)}</span>
                <span className="text-[10px] font-normal">/10</span>
              </p>
            </>
          )}
        </div>
        {/* Jaar + type */}
        <p className="text-sm leading-5 text-[var(--gray-400)]">
          {[result.year, result.typeLabel].filter(Boolean).join(" ")}
        </p>
        {/* Cast */}
        {result.cast && (
          <p className="truncate text-sm leading-5 text-[var(--gray-400)]">
            {result.cast}
          </p>
        )}
      </div>
      </button>

      {/* Verticale divider */}
      <div className="w-px self-stretch bg-[var(--gray-100)]" aria-hidden />

      {/* Toevoegen-knop */}
      <button
        type="button"
        aria-label={`${result.title} toevoegen`}
        onClick={() => onAdd(result)}
        className="flex shrink-0 items-center justify-center p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 rounded-full"
      >
        <MaskIcon src="/icons/plus-circle.svg" className="size-6 bg-[var(--blue-500)]" />
      </button>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex h-[88px] items-center gap-3 rounded-[8px] border border-[var(--gray-100)] bg-white py-3 pl-4 pr-3 animate-pulse"
        >
          <div className="h-16 w-[43px] shrink-0 rounded-[4px] bg-[var(--gray-100)]" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 rounded bg-[var(--gray-100)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--gray-100)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--gray-100)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

type FilterOption = "all" | "movie" | "tv";

const FILTER_CHIPS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "movie", label: "Films" },
  { id: "tv", label: "Series" },
];

export default function FilmsSeriesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterOption>("all");
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([]);

  // Laad watchlist uit localStorage bij mount
  React.useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  // Debounce: 300ms na laatste toetsaanslag zoeken
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/films/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then((r) => r.json())
      .then((data: { results: SearchResult[] }) => {
        setResults(data.results ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery]);

  const hasQuery = query.trim().length >= 2;
  const filteredResults = filter === "all" ? results : results.filter((r) => r.type === filter);

  const watchlistFilms = watchlist.filter((r) => r.type === "movie");
  const watchlistSeries = watchlist.filter((r) => r.type === "tv");
  const hasWatchlistItems = watchlist.length > 0;

  function handleAdd(result: SearchResult) {
    const item: WatchlistItem = {
      id: result.id,
      type: result.type,
      title: result.title,
      year: result.year,
      posterUrl: result.posterUrl,
    };
    const already = watchlist.some((r) => r.id === result.id);
    const next = already ? removeFromWatchlist(result.id) : addToWatchlist(item);
    setWatchlist(next);
  }

  function handleViewDetail(id: string) {
    router.push(`/films-series/${id}`);
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient achtergrond — Figma 1652:46675 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Vaste header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              Films en series
            </p>
            <button
              type="button"
              aria-label="Meer opties"
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pt-8"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Zoekbalk — Figma 1652:46676 */}
        <SearchBar
          placeholder="Zoek film of serie"
          value={query}
          onValueChange={setQuery}
        />

        {/* Filter chips — Figma 1652:46667 */}
        {hasQuery && (
          <div className="-mx-4 mt-3 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                    filter === chip.id
                      ? "bg-[#4f55f1] font-medium text-white"
                      : "bg-white font-normal text-[#707784] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resultatenlijst — Figma 1652:47833 */}
        {hasQuery && (
          <div className="mt-4 flex flex-col gap-3 pb-[calc(88px+env(safe-area-inset-bottom,0px))]">
            {loading ? (
              <ResultsSkeleton />
            ) : filteredResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--gray-400)]">
                Geen resultaten voor &ldquo;{query}&rdquo;
              </p>
            ) : (
              filteredResults.map((result) => (
                <FilmResultCard key={result.id} result={result} onAdd={handleAdd} onViewDetail={handleViewDetail} />
              ))
            )}
          </div>
        )}

        {/* Niet-lege staat: watchlist secties */}
        {!hasQuery && hasWatchlistItems && (
          <div className="mt-6 flex flex-col gap-6 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
            {/* Watchlist films */}
            {watchlistFilms.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Watchlist films</h2>
                  <button type="button" className="shrink-0 text-xs font-medium text-[#4f55f1] focus-visible:outline-none">
                    Toon alle
                  </button>
                </div>
                <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                    {watchlistFilms.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleViewDetail(item.id)}
                        className="flex w-[87px] flex-col gap-2 text-left focus-visible:outline-none"
                      >
                        <div className="relative w-full overflow-hidden rounded bg-[var(--gray-50)]" style={{ aspectRatio: "2/3" }}>
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.posterUrl} alt={item.title} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="line-clamp-2 text-[14px] font-medium leading-4 text-[#16181a]">{item.title}</p>
                          <p className="text-[14px] font-normal leading-5 text-[#8c929d]">{item.year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Watchlist series */}
            {watchlistSeries.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Watchlist series</h2>
                  <button type="button" className="shrink-0 text-xs font-medium text-[#4f55f1] focus-visible:outline-none">
                    Toon alle
                  </button>
                </div>
                <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                    {watchlistSeries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleViewDetail(item.id)}
                        className="flex w-[87px] flex-col gap-2 text-left focus-visible:outline-none"
                      >
                        <div className="relative w-full overflow-hidden rounded bg-[var(--gray-50)]" style={{ aspectRatio: "2/3" }}>
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.posterUrl} alt={item.title} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="line-clamp-2 text-[14px] font-medium leading-4 text-[#16181a]">{item.title}</p>
                          <p className="text-[14px] font-normal leading-5 text-[#8c929d]">{item.year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Empty state — alleen zichtbaar zonder zoekterm en zonder watchlist items */}
      {!hasQuery && !hasWatchlistItems && (
        <div className="absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ui/films_160.webp"
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain"
            aria-hidden
          />
          <p className="max-w-[280px] text-center text-base font-medium leading-6 text-[var(--gray-500)]">
            Nog geen items toegevoegd aan je film of en serie lijstje
          </p>
          <MiniButton variant="primary" onClick={() => {}}>
            Voeg item toe
          </MiniButton>
        </div>
      )}
    </div>
  );
}
