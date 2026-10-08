"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { Snackbar } from "@/components/ui/snackbar";
import {
  useWatchingTvItems,
  type RemovedWatchingTvItemSnapshot,
  type WatchingTvItem,
} from "@/hooks/use_watching_tv_items";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { Shimmer } from "@/components/ui/shimmer";
import { FilmIcons } from "@/components/films/film_detail_ui";
import { WatchingCard } from "@/components/films/film_tiles";


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
    markSeasonWatched,
    markSeriesWatched,
    unmarkEpisodes,
    removeWatchingItem,
    restoreWatchingItem,
    unmarkWatchedEpisode,
  } = useWatchingTvItems();
  const { addToWatchlist, dataLoading } = useFilmsLibrary();
  const [menuFor, setMenuFor] = React.useState<string | null>(null);

  // Menu sluiten bij een tik ernaast.
  React.useEffect(() => {
    if (!menuFor) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest("[data-watch-menu]")) setMenuFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuFor]);
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

  async function handleMarkSeason(item: WatchingTvItem) {
    setMenuFor(null);
    const res = await markSeasonWatched(item);
    if (!res) return;
    showSnackbar({ message: `Seizoen ${res.season} als bekeken gemarkeerd`, actionLabel: "Zet terug", undoFn: () => void unmarkEpisodes(res.ids) });
  }

  async function handleMarkSeries(item: WatchingTvItem) {
    setMenuFor(null);
    const res = await markSeriesWatched(item);
    if (!res) return;
    showSnackbar({
      message: `${item.title} helemaal gezien`,
      actionLabel: "Zet terug",
      undoFn: () => {
        void unmarkEpisodes(res.ids);
        if (res.watchlistItem) void addToWatchlist(res.watchlistItem);
      },
    });
  }

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

  const count = visibleItems.length;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «22 · Aan het kijken — voorstel»: grote titel, dezelfde kaarten als op het overzicht. */}
      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-12">
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
        <div className="mt-1 flex items-center gap-3 lg:mt-0">
          <PageBackButton href="/films-series" label="Terug" />
          <div>
            <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">Aan het kijken</h1>
            {mounted && !dataLoading && count > 0 ? (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{count} {count === 1 ? "serie" : "series"}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-[18px] flex flex-col gap-2.5 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-3.5">
          {!mounted || dataLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 rounded-[20px] bg-[var(--white)] p-2.5 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
                <Shimmer className="h-[104px] w-[70px] shrink-0 rounded-[12px]" />
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <Shimmer className="h-4 w-3/4 rounded-md" />
                    <Shimmer className="mt-2 h-3 w-1/2 rounded-md" />
                    <Shimmer className="mt-3 h-1 w-full rounded-full" />
                  </div>
                  <Shimmer className="h-7 w-2/5 rounded-full" />
                </div>
              </div>
            ))
          ) : count === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)] lg:col-span-2">Je kijkt momenteel geen series.</p>
          ) : (
            visibleItems.map((item) => (
              <SwipeToDelete
                key={item.id}
                onDelete={() => handleRemove(item)}
                deleteActionLabel={`Veeg naar links om ${item.title} te verwijderen`}
              >
                <WatchingCard
                  item={item}
                  className="w-full"
                  menuOpen={menuFor === item.id}
                  onToggleMenu={() => setMenuFor((v) => (v === item.id ? null : item.id))}
                  onOpen={() => handleOpen(item)}
                  onNext={(e) => {
                    e.stopPropagation();
                    handleMarkNextEpisode(item);
                  }}
                  onSeason={() => void handleMarkSeason(item)}
                  onSeries={() => void handleMarkSeries(item)}
                />
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
