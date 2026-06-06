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
import {
  dismissDiscoverItem as dismissLocalDiscoverItem,
  getDismissedDiscoverIds as getLocalDismissedDiscoverIds,
  restoreDiscoverItem as restoreLocalDiscoverItem,
} from "@/lib/discover-feedback";

const PLACEHOLDER = "__films_library_none__";

type DbWatchlistRow = {
  id: string;
  mediaId: string;
  type: string;
  title: string;
  year: string;
  posterUrl?: string | null;
  score?: number | null;
  scoreSource?: "imdb" | "tmdb" | null;
  order?: number;
  addedByUserId?: string | null;
  overview?: string | null;
};

type DbWatchedRow = { id: string; contentId: string };
type DbSeriesMetaRow = {
  id: string;
  tmdbId: string;
  title: string;
  year: string;
  posterUrl?: string | null;
};
type DbPartnerReactionRow = {
  id: string;
  reactingUserId: string;
  mediaId: string;
  reaction: string;
  groupOwnerId: string;
};

type PartnerFeedback = "up" | "down" | "seen";

function rowToWatchlistItem(row: DbWatchlistRow): WatchlistItem {
  return {
    id: row.mediaId,
    type: row.type as "movie" | "tv",
    title: row.title,
    year: row.year,
    posterUrl: row.posterUrl ?? null,
    score: row.score ?? null,
    scoreSource: row.scoreSource ?? null,
    overview: row.overview ?? null,
    order: row.order,
  };
}

export function useFilmsLibrary() {
  const { user, isLoading: authLoading } = db.useAuth();
  const migratedRef = React.useRef(false);
  const [localTick, setLocalTick] = React.useState(0);
  const bumpLocal = React.useCallback(() => setLocalTick((t) => t + 1), []);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

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

  // Determine who the partner is:
  // - If I'm a member → partner is the group owner (groupOwnerId !== user.id)
  // - If I'm the owner → partner is the first member
  const partnerUserId = React.useMemo(() => {
    if (!user) return null;
    if (groupOwnerId && groupOwnerId !== user.id) return groupOwnerId;
    const ownedMemberships = (
      (shareData?.filmsShares ?? []) as {
        memberships?: { instantUserId?: string | null }[] | null;
      }[]
    )[0]?.memberships ?? [];
    return ownedMemberships[0]?.instantUserId ?? null;
  }, [user, groupOwnerId, shareData?.filmsShares]);

  // Query partner's profile for display name + avatar
  const partnerProfileQuery = React.useMemo(
    () =>
      partnerUserId
        ? ({
            profiles: { $: { where: { instantUserId: partnerUserId } } },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [partnerUserId],
  );
  const { data: partnerProfileData } = db.useQuery(partnerProfileQuery);
  const partnerProfile = ((partnerProfileData?.profiles ?? []) as { firstName?: string | null; avatarUrl?: string | null }[])[0] ?? null;
  const partnerName = partnerProfile?.firstName ?? null;
  const partnerAvatarUrl = partnerProfile?.avatarUrl ?? null;

  const selfProfileQuery = React.useMemo(
    () =>
      user
        ? ({
            profiles: { $: { where: { instantUserId: user.id } } },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [user],
  );
  const { data: selfProfileData } = db.useQuery(selfProfileQuery);
  const selfProfile = ((selfProfileData?.profiles ?? []) as { firstName?: string | null; avatarUrl?: string | null }[])[0] ?? null;
  const userName = selfProfile?.firstName ?? null;
  const userAvatarUrl = selfProfile?.avatarUrl ?? null;

  const isFilmsListShared = Boolean(user && partnerUserId);

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

  // Alle reacties in de groep (eigen + partner) — nodig voor tab Samen en partner-goedkeuringen
  const reactionsQuery = React.useMemo(
    () =>
      user && groupOwnerId
        ? ({
            filmsPartnerReactions: {
              $: { where: { groupOwnerId } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [user, groupOwnerId],
  );
  const { data: reactionsData } = db.useQuery(reactionsQuery);

  // When the current user is a *member* (not owner) of someone else's group, their own historical
  // data (added before joining) is stored under groupOwnerId = user.id. Fetch it separately and merge.
  const personalDataQuery = React.useMemo(
    () =>
      user && groupOwnerId && groupOwnerId !== user.id
        ? ({
            filmsWatchlistItems: {
              $: { where: { groupOwnerId: user.id } },
            },
            filmsWatchedMarks: {
              $: { where: { groupOwnerId: user.id } },
            },
            filmsSeriesMeta: {
              $: { where: { groupOwnerId: user.id } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [user, groupOwnerId],
  );
  const { data: personalData, isLoading: personalLoading } = db.useQuery(personalDataQuery);

  const ownedShare =
    ((shareData?.filmsShares ?? []) as { id?: string; ownerId?: string; shareToken?: string }[])[0] ??
    null;
  const isShareOwner = Boolean(user && groupOwnerId === user.id);

  // mediaIds waar de huidige gebruiker al op heeft gereageerd (elke reactie)
  const partnerReactedIds = React.useMemo(() => {
    if (!user || !groupOwnerId) return new Set<string>();
    return new Set(
      ((reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[])
        .filter((r) => r.reactingUserId === user.id)
        .map((r) => r.mediaId),
    );
  }, [user, groupOwnerId, reactionsData?.filmsPartnerReactions]);

  // Set of mediaIds where current user reacted "up" (accepted partner item)
  const partnerReactedUpIds = React.useMemo(() => {
    if (!user || !groupOwnerId) return new Set<string>();
    return new Set(
      ((reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[])
        .filter((r) => r.reactingUserId === user.id && r.reaction === "up")
        .map((r) => r.mediaId),
    );
  }, [user, groupOwnerId, reactionsData?.filmsPartnerReactions]);

  /** Partner heeft met duim omhoog geaccepteerd (jouw items). */
  const partnerAcceptedUpIds = React.useMemo(() => {
    if (!user || !groupOwnerId || !partnerUserId) return new Set<string>();
    return new Set(
      ((reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[])
        .filter((r) => r.reactingUserId === partnerUserId && r.reaction === "up")
        .map((r) => r.mediaId),
    );
  }, [user, groupOwnerId, partnerUserId, reactionsData?.filmsPartnerReactions]);

  const partnerFeedbackByMediaId = React.useMemo((): Record<string, PartnerFeedback> => {
    if (!user || !groupOwnerId || !partnerUserId) return {};
    const feedback: Record<string, PartnerFeedback> = {};
    for (const row of (reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[]) {
      if (row.reactingUserId !== partnerUserId) continue;
      if (row.reaction !== "up" && row.reaction !== "down" && row.reaction !== "seen") continue;
      feedback[row.mediaId] = row.reaction;
    }
    return feedback;
  }, [user, groupOwnerId, partnerUserId, reactionsData?.filmsPartnerReactions]);

  // Full group watchlist (shared items + personal historical items merged) — used for isInWatchlist, addToWatchlist, watchingItems
  const watchlist = React.useMemo((): WatchlistItem[] => {
    if (!user || !groupOwnerId) return mounted ? getLocalWatchlist() : [];
    const isMember = groupOwnerId !== user.id;
    const sharedRows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).slice();
    const personalRows = isMember ? ((personalData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]) : [];
    const sharedIds = new Set(sharedRows.map((r) => r.mediaId));
    const merged = [...sharedRows, ...personalRows.filter((r) => !sharedIds.has(r.mediaId))];
    merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return merged.map(rowToWatchlistItem);
  }, [user, groupOwnerId, libraryData?.filmsWatchlistItems, personalData?.filmsWatchlistItems, localTick, mounted]);

  // Own watchlist: what to show in the user's personal sections
  // - Own items added to the shared group (addedByUserId === user.id)
  // - Partner items the user reacted "up" to (promoted to own list)
  // - Legacy items without addedByUserId (only when owner — null items in a shared group could be the partner's old items)
  // - Personal historical items from before joining the share (fetched via personalDataQuery)
  const ownWatchlist = React.useMemo((): WatchlistItem[] => {
    if (!user || !groupOwnerId) return mounted ? getLocalWatchlist() : [];
    const isMember = groupOwnerId !== user.id;

    const sharedRows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).filter(
      (row) =>
        row.addedByUserId === user.id ||
        partnerReactedUpIds.has(row.mediaId) ||
        (!isMember && !row.addedByUserId), // legacy own items only when owner
    );

    const personalRows = isMember
      ? ((personalData?.filmsWatchlistItems ?? []) as DbWatchlistRow[])
      : [];

    const sharedIds = new Set(sharedRows.map((r) => r.mediaId));
    const merged = [...sharedRows, ...personalRows.filter((r) => !sharedIds.has(r.mediaId))];
    merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return merged.map(rowToWatchlistItem);
  }, [user, groupOwnerId, libraryData?.filmsWatchlistItems, personalData?.filmsWatchlistItems, partnerReactedUpIds, localTick, mounted]);

  /**
   * Tab “Samen”: alleen items die door beide partijen zijn geaccepteerd (duim omhoog).
   * - Jij hebt toegevoegd → partner moet “up” hebben gereageerd.
   * - Partner heeft toegevoegd → jij moet “up” hebben gereageerd.
   */
  const togetherWatchlist = React.useMemo((): WatchlistItem[] => {
    if (!user || !groupOwnerId || !partnerUserId) return [];
    const isOwner = groupOwnerId === user.id;
    const rows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).slice();
    const isMyRow = (r: DbWatchlistRow) =>
      r.addedByUserId === user.id || (isOwner && !r.addedByUserId);
    const isPartnerRow = (r: DbWatchlistRow) => r.addedByUserId === partnerUserId;

    const byMediaId = new Map<string, DbWatchlistRow[]>();
    for (const row of rows) {
      const list = byMediaId.get(row.mediaId) ?? [];
      list.push(row);
      byMediaId.set(row.mediaId, list);
    }

    const together: DbWatchlistRow[] = [];
    byMediaId.forEach((mediaRows, mediaId) => {
      const iAdded = mediaRows.some(isMyRow);
      const partnerAdded = mediaRows.some(isPartnerRow);
      const onSamen =
        (iAdded && partnerAcceptedUpIds.has(mediaId)) ||
        (partnerAdded && partnerReactedUpIds.has(mediaId));
      if (!onSamen) return;
      const row =
        mediaRows.find(isMyRow) ?? mediaRows.find(isPartnerRow) ?? mediaRows[0];
      together.push(row);
    });

    together.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return together.map(rowToWatchlistItem);
  }, [
    user,
    groupOwnerId,
    partnerUserId,
    libraryData?.filmsWatchlistItems,
    partnerAcceptedUpIds,
    partnerReactedUpIds,
    localTick,
  ]);

  /** Tab “Alleen”: eigen lijst zonder items die al op Samen staan. */
  const aloneWatchlist = React.useMemo((): WatchlistItem[] => {
    if (!partnerUserId) return ownWatchlist;
    const togetherIds = new Set(togetherWatchlist.map((i) => i.id));
    return ownWatchlist.filter((i) => !togetherIds.has(i.id));
  }, [ownWatchlist, togetherWatchlist, partnerUserId]);

  // Partner's watchlist: items added by partner that the current user hasn't reacted to yet
  const partnerWatchlist = React.useMemo((): WatchlistItem[] => {
    if (!user || !groupOwnerId || !partnerUserId) return [];
    const rows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).slice();
    rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return rows
      .filter((row) => row.addedByUserId === partnerUserId && !partnerReactedIds.has(row.mediaId))
      .map(rowToWatchlistItem);
  }, [user, groupOwnerId, partnerUserId, libraryData?.filmsWatchlistItems, partnerReactedIds, localTick]);

  const watchedIds = React.useMemo((): string[] => {
    if (!user || !groupOwnerId) return mounted ? getLocalWatchedIds() : [];
    const sharedMarks = ((libraryData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).map((r) => r.contentId);
    const isMember = groupOwnerId !== user.id;
    const personalMarks = isMember
      ? ((personalData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).map((r) => r.contentId)
      : [];
    const seen = new Set<string>();
    return [...sharedMarks, ...personalMarks].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [user, groupOwnerId, libraryData?.filmsWatchedMarks, personalData?.filmsWatchedMarks, localTick, mounted]);

  const watchedSet = React.useMemo(() => new Set(watchedIds), [watchedIds]);

  const discoverDismissedIds = React.useMemo(
    () => (mounted ? getLocalDismissedDiscoverIds() : []),
    [mounted, localTick],
  );

  const dismissDiscoverItem = React.useCallback(
    async (mediaId: string) => {
      dismissLocalDiscoverItem(mediaId);
      bumpLocal();
    },
    [bumpLocal],
  );

  const restoreDiscoverItem = React.useCallback(
    async (mediaId: string) => {
      restoreLocalDiscoverItem(mediaId);
      bumpLocal();
    },
    [bumpLocal],
  );

  const seriesMeta = React.useMemo((): Record<string, SeriesMeta> => {
    const localMeta = mounted ? getLocalSeriesMeta() : {};
    if (!user || !groupOwnerId) return localMeta;
    const map: Record<string, SeriesMeta> = {};
    const isMember = groupOwnerId !== user.id;
    if (isMember) {
      for (const row of (personalData?.filmsSeriesMeta ?? []) as DbSeriesMetaRow[]) {
        map[row.tmdbId] = { title: row.title, year: row.year, posterUrl: row.posterUrl ?? null };
      }
    }
    for (const row of (libraryData?.filmsSeriesMeta ?? []) as DbSeriesMetaRow[]) {
      map[row.tmdbId] = { title: row.title, year: row.year, posterUrl: row.posterUrl ?? null };
    }
    for (const [tmdbId, local] of Object.entries(localMeta)) {
      if (map[tmdbId]) {
        if (local.seasons?.length) {
          map[tmdbId] = { ...map[tmdbId], seasons: local.seasons };
        }
      } else {
        map[tmdbId] = local;
      }
    }
    return map;
  }, [user, groupOwnerId, libraryData?.filmsSeriesMeta, personalData?.filmsSeriesMeta, localTick, mounted]);

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
          addedByUserId: user.id,
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
      const allRows = (libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[];
      const personalRows = (personalData?.filmsWatchlistItems ?? []) as DbWatchlistRow[];
      // Only check the user's own rows — partner rows in the same group must not block re-add.
      // Also check personalData (items added before joining a group).
      const ownRow =
        allRows.find((r) => r.mediaId === item.id && r.addedByUserId === user.id) ??
        personalRows.find((r) => r.mediaId === item.id && r.addedByUserId === user.id);
      if (ownRow) return;

      if (typeof item.restoreIndex === "number" && Number.isFinite(item.restoreIndex)) {
        const isOwner = groupOwnerId === user.id;
        const targetIndex = Math.max(0, Math.floor(item.restoreIndex));
        const writableRowsByMediaId = new Map(
          [...allRows, ...personalRows]
            .filter((r) =>
              r.id &&
              r.type === item.type &&
              r.mediaId !== item.id &&
              (r.addedByUserId === user.id || (isOwner && !r.addedByUserId)),
            )
            .map((r) => [r.mediaId, r]),
        );
        const currentLaneItems = ownWatchlist.filter((i) => i.type === item.type && i.id !== item.id);
        const insertIndex = Math.min(targetIndex, currentLaneItems.length);
        const restoredLaneItems = [
          ...currentLaneItems.slice(0, insertIndex),
          item,
          ...currentLaneItems.slice(insertIndex),
        ];
        const newRowId = instantId();
        const txs: Parameters<typeof db.transact>[0] = [];

        restoredLaneItems.forEach((laneItem, index) => {
          if (laneItem.id === item.id) {
            txs.push(
              db.tx.filmsWatchlistItems[newRowId].update({
                mediaId: item.id,
                type: item.type,
                title: item.title,
                year: item.year,
                posterUrl: item.posterUrl ?? undefined,
                score: item.score ?? undefined,
                overview: item.overview ?? undefined,
                order: index,
                groupOwnerId,
                addedByUserId: user.id,
              }),
            );
            return;
          }

          const row = writableRowsByMediaId.get(laneItem.id);
          if (row?.id && row.order !== index) {
            txs.push(db.tx.filmsWatchlistItems[row.id].update({ order: index }));
          }
        });

        await db.transact(txs);
        return;
      }

      const maxOrder = [...allRows, ...personalRows].reduce((max, r) => Math.max(max, r.order ?? 0), -1);
      await db.transact(
        db.tx.filmsWatchlistItems[instantId()].update({
          mediaId: item.id,
          type: item.type,
          title: item.title,
          year: item.year,
          posterUrl: item.posterUrl ?? undefined,
          score: item.score ?? undefined,
          overview: item.overview ?? undefined,
          order: item.order ?? maxOrder + 1,
          groupOwnerId,
          addedByUserId: user.id,
        }),
      );
    },
    [user, groupOwnerId, libraryData?.filmsWatchlistItems, personalData?.filmsWatchlistItems, ownWatchlist, bumpLocal],
  );

  const removeFromWatchlist = React.useCallback(
    async (mediaId: string) => {
      const { removeFromWatchlist: removeLocal } = await import("@/lib/watchlist");
      removeLocal(mediaId);

      if (!user || !groupOwnerId) {
        bumpLocal();
        return;
      }

      const allRows = (libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[];
      const personalRows = (personalData?.filmsWatchlistItems ?? []) as DbWatchlistRow[];
      const isOwner = groupOwnerId === user.id;
      const watchlistDeletes = new Set<string>();

      for (const r of allRows) {
        if (r.mediaId !== mediaId || !r.id) continue;
        if (r.addedByUserId === user.id) watchlistDeletes.add(r.id);
        else if (isOwner && !r.addedByUserId) watchlistDeletes.add(r.id);
      }
      for (const r of personalRows) {
        if (r.mediaId === mediaId && r.id) watchlistDeletes.add(r.id);
      }

      const txs: Parameters<typeof db.transact>[0] = [
        ...Array.from(watchlistDeletes).map((id) => db.tx.filmsWatchlistItems[id].delete()),
      ];

      // Item staat alleen op eigen lijst via partner-reactie "up" — verwijder reactie, niet partner-rij.
      if (watchlistDeletes.size === 0 && partnerReactedUpIds.has(mediaId)) {
        for (const r of (reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[]) {
          if (
            r.mediaId === mediaId &&
            r.reactingUserId === user.id &&
            r.reaction === "up" &&
            r.id
          ) {
            txs.push(db.tx.filmsPartnerReactions[r.id].delete());
          }
        }
      }

      if (txs.length > 0) await db.transact(txs);
    },
    [
      user,
      groupOwnerId,
      libraryData?.filmsWatchlistItems,
      personalData?.filmsWatchlistItems,
      partnerReactedUpIds,
      reactionsData?.filmsPartnerReactions,
      bumpLocal,
    ],
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
      const row =
        ((libraryData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).find(
          (r) => r.contentId === contentId,
        ) ??
        ((personalData?.filmsWatchedMarks ?? []) as DbWatchedRow[]).find(
          (r) => r.contentId === contentId,
        );
      if (row?.id) await db.transact(db.tx.filmsWatchedMarks[row.id].delete());
    },
    [user, groupOwnerId, libraryData?.filmsWatchedMarks, personalData?.filmsWatchedMarks, bumpLocal],
  );

  const saveSeriesMeta = React.useCallback(
    async (tmdbId: string, meta: SeriesMeta) => {
      const { saveSeriesMeta: saveLocal, getAllSeriesMeta } = await import("@/lib/watched");
      const existingLocal = getAllSeriesMeta()[tmdbId];
      saveLocal(tmdbId, {
        ...meta,
        seasons: meta.seasons ?? existingLocal?.seasons,
      });
      if (!user || !groupOwnerId) {
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

  /** Heeft de huidige gebruiker dit item aan de gedeelde watchlist toegevoegd? */
  const isMediaAddedByCurrentUser = React.useCallback(
    (mediaId: string): boolean => {
      if (!user || !groupOwnerId) return false;
      const isOwner = groupOwnerId === user.id;
      const rows = ((libraryData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).filter(
        (r) =>
          r.mediaId === mediaId &&
          (r.addedByUserId === user.id || (isOwner && !r.addedByUserId)),
      );
      if (rows.length > 0) return true;
      const personalRows = ((personalData?.filmsWatchlistItems ?? []) as DbWatchlistRow[]).filter(
        (r) => r.mediaId === mediaId && r.addedByUserId === user.id,
      );
      return personalRows.length > 0;
    },
    [user, groupOwnerId, libraryData?.filmsWatchlistItems, personalData?.filmsWatchlistItems],
  );

  /**
   * Verwijdert de reactie van de partner (down/seen) zodat het item opnieuw in
   * Watchlist {partner} verschijnt ter goedkeuring.
   */
  const askPartnerToReviewAgain = React.useCallback(
    async (mediaId: string) => {
      if (!user || !groupOwnerId || !partnerUserId) return;
      if (!isMediaAddedByCurrentUser(mediaId)) return;

      const txs: Parameters<typeof db.transact>[0] = [];
      for (const r of (reactionsData?.filmsPartnerReactions ?? []) as DbPartnerReactionRow[]) {
        if (r.mediaId === mediaId && r.reactingUserId === partnerUserId && r.id) {
          txs.push(db.tx.filmsPartnerReactions[r.id].delete());
        }
      }
      if (txs.length > 0) await db.transact(txs);
    },
    [
      user,
      groupOwnerId,
      partnerUserId,
      isMediaAddedByCurrentUser,
      reactionsData?.filmsPartnerReactions,
    ],
  );

  // React to a partner watchlist item: "up" = add to own list, "down" = dismiss, "seen" = already watched
  const reactToPartnerItem = React.useCallback(
    async (mediaId: string, reaction: "up" | "down" | "seen") => {
      if (!user || !groupOwnerId) return;
      // Avoid duplicate reactions
      if (partnerReactedIds.has(mediaId)) return;
      await db.transact(
        db.tx.filmsPartnerReactions[instantId()].update({
          reactingUserId: user.id,
          mediaId,
          reaction,
          groupOwnerId,
        }),
      );
    },
    [user, groupOwnerId, partnerReactedIds],
  );

  return {
    user,
    authLoading,
    dataLoading: authLoading || shareLoading || (user ? (libraryLoading || (groupOwnerId !== user?.id ? personalLoading : false)) : false),
    groupOwnerId,
    ownedShare,
    isShareOwner,
    partnerUserId,
    partnerName,
    partnerAvatarUrl,
    userName,
    userAvatarUrl,
    isFilmsListShared,
    partnerFeedbackByMediaId,
    watchlist,
    ownWatchlist,
    aloneWatchlist,
    togetherWatchlist,
    partnerWatchlist,
    watchedIds,
    watchedSet,
    discoverDismissedIds,
    seriesMeta,
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistScore,
    markWatched,
    unmarkWatched,
    dismissDiscoverItem,
    restoreDiscoverItem,
    saveSeriesMeta,
    reactToPartnerItem,
    isMediaAddedByCurrentUser,
    askPartnerToReviewAgain,
  };
}
