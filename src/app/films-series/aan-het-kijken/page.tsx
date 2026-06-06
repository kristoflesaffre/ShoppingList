"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SwipeToAdd } from "@/components/ui/swipe_to_add";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { Snackbar } from "@/components/ui/snackbar";
import {
  useWatchingTvItems,
  type RemovedWatchingTvItemSnapshot,
  type WatchingTvItem,
} from "@/hooks/use_watching_tv_items";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { cn } from "@/lib/utils";

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

function WatchingSkeleton() {
  return (
    <div className="flex w-full animate-pulse items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3">
      <div className="h-[108px] w-[72px] shrink-0 rounded-[4px] bg-[var(--gray-100)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-5 w-3/4 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-20 rounded bg-[var(--gray-100)]" />
          <div className="h-6 w-24 rounded bg-[var(--gray-100)]" />
        </div>
      </div>
    </div>
  );
}

function WatchingCard({
  item,
  onOpen,
  onMarkNextEpisode,
}: {
  item: WatchingTvItem;
  onOpen: () => void;
  onMarkNextEpisode: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <div className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
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

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex w-full flex-col">
          <div className="flex w-full items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[#16181a]">
              {item.title}
            </p>
            <button
              type="button"
              aria-label={`Markeer ${item.title}, seizoen ${item.nextSeason} aflevering ${item.nextEpisode}, als bekeken`}
              onClick={(e) => {
                e.stopPropagation();
                onMarkNextEpisode();
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
            </button>
          </div>
          <p className="text-sm leading-5 text-[#8c929d]">{item.year} TV Serie</p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-[#edeefe] px-2 py-1 text-xs leading-4 text-[#4f55f1]">
            Seizoen {item.nextSeason}
          </span>
          <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-[#edeefe] px-2 py-1 text-xs leading-4 text-[#4f55f1]">
            Aflevering {item.nextEpisode}
          </span>
        </div>
      </div>
    </div>
  );
}

type SnackbarModel =
  | {
      message: string;
      actionLabel: "Zet terug";
      undoSnapshot: RemovedWatchingTvItemSnapshot;
    }
  | {
      message: string;
      actionLabel: "Zet terug";
      undoFn: () => void;
    }
  | {
      message: string;
      actionLabel: null;
    };

export default function WatchingOverviewPage() {
  const router = useRouter();
  const {
    watchingItems,
    markNextEpisode,
    removeWatchingItem,
    restoreWatchingItem,
    unmarkWatchedEpisode,
  } = useWatchingTvItems();
  const [mounted, setMounted] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());
  const [snackbar, setSnackbar] = React.useState<SnackbarModel | null>(null);
  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    };
  }, []);

  const visibleItems = React.useMemo(
    () => watchingItems.filter((item) => !dismissedIds.has(item.id)),
    [watchingItems, dismissedIds],
  );

  const showSnackbar = React.useCallback((next: SnackbarModel) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(next);
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
  }, []);

  const handleOpen = React.useCallback(
    (item: WatchingTvItem) => {
      router.push(`/films-series/${item.id}/episodes/s${item.nextSeason}e${item.nextEpisode}`);
    },
    [router],
  );

  const handleMarkNextEpisode = React.useCallback(
    (item: WatchingTvItem) => {
      void markNextEpisode(item).then((result) => {
        if (result.completed) {
          showSnackbar({
            message: "Serie volledig bekeken en uit watchlist verwijderd",
            actionLabel: null,
          });
          return;
        }

        if (result.epId && result.episode != null) {
          const seasonLabel =
            result.season != null && result.season > item.lastWatched.season
              ? `Seizoen ${result.season}, aflevering ${result.episode}`
              : `Aflevering ${result.episode}`;
          showSnackbar({
            message: `${seasonLabel} als bekeken gemarkeerd`,
            actionLabel: "Zet terug",
            undoFn: () => void unmarkWatchedEpisode(result.epId!),
          });
        }
      });
    },
    [markNextEpisode, showSnackbar, unmarkWatchedEpisode],
  );

  const handleRemove = React.useCallback(
    (item: WatchingTvItem) => {
      setDismissedIds((prev) => new Set(prev).add(item.id));
      void removeWatchingItem(item)
        .then((snapshot) => {
          showSnackbar({
            message: `${item.title} verwijderd`,
            actionLabel: "Zet terug",
            undoSnapshot: snapshot,
          });
        })
        .catch(() => {
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          showSnackbar({
            message: "Verwijderen is niet gelukt",
            actionLabel: null,
          });
        });
    },
    [removeWatchingItem, showSnackbar],
  );

  const handleSnackbarAction = React.useCallback(() => {
    if (!snackbar || snackbar.actionLabel === null) return;
    if ("undoSnapshot" in snackbar) {
      const id = snackbar.undoSnapshot.watchlistItem.id;
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void restoreWatchingItem(snackbar.undoSnapshot);
    } else {
      snackbar.undoFn();
    }

    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(null);
  }, [restoreWatchingItem, snackbar]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
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
              Aan het kijken
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

      <main
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        <h1 className="truncate text-2xl font-bold leading-8 text-[#16181a]">Aan het kijken</h1>

        <div className="flex flex-col gap-3">
          {!mounted ? (
            <>
              <WatchingSkeleton />
              <WatchingSkeleton />
              <WatchingSkeleton />
            </>
          ) : visibleItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--gray-400)]">
              Je kijkt momenteel geen series.
            </p>
          ) : (
            visibleItems.map((item) => (
              <SwipeToDelete
                key={item.id}
                onDelete={() => handleRemove(item)}
                deleteActionLabel={`Veeg naar links om ${item.title} te verwijderen`}
              >
                <SwipeToAdd
                  onAdd={() => handleMarkNextEpisode(item)}
                  addActionLabel={`Veeg naar rechts om ${item.title}, seizoen ${item.nextSeason} aflevering ${item.nextEpisode}, als bekeken te markeren`}
                  actionIcon={<MaskIcon src="/icons/visible.svg" className="size-6 bg-white" />}
                >
                  <WatchingCard
                    item={item}
                    onOpen={() => handleOpen(item)}
                    onMarkNextEpisode={() => handleMarkNextEpisode(item)}
                  />
                </SwipeToAdd>
              </SwipeToDelete>
            ))
          )}
        </div>
      </main>

      {snackbar && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]",
            APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
          )}
        >
          <Snackbar
            message={snackbar.message}
            actionLabel={snackbar.actionLabel}
            onAction={handleSnackbarAction}
            className="w-full max-w-[956px]"
          />
        </div>
      )}
    </div>
  );
}
