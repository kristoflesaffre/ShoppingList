"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { Snackbar } from "@/components/ui/snackbar";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { getScoreSourceCache } from "@/lib/score_source_cache";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { Shimmer } from "@/components/ui/shimmer";
import { FilmIcons } from "@/components/films/film_detail_ui";
import { EyeIcon, PartnerAction, Poster, RatingChip, TypeChip } from "@/components/films/film_tiles";

const SNACKBAR_MS = 4500;


type DetailPayload = {
  genres: string[];
  cast: { name: string }[];
  overview: string;
  score: number | null;
  scoreSource?: "imdb" | "tmdb" | null;
  trailerKey: string | null;
};

type EnrichedItem = WatchlistItem & {
  genres: string[];
  castNames: string;
  overview: string;
  metaLine: string;
  trailerKey: string | null;
  scoreSource?: "imdb" | "tmdb" | null;
};

type AvatarPerson = { url: string | null; name: string | null };

function buildMetaLine(year: string, type: WatchlistItem["type"], genres: string[]): string {
  const typeLabel = type === "movie" ? "Film" : "TV Serie";
  const genrePart = genres.join(" - ");
  if (year && genrePart) return `${year} / ${genrePart}`;
  if (year) return `${year} / ${typeLabel}`;
  return genrePart || typeLabel;
}

function formatCast(names: string[]): string {
  if (names.length === 0) return "";
  const joined = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${joined},....` : joined;
}

function toEnriched(item: WatchlistItem, data: DetailPayload | null): EnrichedItem {
  const genres = data?.genres ?? [];
  const castNames = formatCast((data?.cast ?? []).map((c) => c.name));
  const overview = item.overview ?? data?.overview ?? "";
  const score = item.score ?? data?.score ?? null;
  return {
    ...item,
    score,
    scoreSource: data?.scoreSource ?? null,
    genres,
    castNames,
    overview,
    metaLine: buildMetaLine(item.year, item.type, genres),
    trailerKey: data?.trailerKey ?? null,
  };
}

export default function PartnerWatchlistPage() {
  const router = useRouter();
  const {
    partnerWatchlist,
    partnerName,
    partnerAvatarUrl,
    reactToPartnerItem,
  } = useFilmsLibrary();

  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "movie" | "tv">("all");
  const [scoreSources, setScoreSources] = React.useState<Record<string, "imdb" | "tmdb">>({});
  React.useEffect(() => setScoreSources(getScoreSourceCache()), []);
  const [enriched, setEnriched] = React.useState<Record<string, EnrichedItem>>({});
  const [loadingDetails, setLoadingDetails] = React.useState(true);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(() => new Set());
  const [snackbar, setSnackbar] = React.useState<{ message: string; undoFn: () => void } | null>(null);
  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removalSnapshotsRef = React.useRef<Map<string, EnrichedItem>>(new Map());

  const partnerAvatar = React.useMemo(
    (): AvatarPerson => ({ url: partnerAvatarUrl, name: partnerName }),
    [partnerAvatarUrl, partnerName],
  );

  const sectionTitle = `Watchlist ${partnerName ?? "Partner"}`;

  const baseItems = partnerWatchlist;

  const itemIdsKey = React.useMemo(
    () => baseItems.map((i) => i.id).join(","),
    [baseItems],
  );

  React.useEffect(() => {
    if (baseItems.length === 0) {
      setEnriched({});
      setLoadingDetails(false);
      return;
    }

    const currentIds = new Set(baseItems.map((i) => i.id));
    const needsFetch = baseItems.filter((item) => {
      const e = enriched[item.id];
      return !e || (e.genres.length === 0 && !e.overview);
    });

    setEnriched((prev) => {
      const pruned: Record<string, EnrichedItem> = {};
      for (const id of Object.keys(prev)) {
        if (currentIds.has(id)) pruned[id] = prev[id];
      }
      return pruned;
    });

    if (needsFetch.length === 0) {
      setLoadingDetails(false);
      return;
    }

    let cancelled = false;
    if (Object.keys(enriched).length === 0) setLoadingDetails(true);

    void Promise.all(
      needsFetch.map(async (item) => {
        const dashIdx = item.id.indexOf("-");
        const tmdbId = item.id.slice(dashIdx + 1);
        try {
          const res = await fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`);
          if (!res.ok) throw new Error("detail failed");
          const data = (await res.json()) as DetailPayload;
          return { item, data };
        } catch {
          return { item, data: null };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setEnriched((prev) => {
        const next = { ...prev };
        for (const { item, data } of results) {
          next[item.id] = toEnriched(item, data);
        }
        return next;
      });
      setLoadingDetails(false);
    });

    return () => {
      cancelled = true;
    };
  }, [itemIdsKey]);

  React.useEffect(() => {
    setRemovingIds((prev) => {
      if (prev.size === 0) return prev;
      const present = new Set(partnerWatchlist.map((i) => i.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (present.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [partnerWatchlist]);

  const displayItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseItems
      .map((item) => removalSnapshotsRef.current.get(item.id) ?? enriched[item.id] ?? toEnriched(item, null))
      .filter((item) => {
        if (typeFilter !== "all" && item.type !== typeFilter) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.metaLine.toLowerCase().includes(q) ||
          item.castNames.toLowerCase().includes(q) ||
          item.overview.toLowerCase().includes(q)
        );
      });
  }, [baseItems, enriched, query, typeFilter]);

  function cancelRemoval(itemId: string) {
    const timer = removalTimersRef.current.get(itemId);
    if (timer) clearTimeout(timer);
    removalTimersRef.current.delete(itemId);
    removalSnapshotsRef.current.delete(itemId);
    setRemovingIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  function handleReact(itemId: string, reaction: "up" | "down" | "seen") {
    if (removingIds.has(itemId)) return;

    const item = displayItems.find((i) => i.id === itemId);
    if (!item) return;

    removalSnapshotsRef.current.set(itemId, item);
    setRemovingIds((prev) => new Set(prev).add(itemId));

    const label =
      reaction === "up" ? "staat nu ook op jouw watchlist" : reaction === "down" ? "is niet voor jou" : "als gezien gemarkeerd";
    const message = `${item.title} ${label}`;

    const timer = setTimeout(() => {
      removalTimersRef.current.delete(itemId);
      removalSnapshotsRef.current.delete(itemId);
      void reactToPartnerItem(itemId, reaction);
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 400);
    }, SNACKBAR_MS);
    removalTimersRef.current.set(itemId, timer);

    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar({
      message,
      undoFn: () => {
        cancelRemoval(itemId);
        if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
        setSnackbar(null);
      },
    });
  }


  const plus = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[15px]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
  const cross = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
  const name = partnerName ?? "je partner";

  return (
    <>
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «22 · Watchlist partner — voorstel»: avatar + grote titel, zoeken, type, raster met acties. */}
      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-12">
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.push("/films-series")}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {FilmIcons.back}
          </button>
          <RoundIconButton tone="surface" size={36} aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")}>
            {FilmIcons.dots}
          </RoundIconButton>
        </div>

        <div className="mt-1 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PageBackButton href="/films-series" label="Terug" />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2.5 text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">
                <span className="flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_0_0_2px_var(--white)]">
                  {partnerAvatar.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={partnerAvatar.url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-[var(--blue-500)]">{name.slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                <span className="truncate">{sectionTitle}</span>
              </h1>
              {baseItems.length > 0 ? (
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {baseItems.length} {baseItems.length === 1 ? "titel" : "titels"} om samen te bekijken
                </p>
              ) : null}
            </div>
          </div>
          <SearchBar
            surface="app"
            placeholder={partnerName ? `Zoek in ${partnerName}’s watchlist` : "Zoek"}
            value={query}
            onValueChange={setQuery}
            className="lg:w-[300px] lg:shrink-0"
          />
        </div>

        <SegmentedControl
          ariaLabel="Soort"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "Alles" },
            { value: "movie", label: "Films" },
            { value: "tv", label: "Series" },
          ]}
          className="mt-3 lg:mt-6 lg:w-[300px]"
        />

        <div className="mt-[18px] lg:mt-6">
          {loadingDetails && baseItems.length > 0 && Object.keys(enriched).length === 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5">
              {Array.from({ length: Math.min(baseItems.length, 6) }).map((_, i) => (
                <div key={i}>
                  <Shimmer className="aspect-[2/3] w-full rounded-[14px]" />
                  <Shimmer className="mt-2.5 h-3.5 w-3/4 rounded-md" />
                  <div className="mt-2.5 flex gap-1.5">
                    <Shimmer className="h-8 flex-1 rounded-full" />
                    <Shimmer className="h-8 flex-1 rounded-full" />
                    <Shimmer className="h-8 flex-1 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              {baseItems.length === 0 ? "Geen titels om te bekijken." : "Geen resultaten."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5">
              {displayItems.map((item) => {
                const isRemoving = removingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ opacity: isRemoving ? 0 : 1, transform: isRemoving ? "scale(0.85)" : undefined, pointerEvents: isRemoving ? "none" : undefined }}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/films-series/partner/${item.id}`)}
                      className="block w-full rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      <Poster src={item.posterUrl} alt="">
                        <TypeChip type={item.type} />
                        {item.score != null ? <RatingChip score={item.score} source={scoreSources[item.id]} /> : null}
                      </Poster>
                      <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{item.title}</p>
                    </button>
                    <div className="mt-2 flex gap-1.5">
                      <PartnerAction label="Ook op mijn watchlist" tone="blue" onClick={() => handleReact(item.id, "up")}>
                        {plus}
                      </PartnerAction>
                      <PartnerAction label="Al gezien" onClick={() => handleReact(item.id, "seen")}>
                        <EyeIcon className="size-[15px]" />
                      </PartnerAction>
                      <PartnerAction label="Niet voor mij" onClick={() => handleReact(item.id, "down")}>
                        {cross}
                      </PartnerAction>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    {snackbar && (
      <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS}>
        <Snackbar
          message={snackbar.message}
          actionLabel="Zet terug"
          onAction={snackbar.undoFn}
          className="w-full max-w-[956px]"
        />
      </div>
    )}
  </>
  );
}
