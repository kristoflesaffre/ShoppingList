"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";

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

type AvatarPerson = { url: string | null; name: string | null };

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

function ThreeDotsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    genres,
    castNames,
    overview,
    metaLine: buildMetaLine(item.year, item.type, genres),
  };
}

function CardSkeleton() {
  return (
    <div className="flex w-full animate-pulse items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3">
      <div className="h-[160px] w-[107px] shrink-0 rounded-[4px] bg-[var(--gray-100)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-6 w-3/4 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-full rounded bg-[var(--gray-100)]" />
        <div className="mt-1 h-16 w-full rounded bg-[var(--gray-100)]" />
        <div className="h-6 w-20 self-end rounded bg-[var(--gray-100)]" />
      </div>
    </div>
  );
}

/** Figma 1719:77660 — partner watchlist item card */
function PartnerWatchlistItemCard({
  item,
  partnerAvatar,
  partnerName,
  onOpen,
  onReact,
}: {
  item: EnrichedItem;
  partnerAvatar: AvatarPerson;
  partnerName: string | null;
  onOpen: () => void;
  onReact: (reaction: "up" | "down" | "seen") => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="flex w-full cursor-pointer items-stretch gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <div className="relative h-[160px] w-[107px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
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
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="flex w-full flex-col items-start">
          <span className="w-full truncate text-left text-base font-medium leading-6 text-[#16181a]">
            {item.title}
          </span>

          <div className="flex w-full items-center gap-2">
            <div className="size-[15.333px] shrink-0 overflow-hidden rounded-full border border-white bg-[#edeefe]">
              {partnerAvatar.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partnerAvatar.url}
                  alt={partnerName ?? ""}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <MaskIcon src="/icons/avatar.svg" className="size-[10px] bg-[#4f55f1]" />
                </div>
              )}
            </div>
            {item.score != null && (
              <div className="flex shrink-0 items-center gap-1">
                <StarIcon />
                <span className="text-xs font-medium leading-4 text-[#16181a]">
                  {item.score.toFixed(1)}
                </span>
              </div>
            )}
            {item.metaLine && (
              <p className="min-w-0 flex-1 truncate text-sm leading-5 text-[#8c929d]">{item.metaLine}</p>
            )}
          </div>

          {item.castNames && (
            <p className="w-full truncate text-xs leading-4 text-[#8c929d]">{item.castNames}</p>
          )}
        </div>

        {item.overview && (
          <p className="line-clamp-4 min-h-[64px] text-xs leading-4 text-[#595f6a]">{item.overview}</p>
        )}

        <div className="flex w-[88px] items-start justify-end gap-2 self-end">
          <button
            type="button"
            aria-label="Toevoegen aan mijn watchlist"
            onClick={(e) => { e.stopPropagation(); onReact("up"); }}
            className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-[#22c55e]" />
          </button>
          <button
            type="button"
            aria-label="Niet interessant"
            onClick={(e) => { e.stopPropagation(); onReact("down"); }}
            className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MaskIcon src="/icons/thumb_down.svg" className="size-6 bg-[#eb5552]" />
          </button>
          <button
            type="button"
            aria-label="Al gezien"
            onClick={(e) => { e.stopPropagation(); onReact("seen"); }}
            className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
          </button>
        </div>
      </div>
    </div>
  );
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
  const [enriched, setEnriched] = React.useState<Record<string, EnrichedItem>>({});
  const [loadingDetails, setLoadingDetails] = React.useState(true);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(() => new Set());

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
      .filter((item) => !removingIds.has(item.id))
      .map((item) => enriched[item.id] ?? toEnriched(item, null))
      .filter((item) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.metaLine.toLowerCase().includes(q) ||
          item.castNames.toLowerCase().includes(q) ||
          item.overview.toLowerCase().includes(q)
        );
      });
  }, [baseItems, enriched, query, removingIds]);

  function handleReact(itemId: string, reaction: "up" | "down" | "seen") {
    setRemovingIds((prev) => new Set(prev).add(itemId));
    void reactToPartnerItem(itemId, reaction);
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto w-full max-w-[956px] px-4">
          <header className="flex h-16 w-full items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/films-series")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-medium leading-6 text-[#16181a]">
              Watchlist films
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
          <div className="flex items-center gap-4">
            <div className="size-6 shrink-0 overflow-hidden rounded-full border border-white bg-[#edeefe]">
              {partnerAvatar.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partnerAvatar.url}
                  alt={partnerName ?? ""}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <MaskIcon src="/icons/avatar.svg" className="size-4 bg-[#4f55f1]" />
                </div>
              )}
            </div>
            <h1 className="min-w-0 flex-1 text-[18px] font-bold leading-6 text-[#101130]">
              {sectionTitle}
            </h1>
          </div>

          <SearchBar placeholder="Zoek" value={query} onValueChange={setQuery} />

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
                  ? "Geen items om te beoordelen."
                  : "Geen resultaten voor je zoekopdracht."}
              </p>
            ) : (
              displayItems.map((item) => {
                const isRemoving = removingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      gridTemplateRows: isRemoving ? "0fr" : "1fr",
                      opacity: isRemoving ? 0 : 1,
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <PartnerWatchlistItemCard
                        item={item}
                        partnerAvatar={partnerAvatar}
                        partnerName={partnerName}
                        onOpen={() => router.push(`/films-series/partner/${item.id}`)}
                        onReact={(reaction) => handleReact(item.id, reaction)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
