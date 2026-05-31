"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { Snackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";

const SNACKBAR_MS = 4500;

const COMMIT_RATIO = 0.36;
const MAX_REVEAL_RATIO = 0.5;
const RUBBER = 0.22;
const PREVENT_DEFAULT_DX = 18;
const SPRING_MS = 320;
const SPRING_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SWIPE_OUT_MS = 260;
const SWIPE_OUT_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

function clampBiOffset(offsetPx: number, maxReveal: number): number {
  if (offsetPx < 0) {
    if (offsetPx >= -maxReveal) return offsetPx;
    return -maxReveal + (offsetPx + maxReveal) * RUBBER;
  }
  if (offsetPx <= maxReveal) return offsetPx;
  return maxReveal + (offsetPx - maxReveal) * RUBBER;
}

function isSwipeInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  return !!target.closest('button, a, input, textarea, select, [role="checkbox"], [data-swipe-ignore]');
}

function SwipeToReact({
  children,
  onLeft,
  onRight,
  className,
}: {
  children: React.ReactNode;
  onLeft: () => void;
  onRight: () => void;
  className?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState(0);
  const [transition, setTransition] = React.useState<string | undefined>(undefined);

  const offsetLiveRef = React.useRef(0);
  React.useEffect(() => { offsetLiveRef.current = offset; }, [offset]);

  const onLeftRef = React.useRef(onLeft);
  const onRightRef = React.useRef(onRight);
  React.useEffect(() => { onLeftRef.current = onLeft; }, [onLeft]);
  React.useEffect(() => { onRightRef.current = onRight; }, [onRight]);

  const draggingRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const startClientXRef = React.useRef(0);
  const startClientYRef = React.useRef(0);
  const startOffsetRef = React.useRef(0);
  const axisLockedRef = React.useRef<"h" | "v" | null>(null);
  const maxRevealRef = React.useRef(96);
  const widthRef = React.useRef(0);
  const suppressClickRef = React.useRef(false);
  const committingRef = React.useRef(false);

  const springBack = React.useCallback(() => {
    setTransition(`transform ${SPRING_MS}ms ${SPRING_EASE}`);
    offsetLiveRef.current = 0;
    setOffset(0);
    window.setTimeout(() => setTransition(undefined), SPRING_MS + 40);
  }, []);

  const finishCommit = React.useCallback((direction: "left" | "right") => {
    const w = surfaceRef.current?.getBoundingClientRect().width ?? widthRef.current;
    committingRef.current = true;
    setTransition(`transform ${SWIPE_OUT_MS}ms ${SWIPE_OUT_EASE}`);
    setOffset(direction === "left" ? -Math.max(w, widthRef.current) : Math.max(w, widthRef.current));
    window.setTimeout(() => {
      if (direction === "left") onLeftRef.current(); else onRightRef.current();
      committingRef.current = false;
      setOffset(0);
      setTransition(undefined);
      offsetLiveRef.current = 0;
    }, SWIPE_OUT_MS + 16);
  }, []);

  const onPointerDownInner = React.useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || isSwipeInteractive(e.target)) return;
    const root = rootRef.current;
    if (!root) return;
    widthRef.current = root.getBoundingClientRect().width;
    maxRevealRef.current = Math.min(120, widthRef.current * MAX_REVEAL_RATIO);
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    startClientXRef.current = e.clientX;
    startClientYRef.current = e.clientY;
    startOffsetRef.current = offsetLiveRef.current;
    axisLockedRef.current = null;
    suppressClickRef.current = false;
    setTransition(undefined);
  }, []);

  const onPointerMoveInner = React.useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startClientXRef.current;
    const dy = e.clientY - startClientYRef.current;

    if (axisLockedRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.1) {
        axisLockedRef.current = "v";
        draggingRef.current = false;
        pointerIdRef.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }
      axisLockedRef.current = "h";
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    if (axisLockedRef.current !== "h") return;
    if (Math.abs(dx) > 14) suppressClickRef.current = true;

    const next = clampBiOffset(startOffsetRef.current + dx, maxRevealRef.current);
    if (e.cancelable && Math.abs(dx) > PREVENT_DEFAULT_DX) e.preventDefault();
    offsetLiveRef.current = next;
    setOffset(next);
  }, []);

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    draggingRef.current = false;
    pointerIdRef.current = null;
    axisLockedRef.current = null;
    if (committingRef.current) return;

    const threshold = (widthRef.current || 1) * COMMIT_RATIO;
    const current = offsetLiveRef.current;

    if (current < -threshold) { finishCommit("left"); return; }
    if (current > threshold) { finishCommit("right"); return; }
    springBack();
  }, [finishCommit, springBack]);

  const onPointerCancel = React.useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    draggingRef.current = false;
    pointerIdRef.current = null;
    axisLockedRef.current = null;
    springBack();
  }, [springBack]);

  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0 overflow-hidden rounded-[8px]", className)}>
      {offset < 0 && (
        <div className="pointer-events-none absolute inset-0 rounded-[8px] bg-[#d64040]" aria-hidden>
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <MaskIcon src="/icons/thumb_down.svg" className="size-6 bg-white" />
          </div>
        </div>
      )}
      {offset > 0 && (
        <div className="pointer-events-none absolute inset-0 rounded-[8px] bg-[#22c55e]" aria-hidden>
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-white" />
          </div>
        </div>
      )}
      <div
        ref={surfaceRef}
        className="relative z-[1] touch-pan-y rounded-[8px]"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition,
          willChange: transition ? "transform" : undefined,
        }}
        onPointerDown={onPointerDownInner}
        onPointerMove={onPointerMoveInner}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

type DetailPayload = {
  genres: string[];
  cast: { name: string }[];
  overview: string;
  score: number | null;
  trailerKey: string | null;
};

type EnrichedItem = WatchlistItem & {
  genres: string[];
  castNames: string;
  overview: string;
  metaLine: string;
  trailerKey: string | null;
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
        fill="#4f55f1"
        stroke="#4f55f1"
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
    trailerKey: data?.trailerKey ?? null,
  };
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

  // Detect video end via YouTube postMessage API
  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) {
          onCloseRef.current();
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Fullscreen when landscape, exit when portrait
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
    // Check immediately in case already landscape when modal opens
    handleOrientation();
    return () => {
      window.removeEventListener("orientationchange", handleOrientation);
      window.removeEventListener("resize", handleOrientation);
    };
  }, []);

  // Close modal when fullscreen is exited (e.g. user presses back on Android)
  React.useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        // Only close if landscape — portrait exit is normal
        if (window.innerWidth > window.innerHeight) onCloseRef.current();
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&enablejsapi=1&rel=0&playsinline=1&modestbranding=1`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
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
  onPlay,
}: {
  item: EnrichedItem;
  partnerAvatar: AvatarPerson;
  partnerName: string | null;
  onOpen: () => void;
  onReact: (reaction: "up" | "down" | "seen") => void;
  onPlay: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="flex w-full cursor-pointer items-stretch gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      {item.trailerKey ? (
        <button
          type="button"
          aria-label={`Trailer afspelen voor ${item.title}`}
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="relative h-[160px] w-[107px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
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
      )}

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
  const [trailerKey, setTrailerKey] = React.useState<string | null>(null);
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
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.metaLine.toLowerCase().includes(q) ||
          item.castNames.toLowerCase().includes(q) ||
          item.overview.toLowerCase().includes(q)
        );
      });
  }, [baseItems, enriched, query]);

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
      reaction === "up" ? "geliket" : reaction === "down" ? "gedisliket" : "als gezien gemarkeerd";
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

  async function handlePlay(item: EnrichedItem) {
    if (item.trailerKey) {
      setTrailerKey(item.trailerKey);
      return;
    }
    // Fetch on-demand if not yet enriched
    const dashIdx = item.id.indexOf("-");
    const tmdbId = item.id.slice(dashIdx + 1);
    try {
      const res = await fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { trailerKey?: string | null };
      if (data.trailerKey) setTrailerKey(data.trailerKey);
    } catch { /* ignore */ }
  }

  return (
    <>
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

          <div className="flex flex-col">
            {loadingDetails && baseItems.length > 0 && Object.keys(enriched).length === 0 ? (
              <div className="flex flex-col gap-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
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
                    className="grid"
                    style={{
                      gridTemplateRows: isRemoving ? "0fr" : "1fr",
                      transition: isRemoving
                        ? "grid-template-rows 420ms cubic-bezier(0.4,0,0.2,1)"
                        : "grid-template-rows 300ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className="pb-3"
                        style={{
                          opacity: isRemoving ? 0 : 1,
                          transform: isRemoving ? "scaleY(0.7)" : "scaleY(1)",
                          transformOrigin: "top",
                          transition: isRemoving
                            ? "opacity 300ms cubic-bezier(0.4,0,0.2,1), transform 350ms cubic-bezier(0.4,0,0.2,1)"
                            : "opacity 250ms ease-in, transform 250ms cubic-bezier(0.4,0,0.2,1)",
                        }}
                      >
                        <SwipeToReact
                          onLeft={() => handleReact(item.id, "down")}
                          onRight={() => handleReact(item.id, "up")}
                        >
                          <PartnerWatchlistItemCard
                            item={item}
                            partnerAvatar={partnerAvatar}
                            partnerName={partnerName}
                            onOpen={() => router.push(`/films-series/partner/${item.id}`)}
                            onReact={(reaction) => handleReact(item.id, reaction)}
                            onPlay={() => void handlePlay(item)}
                          />
                        </SwipeToReact>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>

    {trailerKey && (
      <TrailerModal trailerKey={trailerKey} onClose={() => setTrailerKey(null)} />
    )}

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
