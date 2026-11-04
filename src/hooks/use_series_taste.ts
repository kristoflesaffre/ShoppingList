"use client";

import * as React from "react";
import { id as instantId } from "@instantdb/react";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { db } from "@/lib/db";
import {
  TASTE_UNSEEN_ID,
  autoLikedSeriesIds,
  effectiveRatings,
  isTasteLevel,
  parseTasteMediaId,
  parseUnseenList,
  recommendSeries,
  tasteMediaId,
  tasteProfile,
  type TasteLevel,
  type TasteRecommendation,
  type TasteSeries,
} from "@/lib/series-taste";

type Row = { id: string; reactingUserId: string; mediaId: string; reaction: string };

/** Per bezoek één keer ophalen; banner, overzicht en detailpagina delen het resultaat. */
let catalogPromise: Promise<TasteSeries[]> | null = null;

function fetchTasteCatalog(): Promise<TasteSeries[]> {
  if (!catalogPromise) {
    catalogPromise = fetch("/data/series-taste-catalog.json")
      .then((r) => {
        if (!r.ok) throw new Error(`catalog ${r.status}`);
        return r.json() as Promise<{ series: TasteSeries[] }>;
      })
      .then((d) => d.series ?? [])
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

const EXTRA_CHUNK = 40;

/** Series die je beoordeelde of zag maar die niet in de catalogus staan. */
function useExtraSeries(ids: readonly number[]) {
  const [loaded, setLoaded] = React.useState<Map<number, TasteSeries>>(new Map());
  const requested = React.useRef(new Set<number>());
  const key = ids.join(",");
  React.useEffect(() => {
    const todo = ids.filter((id) => !requested.current.has(id));
    if (todo.length === 0) return;
    todo.forEach((id) => requested.current.add(id));
    for (let i = 0; i < todo.length; i += EXTRA_CHUNK) {
      fetch(`/api/films/taste-series?ids=${todo.slice(i, i + EXTRA_CHUNK).join(",")}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ series: TasteSeries[] }>) : { series: [] }))
        .then((d) =>
          setLoaded((prev) => {
            const next = new Map(prev);
            for (const s of d.series) next.set(s.id, s);
            return next;
          }),
        )
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return loaded;
}

export type RatedSeries = TasteSeries & { level: TasteLevel; auto: boolean };

/**
 * Jouw seriesmaak: oordelen lezen en bewaren, de series die vanzelf meetellen, en wat je waarschijnlijk
 * goed zal vinden. Oordelen zijn per persoon; wat je volgt en zag deel je met je partner.
 */
export function useSeriesTaste({ recommend = false }: { recommend?: boolean } = {}) {
  const { user, groupOwnerId, watchedIds, watchlist, dataLoading, seriesMeta, saveSeriesMeta } = useFilmsLibrary();
  const [catalog, setCatalog] = React.useState<TasteSeries[] | null>(null);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(() => {
    setError(false);
    fetchTasteCatalog().then(setCatalog, () => setError(true));
  }, []);
  React.useEffect(load, [load]);

  const query = React.useMemo(
    () =>
      user && groupOwnerId
        ? ({
            filmsPartnerReactions: {
              // Ook de eigen groep: na het delen van een lijstje blijven je oordelen van vroeger gelden.
              $: { where: { groupOwnerId: { $in: Array.from(new Set([groupOwnerId, user.id])) } } },
            },
          } as unknown as Parameters<typeof db.useQuery>[0])
        : null,
    [user, groupOwnerId],
  );
  const { data, isLoading: rowsLoading } = db.useQuery(query);
  const rows = React.useMemo(
    () => ((data?.filmsPartnerReactions ?? []) as Row[]).filter((r) => r.reactingUserId === user?.id && r.mediaId.startsWith("taste-")),
    [data?.filmsPartnerReactions, user?.id],
  );

  const explicit = React.useMemo(() => {
    const out = new Map<number, TasteLevel>();
    for (const r of rows) {
      const id = parseTasteMediaId(r.mediaId);
      if (id !== null && isTasteLevel(r.reaction)) out.set(id, r.reaction);
    }
    return out;
  }, [rows]);

  const unseenRow = React.useMemo(() => rows.find((r) => r.mediaId === TASTE_UNSEEN_ID) ?? null, [rows]);
  const unseenIds = React.useMemo(() => new Set(parseUnseenList(unseenRow?.reaction)), [unseenRow?.reaction]);

  const auto = React.useMemo(() => autoLikedSeriesIds(watchedIds), [watchedIds]);
  const ratings = React.useMemo(() => effectiveRatings(explicit, auto, unseenIds), [explicit, auto, unseenIds]);

  const catalogById = React.useMemo(() => new Map((catalog ?? []).map((s) => [s.id, s])), [catalog]);
  const missingIds = React.useMemo(
    () => (catalog ? Array.from(ratings.keys()).filter((id) => !catalogById.has(id)).sort((a, b) => a - b) : []),
    [catalog, catalogById, ratings],
  );
  const extra = useExtraSeries(missingIds);

  const getSeries = React.useCallback((id: number) => catalogById.get(id) ?? extra.get(id) ?? null, [catalogById, extra]);

  /** Alle beoordeelde series: hoogste oordeel en dan de bekendste eerst. */
  const rated = React.useMemo((): RatedSeries[] => {
    const out: RatedSeries[] = [];
    ratings.forEach((rating, id) => {
      const series = getSeries(id);
      const meta = seriesMeta[String(id)];
      if (series) out.push({ ...series, ...rating });
      else if (meta)
        out.push({
          id,
          n: meta.title,
          y: Number(meta.year) || null,
          p: meta.posterUrl?.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/\w+/, "") ?? null,
          r: 0,
          v: 0,
          s: null,
          l: null,
          g: [],
          c: [],
          w: [],
          k: [],
          ...rating,
        });
    });
    const order: Record<TasteLevel, number> = { top: 0, great: 1, good: 2, no: 3 };
    return out.sort((a, b) => order[a.level] - order[b.level] || b.v - a.v);
  }, [ratings, getSeries, seriesMeta]);

  const onWatchlist = React.useMemo(() => {
    const ids = new Set<number>();
    for (const item of watchlist) {
      const m = /^tv-(\d+)$/.exec(item.id);
      if (m) ids.add(Number(m[1]));
    }
    return ids;
  }, [watchlist]);

  const recommendations = React.useMemo((): TasteRecommendation[] => {
    if (!catalog || !recommend) return [];
    return recommendSeries(catalog, ratings, onWatchlist, 24, Array.from(extra.values()));
  }, [catalog, recommend, ratings, onWatchlist, extra]);

  const profile = React.useMemo(() => tasteProfile(rated, ratings), [rated, ratings]);

  const writeRate = React.useCallback(
    async (tmdbId: number, level: TasteLevel | null) => {
      if (!user || !groupOwnerId) return;
      const mediaId = tasteMediaId(tmdbId);
      const existing = rows.filter((r) => r.mediaId === mediaId);
      const txs: Parameters<typeof db.transact>[0] = existing.slice(level ? 1 : 0).map((r) => db.tx.filmsPartnerReactions[r.id].delete());
      if (level) {
        txs.push(
          db.tx.filmsPartnerReactions[existing[0]?.id ?? instantId()].update({ reactingUserId: user.id, mediaId, reaction: level, groupOwnerId }),
        );
      }
      if (txs.length > 0) await db.transact(txs);
    },
    [user, groupOwnerId, rows],
  );

  /** De lijst loopt voor op de database: snel na elkaar tikken mag niets kwijtspelen. */
  const unseenRef = React.useRef<Set<number> | null>(null);
  const unseenKey = unseenRow?.reaction ?? "";
  React.useEffect(() => {
    unseenRef.current = null;
  }, [unseenKey]);
  const unseenRowId = React.useRef<string | null>(null);
  if (unseenRow) unseenRowId.current = unseenRow.id;

  const writeUnseen = React.useCallback(
    async (tmdbId: number, value: boolean) => {
      if (!user || !groupOwnerId) return;
      const next = new Set(unseenRef.current ?? unseenIds);
      if (next.has(tmdbId) === value) return;
      if (value) next.add(tmdbId);
      else next.delete(tmdbId);
      unseenRef.current = next;
      if (!unseenRowId.current) unseenRowId.current = instantId();
      await db.transact(
        db.tx.filmsPartnerReactions[unseenRowId.current].update({
          reactingUserId: user.id,
          mediaId: TASTE_UNSEEN_ID,
          reaction: Array.from(next).join(","),
          groupOwnerId,
        }),
      );
    },
    [user, groupOwnerId, unseenIds],
  );

  /** Oordeel geven of wijzigen. Series buiten de catalogus krijgen hun titel en poster mee. */
  const rate = React.useCallback(
    async (tmdbId: number, level: TasteLevel, info?: { title: string; year: string; posterUrl: string | null }) => {
      if (info && !catalogById.has(tmdbId) && !seriesMeta[String(tmdbId)]) await saveSeriesMeta(String(tmdbId), info);
      await writeRate(tmdbId, level);
      await writeUnseen(tmdbId, false);
    },
    [catalogById, seriesMeta, saveSeriesMeta, writeRate, writeUnseen],
  );

  /** «Niet gezien»: geen oordeel, en niet meer vragen. */
  const markUnseen = React.useCallback(
    async (tmdbId: number) => {
      await writeRate(tmdbId, null);
      await writeUnseen(tmdbId, true);
    },
    [writeRate, writeUnseen],
  );

  /** Terug naar hoe het was (voor «Vorige»). */
  const restore = React.useCallback(
    async (tmdbId: number, level: TasteLevel | null, wasUnseen: boolean) => {
      await writeRate(tmdbId, level);
      await writeUnseen(tmdbId, wasUnseen);
    },
    [writeRate, writeUnseen],
  );

  return {
    loading: !error && (catalog === null || dataLoading || (query !== null && rowsLoading)),
    error,
    retry: load,
    catalog,
    getSeries,
    explicit,
    auto,
    unseenIds,
    ratings,
    rated,
    recommendations,
    profile,
    rate,
    markUnseen,
    restore,
  };
}
