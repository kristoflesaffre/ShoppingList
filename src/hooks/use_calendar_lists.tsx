"use client";

import * as React from "react";
import { db } from "@/lib/db";
import type { buildCalendarEntries } from "@/lib/calendar-utils";
import { useListItemsBuckets } from "@/hooks/use_list_items_buckets";

type CalendarLists = Parameters<typeof buildCalendarEntries>[0];
type CalendarRecipes = Parameters<typeof buildCalendarEntries>[1];

/**
 * Lijstjes met hun items + receptnamen en -foto's voor de kalender. Alle lijstjes mét items in één query
 * duurde ±4 s (99 lijstjes, 3.000 items) en liep geregeld over de limiet van InstantDB; dan bleef de
 * kalender leeg («Nog niets gepland») terwijl er wel eten gepland stond. Daarom dezelfde kleine
 * deelquery's als de startpagina (`useListItemsBuckets`), en de laatst geladen gegevens blijven staan als
 * een query even faalt. `loaders` moet in elke render-tak staan.
 */
export function useCalendarLists(ownerId: string | undefined) {
  const { isLoading: baseLoading, data: baseData } = db.useQuery(
    ownerId
      ? {
          lists: { $: { where: { ownerId } } },
          // buildCalendarEntries gebruikt enkel naam en foto.
          recipes: { $: { fields: ["name", "photoUrl"] } },
        }
      : null,
  );

  // Laatste geslaagde antwoord bewaren: een fout of herverbinding geeft even geen `data`.
  const [base, setBase] = React.useState<typeof baseData>(undefined);
  React.useEffect(() => {
    if (baseData) setBase(baseData);
  }, [baseData]);
  const current = baseData ?? base;

  const listIds = React.useMemo(() => (current?.lists ?? []).map((l) => l.id), [current]);
  const { itemsByList, ready, loaders } = useListItemsBuckets(listIds);

  const data = React.useMemo(() => {
    if (!current || !ready) return undefined;
    return {
      lists: (current.lists ?? [])
        .filter((l) => itemsByList.has(l.id))
        .map((l) => ({ ...l, items: itemsByList.get(l.id) ?? [] })) as unknown as CalendarLists,
      recipes: (current.recipes ?? []) as unknown as CalendarRecipes,
    };
  }, [current, ready, itemsByList]);

  const isLoading = !data && (baseLoading || !!current);
  return { data, isLoading, loaders };
}
