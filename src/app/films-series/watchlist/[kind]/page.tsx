"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { Snackbar } from "@/components/ui/snackbar";
import { TabElement } from "@/components/ui/tab_element";
import { TabGroup } from "@/components/ui/tab_group";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";

type Kind = "films" | "series";

const CONFIG: Record<
  Kind,
  { mediaType: "movie" | "tv"; pageTitle: string; sectionTitle: string }
> = {
  films: {
    mediaType: "movie",
    pageTitle: "Watchlist films",
    sectionTitle: "Watchlist films",
  },
  series: {
    mediaType: "tv",
    pageTitle: "Watchlist series",
    sectionTitle: "Watchlist series",
  },
};

const REMOVE_ANIM_MS = 420;

type DetailPayload = {
  genres: string[];
  cast: { name: string }[];
  overview: string;
  score: number | null;
};

type EnrichedItem = WatchlistItem & {
  genres: string[];
  castNames: string;
  overview: string;
  metaLine: string;
};

type ListTab = "alleen" | "samen";

type AvatarPerson = { url: string | null; name: string | null };

/** Figma 1715:76796 — overlappende avatars (16px) of en enkele bij Alleen. */
function MemberAvatars({
  mode,
  user: self,
  partner,
}: {
  mode: "solo" | "together";
  user: AvatarPerson;
  partner: AvatarPerson;
}) {
  const sizeClass = "size-[15.333px]";

  function AvatarCircle({ person, className }: { person: AvatarPerson; className?: string }) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-full border border-white bg-[#edeefe]",
          sizeClass,
          className,
        )}
      >
        {person.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.url} alt={person.name ?? ""} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <MaskIcon src="/icons/avatar.svg" className="size-[10px] bg-[#4f55f1]" />
          </div>
        )}
      </div>
    );
  }

  if (mode === "solo") {
    return <AvatarCircle person={self} />;
  }

  return (
    <div className="flex isolate shrink-0 items-start">
      <AvatarCircle person={self} className="z-[2] -mr-[7.667px]" />
      <AvatarCircle person={partner} className="z-[1]" />
    </div>
  );
}

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

function buildMetaLine(year: string, genres: string[]): string {
  const genrePart = genres.join(" - ");
  if (year && genrePart) return `${year} / ${genrePart}`;
  return year || genrePart;
}

function formatCast(names: string[]): string {
  if (names.length === 0) return "";
  const joined = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${joined},....` : joined;
}

function toEnriched(
  item: WatchlistItem,
  data: DetailPayload | null,
): EnrichedItem {
  const genres = data?.genres ?? [];
  const castNames = formatCast((data?.cast ?? []).map((c) => c.name));
  const overview = item.overview ?? data?.overview ?? "";
  const score = item.score ?? data?.score ?? null;
  return {
    ...item,
    score,
    genres,
    castNames,
    overview,
    metaLine: buildMetaLine(item.year, genres),
  };
}

function CardSkeleton() {
  return (
    <div className="flex w-full animate-pulse items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3">
      <div className="h-[130px] w-[87px] shrink-0 rounded-[4px] bg-[var(--gray-100)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-6 w-3/4 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-full rounded bg-[var(--gray-100)]" />
        <div className="mt-1 h-16 w-full rounded bg-[var(--gray-100)]" />
      </div>
    </div>
  );
}

/** Figma 1715:76243 — watchlist item card */
function WatchlistItemCard({
  item,
  onOpen,
  onMarkSeen,
  showAvatars,
  avatarMode,
  userAvatar,
  partnerAvatar,
}: {
  item: EnrichedItem;
  onOpen: () => void;
  onMarkSeen: (e: React.MouseEvent) => void;
  showAvatars: boolean;
  avatarMode: "solo" | "together";
  userAvatar: AvatarPerson;
  partnerAvatar: AvatarPerson;
}) {
  return (
    <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3">
      <button
        type="button"
        onClick={onOpen}
        className="relative h-[130px] w-[87px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
          </div>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex w-full flex-col">
          <div className="flex w-full items-center gap-1">
            <button
              type="button"
              onClick={onOpen}
              className="min-w-0 flex-1 truncate text-left text-base font-medium leading-6 text-[#16181a] focus-visible:outline-none"
            >
              {item.title}
            </button>
            <button
              type="button"
              aria-label={`Markeer ${item.title} als bekeken`}
              onClick={onMarkSeen}
              className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded"
            >
              <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
            </button>
          </div>

          <div className="flex w-full items-center gap-2">
            {showAvatars && (
              <MemberAvatars mode={avatarMode} user={userAvatar} partner={partnerAvatar} />
            )}
            {item.score != null && (
              <div className="flex shrink-0 items-center gap-1">
                <StarIcon />
                <span className="text-xs font-medium leading-4 text-[#16181a]">{item.score.toFixed(1)}</span>
              </div>
            )}
            {item.metaLine && (
              <p className="min-w-0 flex-1 truncate text-sm leading-5 text-[#8c929d]">{item.metaLine}</p>
            )}
          </div>

          {item.castNames && (
            <p className="truncate text-xs leading-4 text-[#8c929d]">{item.castNames}</p>
          )}
        </div>

        {item.overview && (
          <p className="line-clamp-4 text-xs leading-4 text-[#595f6a]">{item.overview}</p>
        )}
      </div>
    </div>
  );
}

export default function WatchlistKindPage() {
  const router = useRouter();
  const params = useParams();
  const kindParam = params.kind as string;
  const kind: Kind | null =
    kindParam === "films" || kindParam === "series" ? kindParam : null;

  const config = kind ? CONFIG[kind] : null;
  const {
    aloneWatchlist,
    togetherWatchlist,
    ownWatchlist,
    isFilmsListShared,
    userAvatarUrl,
    userName,
    partnerAvatarUrl,
    partnerName,
    removeFromWatchlist,
    addToWatchlist,
    updateWatchlistScore,
  } = useFilmsLibrary();

  const [query, setQuery] = React.useState("");
  const [listTab, setListTab] = React.useState<ListTab>("samen");
  const [genreFilter, setGenreFilter] = React.useState<string>("Alles");
  const [enriched, setEnriched] = React.useState<Record<string, EnrichedItem>>({});
  const [loadingDetails, setLoadingDetails] = React.useState(true);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(() => new Set());
  /** Items die de gebruiker heeft verwijderd — blijven verborgen tot DB-sync klaar is. */
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());
  const [snackbar, setSnackbar] = React.useState<{
    message: string;
    undoFn: () => void;
    undoItem?: WatchlistItem;
    undoEnriched?: EnrichedItem;
  } | null>(null);

  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removalSnapshotsRef = React.useRef<Map<string, EnrichedItem>>(new Map());
  const dismissedIdsRef = React.useRef(dismissedIds);
  React.useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);

  const userAvatar = React.useMemo(
    (): AvatarPerson => ({ url: userAvatarUrl, name: userName }),
    [userAvatarUrl, userName],
  );
  const partnerAvatar = React.useMemo(
    (): AvatarPerson => ({ url: partnerAvatarUrl, name: partnerName }),
    [partnerAvatarUrl, partnerName],
  );

  const listSourceItems = React.useMemo(() => {
    if (!config) return [];
    const byType = (items: WatchlistItem[]) => items.filter((i) => i.type === config.mediaType);
    if (isFilmsListShared && listTab === "samen") return byType(togetherWatchlist);
    if (isFilmsListShared && listTab === "alleen") return byType(aloneWatchlist);
    return byType(ownWatchlist);
  }, [config, isFilmsListShared, listTab, togetherWatchlist, aloneWatchlist, ownWatchlist]);

  const baseItems = React.useMemo(() => {
    return listSourceItems.filter((i) => !dismissedIds.has(i.id));
  }, [listSourceItems, dismissedIds]);

  /** Ruim dismissedIds op zodra item echt weg is uit de watchlist. */
  React.useEffect(() => {
    setDismissedIds((prev) => {
      if (prev.size === 0) return prev;
      const stillPresent = new Set([
        ...ownWatchlist.map((i) => i.id),
        ...togetherWatchlist.map((i) => i.id),
      ]);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (stillPresent.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [ownWatchlist, togetherWatchlist]);

  const itemIdsKey = React.useMemo(
    () => baseItems.map((i) => i.id).join(","),
    [baseItems],
  );

  /** Alleen nieuwe items ophalen; bestaande enriched-data behouden. */
  React.useEffect(() => {
    if (!config) return;

    if (baseItems.length === 0) {
      setEnriched({});
      setLoadingDetails(false);
      return;
    }

    const currentIds = new Set(baseItems.map((i) => i.id));
    const needsFetch = baseItems.filter((item) => {
      if (dismissedIds.has(item.id)) return false;
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
        const dash = item.id.indexOf("-");
        const tmdbId = item.id.slice(dash + 1);
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
          if (dismissedIdsRef.current.has(item.id)) continue;
          const built = toEnriched(item, data);
          next[item.id] = built;
          if (built.score != null && item.score == null) {
            void updateWatchlistScore(item.id, built.score);
          }
        }
        return next;
      });
      setLoadingDetails(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey, config?.mediaType, dismissedIds]);

  const allEnrichedItems = React.useMemo(() => {
    return baseItems.map((item) => {
      const snap = removalSnapshotsRef.current.get(item.id);
      if (snap) return snap;
      return (
        enriched[item.id] ??
        toEnriched(item, null)
      );
    });
  }, [baseItems, enriched, removingIds]);

  const genreChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of allEnrichedItems) {
      for (const g of item.genres) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
      .map(([g]) => g);
    return ["Alles", ...sorted];
  }, [allEnrichedItems]);

  React.useEffect(() => {
    if (genreFilter !== "Alles" && !genreChips.includes(genreFilter)) {
      setGenreFilter("Alles");
    }
  }, [genreChips, genreFilter]);

  const displayItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEnrichedItems.filter((item) => {
      if (genreFilter !== "Alles" && !item.genres.includes(genreFilter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.castNames.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.metaLine.toLowerCase().includes(q)
      );
    });
  }, [allEnrichedItems, query, genreFilter]);

  const cancelRemoval = React.useCallback((id: string) => {
    const timer = removalTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    removalTimersRef.current.delete(id);
    removalSnapshotsRef.current.delete(id);
    setRemovingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const commitRemoval = React.useCallback(
    (id: string) => {
      removalTimersRef.current.delete(id);
      removalSnapshotsRef.current.delete(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDismissedIds((prev) => new Set(prev).add(id));
      setEnriched((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      void removeFromWatchlist(id);
    },
    [removeFromWatchlist],
  );

  function handleMarkSeen(e: React.MouseEvent, item: EnrichedItem) {
    e.stopPropagation();
    if (removingIds.has(item.id)) return;

    removalSnapshotsRef.current.set(item.id, item);
    setRemovingIds((prev) => new Set(prev).add(item.id));

    const timer = setTimeout(() => {
      commitRemoval(item.id);
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      setSnackbar({
        message: `${item.title} verwijderd`,
        undoItem: { ...item },
        undoEnriched: item,
        undoFn: () => {},
      });
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    }, REMOVE_ANIM_MS);

    removalTimersRef.current.set(item.id, timer);
  }

  function handleSnackbarUndo() {
    if (!snackbar) return;
    if (snackbar.undoItem) {
      cancelRemoval(snackbar.undoItem.id);
      setDismissedIds((prev) => {
        if (!prev.has(snackbar.undoItem!.id)) return prev;
        const next = new Set(prev);
        next.delete(snackbar.undoItem!.id);
        return next;
      });
      void addToWatchlist(snackbar.undoItem);
      if (snackbar.undoEnriched) {
        setEnriched((prev) => ({ ...prev, [snackbar.undoItem!.id]: snackbar.undoEnriched! }));
      }
    } else {
      snackbar.undoFn();
    }
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(null);
  }

  React.useEffect(() => {
    return () => {
      Array.from(removalTimersRef.current.values()).forEach((timer) => clearTimeout(timer));
      removalTimersRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    if (kind) return;
    router.replace("/films-series");
  }, [kind, router]);

  if (!kind || !config) return null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/films-series")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-medium leading-6 text-[#16181a]">
              {config.pageTitle}
            </p>
            <button
              type="button"
              aria-label="Instellingen"
              onClick={() => router.push("/films-series/instellingen")}
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-[18px] font-bold leading-6 text-[#101130]">{config.sectionTitle}</h1>

          <SearchBar placeholder="Zoek" value={query} onValueChange={setQuery} />

          {isFilmsListShared && (
            <TabGroup
              value={listTab}
              onValueChange={(v) => setListTab(v as ListTab)}
              aria-label="Watchlist weergave"
            >
              <TabElement value="alleen">Alleen</TabElement>
              <TabElement value="samen">Samen</TabElement>
            </TabGroup>
          )}

          {genreChips.length > 1 && (
            <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                {genreChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setGenreFilter(chip)}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                      genreFilter === chip
                        ? "bg-[#4f55f1] font-semibold text-white"
                        : "bg-white font-normal text-[#707784] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]",
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {loadingDetails && baseItems.length > 0 && Object.keys(enriched).length === 0 ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : displayItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--gray-400)]">
                {baseItems.length === 0
                  ? "Je watchlist is nog leeg."
                  : "Geen resultaten voor je zoekopdracht."}
              </p>
            ) : (
              displayItems.map((item) => {
                const isRemoving = removingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="grid transition-[grid-template-rows,opacity,margin] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      gridTemplateRows: isRemoving ? "0fr" : "1fr",
                      opacity: isRemoving ? 0 : 1,
                      marginBottom: isRemoving ? 0 : undefined,
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <WatchlistItemCard
                        item={item}
                        onOpen={() => router.push(`/films-series/${item.id}`)}
                        onMarkSeen={(e) => handleMarkSeen(e, item)}
                        showAvatars={isFilmsListShared}
                        avatarMode={listTab === "samen" ? "together" : "solo"}
                        userAvatar={userAvatar}
                        partnerAvatar={partnerAvatar}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {snackbar && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]",
            APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
          )}
        >
          <Snackbar
            message={snackbar.message}
            actionLabel="Zet terug"
            onAction={handleSnackbarUndo}
            className="w-full max-w-[956px]"
          />
        </div>
      )}
    </div>
  );
}
