"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { listBucket } from "@/hooks/use_list_items_buckets";

type FullQuery = typeof db.useQuery<{ recipes: { ingredients: {} } }>;
export type RecipeRows = NonNullable<ReturnType<FullQuery>["data"]>["recipes"];
type BucketResult = { key: string; rows: Map<string, RecipeRows[number]["ingredients"]> } | { key: string; error: { message: string } };

function IngredientsBucket({ bucket, ids, onResult }: { bucket: number; ids: string[]; onResult: (bucket: number, result: BucketResult) => void }) {
  const key = ids.join(",");
  const { isLoading, error, data } = db.useQuery({ recipes: { ingredients: {}, $: { where: { id: { $in: ids } } } } });
  React.useEffect(() => {
    if (error) onResult(bucket, { key, error });
    else if (!isLoading && data) {
      const rows = new Map<string, RecipeRows[number]["ingredients"]>();
      for (const r of data.recipes ?? []) rows.set(r.id, r.ingredients);
      onResult(bucket, { key, rows });
    }
  }, [bucket, key, isLoading, error, data, onResult]);
  return null;
}

/**
 * Alle recepten met hun ingrediënten (±250 recepten, ±2.500 ingrediënten). Eén query met alles liep geregeld over de
 * limiet van InstantDB («Operation timed out»); dan bleef `data` leeg en zei «Items toevoegen» → Recepten ten onrechte
 * «Je hebt nog geen recepten toegevoegd». Daarom: één lichte query voor de recepten zelf, de ingrediënten in kleine
 * parallelle deelquery's (zelfde emmers als de lijstjes), en eerder geladen gegevens blijven staan als er één faalt.
 * `loading` is waar tot alles één keer binnen is; toon dan een laadtoestand, nooit een lege staat.
 * `loaders` moet in de render staan.
 */
export function useSavedRecipes(enabled = true) {
  const { isLoading: baseLoading, error: baseError, data: baseData } = db.useQuery(enabled ? { recipes: {} } : null);

  const [base, setBase] = React.useState<typeof baseData>(undefined);
  React.useEffect(() => {
    if (baseData) setBase(baseData);
  }, [baseData]);
  const current = baseData ?? base;

  const groups = React.useMemo(() => {
    const g = new Map<number, string[]>();
    for (const r of current?.recipes ?? []) {
      const b = listBucket(r.id);
      g.set(b, [...(g.get(b) ?? []), r.id]);
    }
    for (const ids of Array.from(g.values())) ids.sort();
    return g;
  }, [current]);

  const [results, setResults] = React.useState<Record<number, BucketResult>>({});
  const onResult = React.useCallback((bucket: number, result: BucketResult) => {
    setResults((prev) => {
      // Een fout wist de ingrediënten die er al waren niet.
      const before = prev[bucket];
      if ("error" in result && before && "rows" in before) return prev;
      return { ...prev, [bucket]: result };
    });
  }, []);

  const ready = !!current && Array.from(groups.keys()).every((b) => results[b] !== undefined);
  const failed = !ready && (!!baseError || Array.from(groups.keys()).some((b) => results[b] && "error" in results[b]));

  const data = React.useMemo(() => {
    if (!current || !ready) return undefined;
    const ingredients = new Map<string, RecipeRows[number]["ingredients"]>();
    for (const b of Array.from(groups.keys())) {
      const r = results[b];
      if (r && "rows" in r) r.rows.forEach((rows, id) => ingredients.set(id, rows));
    }
    return { recipes: current.recipes.map((r) => ({ ...r, ingredients: ingredients.get(r.id) ?? [] })) as unknown as RecipeRows };
  }, [current, ready, groups, results]);

  const loaders = (
    <>
      {Array.from(groups.entries()).map(([bucket, ids]) => (
        <IngredientsBucket key={bucket} bucket={bucket} ids={ids} onResult={onResult} />
      ))}
    </>
  );

  return { data, loading: enabled && !data && !failed && (baseLoading || !!current), failed, loaders };
}
