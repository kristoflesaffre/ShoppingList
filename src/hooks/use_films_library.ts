"use client";

import * as React from "react";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { resolveFilmsGroupOwnerId } from "@/lib/films-share";
import {
  type WatchlistItem,
  getWatchlist as getLocalWatchlist,
} from "@/lib/watchlist";
import {
  type SeriesMeta,
  getWatchedIds as getLocalWatchedIds,
  getAllSeriesMeta as getLocalSeriesMeta,
} from "@/lib/watched";

const PLACEHOLDER = "__films_library_none__";

type DbWatchlistRow = {
  id: string;
  mediaId: string;
  type: string;
  title: string;
  year: string;
  posterUrl?: string | null;
  score?: number | null;
  order?: number;
};

type DbWatchedRow = { id: string; contentId: string };
type DbSeriesMetaRow = {
  id: string;
  tmdbId: string;
  title: string;
  year: string;
  posterUrl?: string | null;
};

function rowToWatchlistItem(row: DbWatchlistRow): WatchlistItem {
  return {
    id: row.mediaId,
    type: row.type as "movie" | "tv",
    title: row.title,
    year: row.year,
    posterUrl: row.posterUrl ?? null,
    score: row.score ?? null,
  };
}

export function useFilmsLibrary() {
  const { user, isLoading: authLoading } = db.useAuth();
  const migratedRef = React.useRef(false);
  const [localTick, setLocalTick] = React.useState(0);
  const bumpLocal = React.useCallback(() => setLocalTick((t) => t + 1), []);

  const shareQuery = React.useMemo(
    () =>
      user
        ? ({
            filmsShares: {
              memberships: {},
              $: { where: { ownerId: user.id } },
            },
            filmsShareMembers: {
              filmsShare: { memberships: {} },
              $: { where: { instantUserId: user.id } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [user],
  );

  const { data: shareData, isLoading: shareLoading } = db.useQuery(shareQuery);

  const joinedRows = (shareData?.filmsShareMembers ?? []) as {
    filmsShare?: { ownerId?: string | null } | null;
  }[];

  const groupOwnerId = React.useMemo(
    () =>
      user
        ? resolveFilmsGroupOwnerId({
            userId: user.id,
            joinedMemberships: joinedRows,
          })
        : null,
    [user, joinedRows],
  );

  const dataQuery = React.useMemo(
    () =>
      user && groupOwnerId
        ? ({
            filmsWatchlistItems: {
              $: { where: { groupOwnerId } },
            },
            filmsWatchedMarks: {
              $: { where: { groupOwnerId } },
            },
            filmsSeriesMeta: {
              $: { where: { groupOwnerId } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : ({
            filmsWatchlistItems: {
              $: { where: { groupOwnerId: PLACEHOLDER } },
            },
            filmsWatchedMarks: {
              $: { where: { groupOwnerId: PLACEHOLDER } },
            },
            filmsSeriesMeta: {
              $: { where: { groupOwnerId: PLACEHOLDER } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0]),
    [user, groupOwnerId],
  );

  const { data: libraryData, isLoading: libraryLoading } = db.useQuery(
    user ? dataQuery : null,
  );

  const ownedShare =
    ((shareData?.filmsShares ?? []) as { id?: string; ownerId?: string; shareToken?: string }[])[0] ??
    null;
  const isShareOwner = Boolean(user && groupOwnerId === user.id);

  const watchlist = React.useMemo((): WatchlistItem[] => {
    if (!user || !groupOwnerId) return getLocalWatchlist();
    const rows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).slice();
    rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return rows.map(rowToWatchlistItem);
  }, [user, groupOwnerId, libraryData?.filmsWatchlistItems, localTick]);

  const watchedIds = React.useMemo((): string[] => {
    if (!user || !groupOwnerId) return getLocalWatchedIds();
    return ((libraryData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).map((r) => r.contentId);
  }, [user, groupOwnerId, libraryData?.filmsWatchedMarks, localTick]);

  const watchedSet = React.useMemo(() => new Set(watchedIds), [watchedIds]);

  const seriesMeta = React.useMemo((): Record<string, SeriesMeta> => {
    if (!user || !groupOwnerId) return getLocalSeriesMeta();
    const map: Record<string, SeriesMeta> = {};
    for (const row of (libraryData?.filmsSeriesMeta ?? []) as DbSeriesMetaRow[]) {
      map[row.tmdbId] = {
        title: row.title,
        year: row.year,
        posterUrl: row.posterUrl ?? null,
      };
    }
    return map;
  }, [user, groupOwnerId, libraryData?.filmsSeriesMeta, localTick]);

  React.useEffect(() => {
    if (!user || !groupOwnerId || groupOwnerId !== user.id) return;
    if (migratedRef.current || libraryLoading) return;

    const dbItems = (libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[];
    if (dbItems.length > 0) {
      migratedRef.current = true;
      return;
    }

    const localItems = getLocalWatchlist();
    const localWatched = getLocalWatchedIds();
    const localMeta = getLocalSeriesMeta();
    if (localItems.length === 0 && localWatched.length === 0 && Object.keys(localMeta).length === 0) {
      migratedRef.current = true;
      return;
    }

    migratedRef.current = true;
    const txs: Parameters<typeof db.transact>[0] = [];

    localItems.forEach((item, index) => {
      txs.push(
        db.tx.filmsWatchlistItems[instantId()].update({
          mediaId: item.id,
          type: item.type,
          title: item.title,
          year: item.year,
          posterUrl: item.posterUrl ?? undefined,
          score: item.score ?? undefined,
          order: index,
          groupOwnerId: user.id,
        }),
      );
    });

    for (const contentId of localWatched) {
      txs.push(
        db.tx.filmsWatchedMarks[instantId()].update({
          contentId,
          groupOwnerId: user.id,
        }),
      );
    }

    for (const [tmdbId, meta] of Object.entries(localMeta)) {
      txs.push(
        db.tx.filmsSeriesMeta[instantId()].update({
          tmdbId,
          title: meta.title,
          year: meta.year,
          posterUrl: meta.posterUrl ?? undefined,
          groupOwnerId: user.id,
        }),
      );
    }

    if (txs.length > 0) void db.transact(txs);
  }, [user, groupOwnerId, libraryLoading, libraryData?.filmsWatchlistItems]);

  const isInWatchlist = React.useCallback(
    (id: string) => watchlist.some((i) => i.id === id),
    [watchlist],
  );

  const isWatched = React.useCallback((id: string) => watchedSet.has(id), [watchedSet]);

  const addToWatchlist = React.useCallback(
    async (item: WatchlistItem) => {
      if (!user || !groupOwnerId) {
        const { addToWatchlist: addLocal } = await import("@/lib/watchlist");
        addLocal(item);
        bumpLocal();
        return;
      }
      if (watchlist.some((i) => i.id === item.id)) return;
      const maxOrder = watchlist.reduce((max, _, idx) => Math.max(max, idx), -1);
      await db.transact(
        db.tx.filmsWatchlistItems[instantId()].update({
          mediaId: item.id,
          type: item.type,
          title: item.title,
          year: item.year,
          posterUrl: item.posterUrl ?? undefined,
          score: item.score ?? undefined,
          order: maxOrder + 1,
          groupOwnerId,
        }),
      );
    },
    [user, groupOwnerId, watchlist, bumpLocal],
  );

  const removeFromWatchlist = React.useCallback(
    async (mediaId: string) => {
      if (!user || !groupOwnerId) {
        const { removeFromWatchlist: removeLocal } = await import("@/lib/watchlist");
        removeLocal(mediaId);
        bumpLocal();
        return;
      }
      const row = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).find(
        (r) => r.mediaId === mediaId,
      );
      if (row?.id) await db.transact(db.tx.filmsWatchlistItems[row.id].delete());
    },
    [user, groupOwnerId, libraryData?.filmsWatchlistItems, bumpLocal],
  );

  const updateWatchlistScore = React.useCallback(
    async (mediaId: string, score: number) => {
      if (!user || !groupOwnerId) {
        const { updateWatchlistScore: updateLocal } = await import("@/lib/watchlist");
        updateLocal(mediaId, score);
        bumpLocal();
        return;
      }
      const row = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).find(
        (r) => r.mediaId === mediaId,
      );
      if (row?.id) await db.transact(db.tx.filmsWatchlistItems[row.id].update({ score }));
    },
    [user, groupOwnerId, libraryData?.filmsWatchlistItems],
  );

  const markWatched = React.useCallback(
    async (contentId: string) => {
      if (!user || !groupOwnerId) {
        const { markWatched: markLocal } = await import("@/lib/watched");
        markLocal(contentId);
        bumpLocal();
        return;
      }
      if (watchedSet.has(contentId)) return;
      await db.transact(
        db.tx.filmsWatchedMarks[instantId()].update({ contentId, groupOwnerId }),
      );
    },
    [user, groupOwnerId, watchedSet, bumpLocal],
  );

  const unmarkWatched = React.useCallback(
    async (contentId: string) => {
      if (!user || !groupOwnerId) {
        const { unmarkWatched: unmarkLocal } = await import("@/lib/watched");
        unmarkLocal(contentId);
        bumpLocal();
        return;
      }
      const row = ((libraryData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).find(
        (r) => r.contentId === contentId,
      );
      if (row?.id) await db.transact(db.tx.filmsWatchedMarks[row.id].delete());
    },
    [user, groupOwnerId, libraryData?.filmsWatchedMarks, bumpLocal],
  );

  const saveSeriesMeta = React.useCallback(
    async (tmdbId: string, meta: SeriesMeta) => {
      if (!user || !groupOwnerId) {
        const { saveSeriesMeta: saveLocal } = await import("@/lib/watched");
        saveLocal(tmdbId, meta);
        bumpLocal();
        return;
      }
      const existing = ((libraryData?.filmsSeriesMeta ?? []) as DbSeriesMetaRow[]).find(
        (r) => r.tmdbId === tmdbId,
      );
      if (existing?.id) {
        await db.transact(
          db.tx.filmsSeriesMeta[existing.id].update({
            title: meta.title,
            year: meta.year,
            posterUrl: meta.posterUrl ?? undefined,
          }),
        );
      } else {
        await db.transact(
          db.tx.filmsSeriesMeta[instantId()].update({
            tmdbId,
            title: meta.title,
            year: meta.year,
            posterUrl: meta.posterUrl ?? undefined,
            groupOwnerId,
          }),
        );
      }
    },
    [user, groupOwnerId, libraryData?.filmsSeriesMeta, bumpLocal],
  );

  return {
    user,
    authLoading,
    dataLoading: authLoading || shareLoading || (user ? libraryLoading : false),
    groupOwnerId,
    ownedShare,
    isShareOwner,
    watchlist,
    watchedIds,
    watchedSet,
    seriesMeta,
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistScore,
    markWatched,
    unmarkWatched,
    saveSeriesMeta,
  };
}
