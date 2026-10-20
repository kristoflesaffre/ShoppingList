"use client";

import * as React from "react";
import { db } from "@/lib/db";

/** Vaste emmers op de eerste hex-letter van de id: een nieuw lijstje verandert maar één deelquery. */
const BUCKETS = 10;

export function listBucket(id: string): number {
  const n = parseInt(id.charAt(0), 16);
  return Number.isNaN(n) ? 0 : n % BUCKETS;
}

type ItemRow = { id: string } & Record<string, unknown>;
type BucketResult = { key: string; items: Map<string, ItemRow[]> } | { key: string; error: { message: string } };

function ItemsBucket({ bucket, ids, onResult }: { bucket: number; ids: string[]; onResult: (bucket: number, result: BucketResult) => void }) {
  const key = ids.join(",");
  const { isLoading, error, data } = db.useQuery({ lists: { items: {}, $: { where: { id: { $in: ids } } } } });
  React.useEffect(() => {
    if (error) onResult(bucket, { key, error });
    else if (!isLoading && data) {
      const items = new Map<string, ItemRow[]>();
      for (const l of data.lists ?? []) items.set(l.id, (l.items ?? []) as unknown as ItemRow[]);
      onResult(bucket, { key, items });
    }
  }, [bucket, key, isLoading, error, data, onResult]);
  return null;
}

/**
 * Items van de lijstjes in kleine, parallelle deelquery’s. Alle lijstjes mét items in één query duurde
 * server-side ±4 s (85 lijstjes, 2.600 items) en liep na het terugkeren uit de achtergrond over de limiet:
 * «Operation timed out: handle-receive». Per emmer blijft het ±1 s.
 *
 * `ready` wordt pas waar als elke emmer één keer geantwoord heeft; daarna blijven de vorige items staan terwijl
 * een emmer herlaadt. `itemsByList` bevat enkel lijstjes waarvan de items geladen zijn — de rest nog niet tonen,
 * zodat niets een lijstje «leeg» ziet dat het niet is. `loaders` moet in elke render-tak staan.
 */
export function useListItemsBuckets(listIds: string[]) {
  const groups = React.useMemo(() => {
    const g = new Map<number, string[]>();
    for (const id of Array.from(new Set(listIds)).sort()) {
      const b = listBucket(id);
      g.set(b, [...(g.get(b) ?? []), id]);
    }
    return g;
  }, [listIds]);

  const [results, setResults] = React.useState<Record<number, BucketResult>>({});
  const onResult = React.useCallback((bucket: number, result: BucketResult) => {
    setResults((prev) => (prev[bucket] === result ? prev : { ...prev, [bucket]: result }));
  }, []);

  const ready = Array.from(groups.keys()).every((b) => results[b] !== undefined);
  const error = Array.from(groups.keys()).map((b) => results[b]).find((r): r is Extract<BucketResult, { error: unknown }> => !!r && "error" in r)?.error ?? null;

  const itemsByList = React.useMemo(() => {
    const all = new Map<string, ItemRow[]>();
    for (const b of Array.from(groups.keys())) {
      const r = results[b];
      if (r && "items" in r) r.items.forEach((items, id) => all.set(id, items));
    }
    return all;
  }, [groups, results]);

  const loaders = (
    <>
      {Array.from(groups.entries()).map(([bucket, ids]) => (
        <ItemsBucket key={bucket} bucket={bucket} ids={ids} onResult={onResult} />
      ))}
    </>
  );

  return { itemsByList, ready, error, loaders };
}
