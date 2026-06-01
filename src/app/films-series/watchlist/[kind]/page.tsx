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
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";

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
  releaseDate?: string | null;
  trailerKey?: string | null;
};

type EnrichedItem = WatchlistItem & {
  genres: string[];
  castNames: string;
  overview: string;
  metaLine: string;
  releaseDate?: string | null;
  trailerKey?: string | null;
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

function PlayIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="white" aria-hidden>
      <path d="M1 0.5L9.5 6L1 11.5V0.5Z" />
    </svg>
  );
}

function TrailerModal({ trailerKey, onClose }: { trailerKey: string; onClose: () => void }) {
  const iframeWrapperRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) onCloseRef.current();
      } catch { /* ignore */ }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  React.useEffect(() => {
    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const wrapper = iframeWrapperRef.current;
      if (isLandscape && wrapper && !document.fullscreenElement) {
        wrapper.requestFullscreen?.().catch(() => {});
      } else if (!isLandscape && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("orientationchange", handleOrientation);
    window.addEventListener("resize", handleOrientation);
    handleOrientation();
    return () => {
      window.removeEventListener("orientationchange", handleOrientation);
      window.removeEventListener("resize", handleOrientation);
    };
  }, []);

  React.useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && window.innerWidth > window.innerHeight) onCloseRef.current();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&enablejsapi=1&rel=0&playsinline=1&modestbranding=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={onClose}>
      <div
        ref={iframeWrapperRef}
        className="relative w-full bg-black"
        style={{ maxHeight: "100%", aspectRatio: "16/9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={src}
          className="absolute inset-0 size-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Trailer"
        />
      </div>
      <button
        type="button"
        aria-label="Sluit trailer"
        onClick={onClose}
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white" aria-hidden>
          <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
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
    releaseDate: data?.releaseDate ?? null,
    trailerKey: data?.trailerKey ?? null,
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
function SwipeableCard({
  mediaType,
  onDelete,
  onWatching,
  children,
}: {
  mediaType: "movie" | "tv";
  onDelete: () => void;
  onWatching: () => void;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const bgRef = React.useRef<HTMLDivElement>(null);
  const iconDeleteRef = React.useRef<HTMLDivElement>(null);
  const iconWatchRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ startX: 0, startY: 0, axis: null as "x" | "y" | null, active: false, currentX: 0 });

  React.useEffect(() => {
    const card = cardRef.current!;
    if (!card) return;

    function setBg(dir: "left" | "right" | null) {
      const bg = bgRef.current;
      if (!bg) return;
      if (dir === "left") {
        bg.style.background = "#d64040";
        if (iconDeleteRef.current) iconDeleteRef.current.style.display = "flex";
        if (iconWatchRef.current) iconWatchRef.current.style.display = "none";
      } else if (dir === "right") {
        bg.style.background = "#4f55f1";
        if (iconDeleteRef.current) iconDeleteRef.current.style.display = "none";
        if (iconWatchRef.current) iconWatchRef.current.style.display = "flex";
      } else {
        bg.style.background = "transparent";
        if (iconDeleteRef.current) iconDeleteRef.current.style.display = "none";
        if (iconWatchRef.current) iconWatchRef.current.style.display = "none";
      }
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      drag.current = { startX: t.clientX, startY: t.clientY, axis: null, active: true, currentX: 0 };
      setBg(null);
    }

    function onTouchMove(e: TouchEvent) {
      if (!drag.current.active) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.current.startX;
      const dy = t.clientY - drag.current.startY;
      if (!drag.current.axis) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8)
          drag.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        return;
      }
      if (drag.current.axis !== "x") return;
      e.preventDefault();
      const MAX = 110;
      let clamped = Math.max(-MAX, Math.min(MAX, dx));
      if (clamped > 0 && mediaType !== "tv") clamped = 0;
      drag.current.currentX = clamped;
      card.style.transform = `translateX(${clamped}px)`;
      if (clamped < -10) setBg("left");
      else if (clamped > 10 && mediaType === "tv") setBg("right");
      else setBg(null);
    }

    function onTouchEnd() {
      if (!drag.current.active) return;
      drag.current.active = false;
      const cardWidth = containerRef.current?.offsetWidth ?? 300;
      const x = drag.current.currentX;
      const threshold = cardWidth * 0.3;
      card.style.transition = "transform 0.2s ease";
      if (x < -threshold) {
        card.style.transform = `translateX(-${cardWidth}px)`;
        setTimeout(() => { card.style.transition = ""; card.style.transform = ""; setBg(null); onDelete(); }, 220);
      } else if (x > threshold && mediaType === "tv") {
        card.style.transform = `translateX(${cardWidth}px)`;
        setTimeout(() => { card.style.transition = ""; card.style.transform = ""; setBg(null); onWatching(); }, 220);
      } else {
        card.style.transform = "translateX(0)";
        setTimeout(() => { card.style.transition = ""; setBg(null); }, 220);
      }
      drag.current.currentX = 0;
    }

    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("touchmove", onTouchMove, { passive: false });
    card.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      card.removeEventListener("touchstart", onTouchStart);
      card.removeEventListener("touchmove", onTouchMove);
      card.removeEventListener("touchend", onTouchEnd);
    };
  }, [mediaType, onDelete, onWatching]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-[8px]">
      {/* Enkele achtergrond — kleur en icoon worden imperatief geupdate */}
      <div ref={bgRef} className="absolute inset-0 rounded-[8px]" style={{ background: "transparent" }}>
        <div ref={iconWatchRef} className="absolute inset-y-0 left-0 hidden items-center px-5">
          <MaskIcon src="/icons/visible.svg" className="size-7 bg-white" />
        </div>
        <div ref={iconDeleteRef} className="absolute inset-y-0 right-0 hidden items-center px-5">
          <MaskIcon src="/icons/recycle_bin.svg" className="size-7 bg-white" />
        </div>
      </div>
      <div ref={cardRef} className="relative">
        {children}
      </div>
    </div>
  );
}

function WatchlistItemCard({
  item,
  onOpen,
  onMarkSeen,
  onStartWatching,
  onPlay,
  showAvatars,
  avatarMode,
  userAvatar,
  partnerAvatar,
}: {
  item: EnrichedItem;
  onOpen: () => void;
  onMarkSeen: (e: React.MouseEvent) => void;
  onStartWatching?: () => void;
  onPlay?: () => void;
  showAvatars: boolean;
  avatarMode: "solo" | "together";
  userAvatar: AvatarPerson;
  partnerAvatar: AvatarPerson;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      {item.trailerKey && onPlay ? (
        <button
          type="button"
          aria-label={`Trailer afspelen voor ${item.title}`}
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
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
          <div className="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/40">
            <PlayIcon />
          </div>
        </button>
      ) : (
        <div className="relative h-[130px] w-[87px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
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
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex w-full flex-col">
          <div className="flex w-full items-center gap-1">
            <span className="min-w-0 flex-1 truncate text-left text-base font-medium leading-6 text-[#16181a]">
              {item.title}
            </span>
            <button
              type="button"
              aria-label={`Markeer ${item.title} als bekeken`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.type === "tv" && onStartWatching) {
                  onStartWatching();
                } else {
                  onMarkSeen(e);
                }
              }}
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
    markWatched,
    watchedIds,
  } = useFilmsLibrary();

  // tmdbIds van series die al "aan het kijken" zijn — die horen niet in de watchlist
  const watchingTmdbIds = React.useMemo(() => {
    const epPattern = /^ep-(\d+)-/;
    const ids = new Set<string>();
    for (const id of watchedIds) {
      const m = id.match(epPattern);
      if (m) ids.add(m[1]);
    }
    return ids;
  }, [watchedIds]);

  const [query, setQuery] = React.useState("");
  const [listTab, setListTab] = React.useState<ListTab>("samen");
  const [genreFilter, setGenreFilter] = React.useState<string>("Alles");
  const [trailerKey, setTrailerKey] = React.useState<string | null>(null);
  const [watchingSlide, setWatchingSlide] = React.useState<{
    item: EnrichedItem;
    seasons: { seasonNumber: number; name: string; episodeCount: number }[];
    selectedSeason: number;
    selectedEpisode: number;
  } | null>(null);

  const hasScrolledRef = React.useRef(false);

  // Restore tab and scroll anchor on mount
  React.useEffect(() => {
    const savedTab = sessionStorage.getItem(`watchlist-${kindParam}-tab`);
    if (savedTab === "alleen" || savedTab === "samen") setListTab(savedTab);

    // Keep anchor in sessionStorage until scroll succeeds (StrictMode fires effects twice;
    // first run gets cleaned up before scroll can happen, second run still finds the anchor).
    const anchor = sessionStorage.getItem(`watchlist-${kindParam}-anchor`);
    if (!anchor || hasScrolledRef.current) return;

    let stopped = false;
    let attempts = 0;
    const tryScroll = () => {
      if (stopped) return;
      const el = document.getElementById(`watchlist-item-${anchor}`);
      if (el) {
        hasScrolledRef.current = true;
        sessionStorage.removeItem(`watchlist-${kindParam}-anchor`);
        el.scrollIntoView({ behavior: "instant", block: "center" });
        return;
      }
      if (++attempts < 40) setTimeout(tryScroll, 100);
    };
    requestAnimationFrame(tryScroll);
    return () => { stopped = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    const byType = (items: WatchlistItem[]) =>
      items.filter((i) => {
        if (i.type !== config.mediaType) return false;
        if (i.type === "tv") {
          const tmdbId = i.id.replace(/^tv-/, "");
          if (watchingTmdbIds.has(tmdbId)) return false;
        }
        return true;
      });
    if (isFilmsListShared && listTab === "samen") return byType(togetherWatchlist);
    if (isFilmsListShared && listTab === "alleen") return byType(aloneWatchlist);
    return byType(ownWatchlist);
  }, [config, isFilmsListShared, listTab, togetherWatchlist, aloneWatchlist, ownWatchlist, watchingTmdbIds]);

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
    const today = new Date().toISOString().slice(0, 10);
    const isFuture = (item: EnrichedItem) => {
      const d = item.releaseDate;
      if (d) return d > today;
      // Fallback: year alone — treat unknown-date items with year > today's year as future
      return item.year > today.slice(0, 4);
    };

    const q = query.trim().toLowerCase();
    const filtered = allEnrichedItems.filter((item) => {
      if (genreFilter !== "Alles" && !item.genres.includes(genreFilter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.castNames.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.metaLine.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => (isFuture(a) ? 1 : 0) - (isFuture(b) ? 1 : 0));
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

  function handleSwipeDelete(item: EnrichedItem) {
    if (removingIds.has(item.id)) return;
    removalSnapshotsRef.current.set(item.id, item);
    setRemovingIds((prev) => new Set(prev).add(item.id));
    const timer = setTimeout(() => {
      commitRemoval(item.id);
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

  function handleSwipeWatching(item: EnrichedItem) {
    const tmdbId = item.id.replace(/^tv-/, "");
    fetch(`/api/films/detail?type=tv&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: { seasons?: { seasonNumber: number; name: string; episodeCount: number }[] }) => {
        const seasons = (data.seasons ?? []).filter((s) => s.seasonNumber > 0);
        if (seasons.length === 0) {
          // Geen seizoeninfo — direct starten bij s1e1
          void markWatched(`ep-${tmdbId}-s1e0`);
          void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
          setSnackbar({ message: `${item.title} toegevoegd aan 'Aan het kijken'`, undoFn: () => {} });
          snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
          return;
        }
        setWatchingSlide({ item, seasons, selectedSeason: seasons[0].seasonNumber, selectedEpisode: 1 });
      })
      .catch(() => {
        void markWatched(`ep-${tmdbId}-s1e0`);
        void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
      });
  }

  function handleWatchingConfirm() {
    if (!watchingSlide) return;
    const { item, selectedSeason, selectedEpisode } = watchingSlide;
    const tmdbId = item.id.replace(/^tv-/, "");
    void markWatched(`ep-${tmdbId}-s${selectedSeason}e${selectedEpisode - 1}`);
    void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
    setSnackbar({ message: `${item.title} toegevoegd aan 'Aan het kijken'`, undoFn: () => {} });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    setWatchingSlide(null);
  }

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

  async function handlePlay(item: EnrichedItem) {
    if (item.trailerKey) {
      setTrailerKey(item.trailerKey);
      return;
    }
    const dashIdx = item.id.indexOf("-");
    const tmdbId = item.id.slice(dashIdx + 1);
    try {
      const res = await fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { trailerKey?: string | null };
      if (data.trailerKey) setTrailerKey(data.trailerKey);
    } catch { /* ignore */ }
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
    <>
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Blauwe gradient achtergrond */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "linear-gradient(to bottom, #e3e4ff 0%, white 40%)" }}
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
              onValueChange={(v) => {
                const tab = v as ListTab;
                setListTab(tab);
                sessionStorage.setItem(`watchlist-${kindParam}-tab`, tab);
              }}
              aria-label="Watchlist weergave"
            >
              <TabElement value="alleen">Alleen</TabElement>
              <TabElement value="samen">Samen</TabElement>
            </TabGroup>
          )}

          {genreChips.length > 1 && (
            <div className="relative -mx-4">
              <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
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
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
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
                    id={`watchlist-item-${item.id}`}
                    key={item.id}
                    className="grid transition-[grid-template-rows,opacity,margin] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      gridTemplateRows: isRemoving ? "0fr" : "1fr",
                      opacity: isRemoving ? 0 : 1,
                      marginBottom: isRemoving ? 0 : undefined,
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SwipeableCard
                        mediaType={config.mediaType}
                        onDelete={() => handleSwipeDelete(item)}
                        onWatching={() => handleSwipeWatching(item)}
                      >
                        <WatchlistItemCard
                          item={item}
                          onOpen={() => {
                            sessionStorage.setItem(`watchlist-${kindParam}-anchor`, item.id);
                            sessionStorage.setItem("films-watchlist-return", `/films-series/watchlist/${kindParam}`);
                            router.push(`/films-series/${item.id}`);
                          }}
                          onMarkSeen={(e) => handleMarkSeen(e, item)}
                          onStartWatching={config.mediaType === "tv" ? () => handleSwipeWatching(item) : undefined}
                          onPlay={item.trailerKey ? () => void handlePlay(item) : undefined}
                          showAvatars={isFilmsListShared}
                          avatarMode={listTab === "samen" ? "together" : "solo"}
                          userAvatar={userAvatar}
                          partnerAvatar={partnerAvatar}
                        />
                      </SwipeableCard>
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

      {/* Slide-in: episode selectie voor 'Aan het kijken' */}
      <SlideInModal
        open={watchingSlide !== null}
        onClose={() => setWatchingSlide(null)}
        title="Starten bij…"
        bodyFullWidth
        footer={
          <Button variant="primary" onClick={handleWatchingConfirm}>
            Bevestigen
          </Button>
        }
      >
        {watchingSlide && (
          <>
            {watchingSlide.seasons.length > 1 && (
              <div className="overflow-x-auto pb-4 pl-4" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-2 pr-4" style={{ width: "max-content" }}>
                  {watchingSlide.seasons.map((s) => (
                    <button
                      key={s.seasonNumber}
                      type="button"
                      onClick={() => setWatchingSlide((prev) => prev ? { ...prev, selectedSeason: s.seasonNumber, selectedEpisode: 1 } : prev)}
                      className={cn(
                        "h-8 shrink-0 rounded-full px-3 text-[13px] leading-[18px] transition-colors focus-visible:outline-none",
                        watchingSlide.selectedSeason === s.seasonNumber
                          ? "bg-[#4f55f1] font-semibold text-white"
                          : "bg-[var(--gray-100)] font-normal text-[#707784]",
                      )}
                    >
                      {s.name.startsWith("Seizoen") || s.name.startsWith("Season") ? s.name : `Seizoen ${s.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-4">
              <Stepper
                label="Aflevering waarmee je begint"
                value={watchingSlide.selectedEpisode}
                min={1}
                max={watchingSlide.seasons.find((s) => s.seasonNumber === watchingSlide.selectedSeason)?.episodeCount ?? 50}
                onValueChange={(v) => setWatchingSlide((prev) => prev ? { ...prev, selectedEpisode: v } : prev)}
              />
            </div>
          </>
        )}
      </SlideInModal>
    </div>

    {trailerKey && (
      <TrailerModal trailerKey={trailerKey} onClose={() => setTrailerKey(null)} />
    )}
    </>
  );
}
