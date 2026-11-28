"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { CountStepper } from "@/components/ui/count_stepper";
import { OptionTile } from "@/components/ui/option_tile";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { Snackbar } from "@/components/ui/snackbar";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { toIsoDate } from "@/lib/calendar-utils";
import { TAKEOUT_MEAL_CATEGORY, nonShoppingMealLabel } from "@/lib/takeout-meal";
import {
  dayModel,
  isoToDate,
  planningListId,
  sectionForIso,
  stepQuantity,
  stripDays,
  type DayItem,
  type DayMeal,
} from "@/lib/day-meal-edit";

/**
 * Blad «Eten van …» (canvas «Eten bewerken in de kalender» 2, https://claude.ai/artifact/GU4xKr3hQxLYK36SU1Cqhm):
 * één plek om het eten van een dag te wijzigen, vanuit de kalender en «Alles van vandaag». Bovenaan de weekstrook
 * (vandaag + zes dagen), dan GERECHTEN (recept met zijn ingrediënten als chips, «Verplaats», ✕) en ERBIJ (diepvries,
 * afhalen, losse producten met stepper). Toevoegen: recept, diepvries en product via «Items toevoegen» op het lijstje
 * (die dag staat al gekozen), afhalen meteen. Alles staat meteen op het lijstje; verwijderen kan met «Zet terug».
 */

type RawList = Parameters<typeof dayModel>[0][number] & { id?: string; items?: (Record<string, unknown> & { id?: string })[] | null };
type RawRecipe = Parameters<typeof dayModel>[1][number];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const WEEKDAY = ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"];

function dayTitle(iso: string, todayIso: string): string {
  const d = isoToDate(iso);
  if (iso === todayIso) return "Eten van vandaag";
  return `Eten van ${d.toLocaleDateString("nl-NL", { weekday: "long" })}`;
}

const CalendarGlyph = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </svg>
);

type Undo = { message: string; items: { listId: string; fields: Record<string, unknown>; id: string }[] };

/** Items weghalen met «Zet terug» (6 s): de volledige rij wordt bewaard en bij terugzetten opnieuw gekoppeld. */
export function useDayItemRemoval(lists: RawList[]) {
  const [undo, setUndo] = React.useState<Undo | null>(null);
  React.useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(t);
  }, [undo]);
  const rawById = React.useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const list of lists) for (const item of list.items ?? []) if (item.id) map.set(item.id, item as Record<string, unknown>);
    return map;
  }, [lists]);
  const remove = React.useCallback(
    (items: { id: string; listId: string }[], label: string) => {
      if (items.length === 0) return;
      setUndo({
        message: `${capitalize(label)} verwijderd`,
        items: items.map((i) => {
          const raw = { ...(rawById.get(i.id) ?? {}) };
          delete raw.id;
          delete raw.list;
          return { id: i.id, listId: i.listId, fields: raw };
        }),
      });
      void db.transact(items.map((i) => db.tx.items[i.id].delete()));
    },
    [rawById],
  );
  const restore = React.useCallback(() => {
    if (!undo) return;
    void db.transact(undo.items.map((i) => db.tx.items[i.id].update(i.fields as never).link({ list: i.listId })));
    setUndo(null);
  }, [undo]);
  const snackbar = undo ? <Snackbar message={undo.message} actionLabel="Zet terug" onAction={restore} /> : null;
  return { remove, snackbar, clear: () => setUndo(null) };
}

export function DayMealEditor({
  open,
  onClose,
  iso: openIso,
  lists,
  recipes,
}: {
  open: boolean;
  onClose: () => void;
  iso: string;
  lists: RawList[];
  recipes: RawRecipe[];
}) {
  const router = useRouter();
  const photoFor = useItemPhotoUrl(160);
  const todayIso = toIsoDate(new Date());
  const [iso, setIso] = React.useState(openIso);
  const [moving, setMoving] = React.useState<string | null>(null);
  const { remove, snackbar, clear } = useDayItemRemoval(lists);
  React.useEffect(() => {
    if (open) {
      setIso(openIso);
      setMoving(null);
      clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel bij openen
  }, [open, openIso]);

  const days = React.useMemo(() => stripDays(todayIso, openIso), [todayIso, openIso]);
  const model = React.useMemo(() => dayModel(lists, recipes, iso), [lists, recipes, iso]);
  const plannedDays = React.useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      const m = dayModel(lists, recipes, day);
      if (m.meals.length > 0 || m.loose.length > 0) set.add(day);
    }
    return set;
  }, [days, lists, recipes]);
  const dayListId = model.meals[0]?.items[0]?.listId ?? model.loose[0]?.listId ?? null;
  const listId = dayListId ?? planningListId(lists, todayIso);
  const empty = model.meals.length === 0 && model.loose.length === 0;
  // «Items toevoegen» kent enkel dagnamen: die wijzen naar vandaag of de zes dagen erna.
  const canAddViaList = iso >= todayIso && iso <= days[days.length - 1] && Boolean(listId);

  const moveTo = (items: DayItem[], target: string) => {
    setMoving(null);
    void db.transact(items.map((i) => db.tx.items[i.id].update({ section: sectionForIso(target), itemDate: target })));
  };
  const setQuantity = (item: DayItem, quantity: string) => {
    void db.transact(db.tx.items[item.id].update({ quantity }));
  };
  const openAdd = (bron: "recipes" | "stock" | "items") => {
    if (!listId) return;
    onClose();
    router.push(`/lijstje/${listId}?toevoegen=${sectionForIso(iso)}&bron=${bron}`);
  };
  const addTakeout = () => {
    if (!listId) return;
    const list = lists.find((l) => l.id === listId);
    const order = Math.max(0, ...(list?.items ?? []).map((i) => (typeof i.order === "number" ? i.order : 0))) + 1;
    void db.transact(
      db.tx.items[iid()]
        .update({ name: "Frituur", quantity: "1", checked: false, section: sectionForIso(iso), itemDate: iso, order, itemCategory: TAKEOUT_MEAL_CATEGORY, recipeGroupId: "", recipeName: "", recipeLink: "" })
        .link({ list: listId }),
    );
  };

  const movePicker = (key: string, items: DayItem[]) =>
    moving === key ? (
      <div className="flex flex-col gap-2 px-1 pb-1 pt-2">
        <span className="text-[12.5px] font-bold text-[var(--text-secondary)]">Naar welke dag?</span>
        <div className="flex flex-wrap gap-1.5">
          {days
            .filter((d) => d !== iso)
            .map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => moveTo(items, d)}
                className="h-[34px] rounded-pill bg-[var(--white)] px-3 text-[13px] font-bold text-text-primary shadow-[inset_0_0_0_1px_var(--border-subtle)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
              >
                {d === todayIso ? "Vandaag" : capitalize(isoToDate(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }))}
              </button>
            ))}
        </div>
      </div>
    ) : null;

  const moveButton = (key: string, label: string) => (
    <RoundIconButton tone={moving === key ? "primary" : "surface"} size={32} aria-label={`${label} naar een andere dag`} aria-expanded={moving === key} onClick={() => setMoving(moving === key ? null : key)}>
      {CalendarGlyph}
    </RoundIconButton>
  );

  const thumb = (src: string | null, name: string, round = false) => (
    <span className={cn("flex size-[46px] shrink-0 items-center justify-center bg-[var(--white)]", round ? "rounded-full" : "rounded-[12px]")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- recept- of productfoto
        <img src={src} alt="" className={cn("object-contain", round ? "size-[46px] rounded-full object-cover" : "size-[38px]")} />
      ) : (
        <span aria-hidden className="text-[18px] font-bold text-[var(--blue-500)]">{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );

  const recipeMeal = (meal: DayMeal) => {
    const bought = meal.ingredients.filter((i) => i.checked).length;
    return (
      <li key={meal.key} className={cn("rounded-[18px] bg-[var(--gray-25)] p-2.5", moving === meal.key && "shadow-[inset_0_0_0_2px_var(--blue-200)]")}>
        <div className="flex items-center gap-2.5">
          {thumb(meal.photoUrl, meal.name, true)}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-text-primary">{meal.name}</div>
            <div className="text-[12.5px] text-[var(--text-secondary)]">
              {meal.ingredients.length} op je lijstje{bought > 0 ? ` · ${bought} gekocht` : ""}
            </div>
          </div>
          {moveButton(meal.key, meal.name)}
          <RoundIconButton tone="danger" size={28} aria-label={`${meal.name} verwijderen`} onClick={() => remove(meal.items, meal.name)}>
            {RoundIcons.close}
          </RoundIconButton>
        </div>
        {meal.ingredients.length > 0 ? (
          <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0">
            {meal.ingredients.map((ing) => {
              const photo = photoFor(ing.name);
              return (
                <li
                  key={ing.id}
                  className={cn(
                    "inline-flex h-[30px] items-center gap-1.5 rounded-pill bg-[var(--white)] pl-1 text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_var(--border-subtle)]",
                    ing.checked ? "pr-2.5 text-[var(--text-tertiary)]" : "pr-1 text-text-primary",
                  )}
                >
                  <span className="flex size-[22px] items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- productfoto */}
                    {photo ? <img src={photo} alt="" className="size-[22px] object-contain" /> : null}
                  </span>
                  {capitalize(ing.name)}
                  {ing.checked ? (
                    <span aria-label="al gekocht">✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove([ing], ing.name)}
                      aria-label={`${ing.name} weghalen`}
                      className="flex size-[22px] items-center justify-center rounded-full bg-[var(--gray-50)] text-[var(--text-secondary)] [&_svg]:size-3"
                    >
                      {RoundIcons.close}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {movePicker(meal.key, meal.items)}
      </li>
    );
  };

  const extraRow = (key: string, name: string, sub: string, photo: string | null, items: DayItem[], stepItem: DayItem | null) => {
    const count = stepItem ? Number(stepItem.quantity.trim().match(/^\d+/)?.[0] ?? NaN) : NaN;
    const steppable = stepItem && Number.isFinite(count) && stepQuantity(stepItem.quantity, 1) !== null;
    const unit = steppable ? stepItem!.quantity.trim().replace(/^\d+\s*/, "") : "";
    return (
      <li key={key} className={cn("rounded-[16px] bg-[var(--gray-25)] p-2.5", moving === key && "shadow-[inset_0_0_0_2px_var(--blue-200)]")}>
        <div className="flex items-center gap-2.5">
          {thumb(photo, name)}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-text-primary">{name}</div>
            <div className="truncate text-[12.5px] text-[var(--text-secondary)]">{[sub, unit && unit !== "stuk" && unit !== "stuks" ? unit : null].filter(Boolean).join(" · ")}</div>
          </div>
          {moveButton(key, name)}
          {steppable ? (
            <CountStepper
              name={name}
              value={count}
              tone="soft"
              onChange={(next) => (next < 1 ? remove(items, name) : setQuantity(stepItem!, stepQuantity(stepItem!.quantity, next - count) ?? stepItem!.quantity))}
            />
          ) : (
            <RoundIconButton tone="danger" size={28} aria-label={`${name} verwijderen`} onClick={() => remove(items, name)}>
              {RoundIcons.close}
            </RoundIconButton>
          )}
        </div>
        {movePicker(key, items)}
      </li>
    );
  };

  const recipeMeals = model.meals.filter((m) => m.kind === "recipe");
  const otherMeals = model.meals.filter((m) => m.kind !== "recipe");
  const sectionTitle = "m-0 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-tertiary)]";

  const addTiles = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {(
        [
          ["Recept", () => openAdd("recipes"), !canAddViaList],
          ["Uit diepvries", () => openAdd("stock"), !canAddViaList],
          ["Afhaal", addTakeout, !listId],
          ["Product", () => openAdd("items"), !canAddViaList],
        ] as const
      ).map(([label, onClick, disabled]) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-[var(--blue-25)] text-[13.5px] font-bold text-[var(--blue-600)] transition-colors disabled:opacity-40 [@media(hover:hover)]:hover:bg-[var(--blue-50)]"
        >
          <span className="[&_svg]:size-4">{RoundIcons.plus}</span>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={dayTitle(iso, todayIso)}
      titleId="day-meal-editor-title"
      cancelLabel={null}
      footer={
        <Button size="md" onClick={onClose} className="md:w-auto md:px-6">
          Gereed
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <p className="-mt-2 text-[13px] text-[var(--text-secondary)]">
          {capitalize(isoToDate(iso).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }))}
          {" · "}Wat je wijzigt, staat meteen op je lijstje.
        </p>
        <div role="group" aria-label="Dag kiezen" className="flex gap-1">
          {days.map((d) => {
            const date = isoToDate(d);
            const on = d === iso;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setIso(d);
                  setMoving(null);
                }}
                className={cn(
                  "flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[13px] text-text-primary transition-colors",
                  on ? "bg-[var(--white)] shadow-[inset_0_0_0_2px_var(--blue-500)]" : "bg-[var(--gray-25)] [@media(hover:hover)]:hover:bg-[var(--gray-50)]",
                )}
              >
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{d === todayIso ? "VAND." : WEEKDAY[date.getDay()]}</span>
                <b className="text-[15px] font-extrabold leading-none">{date.getDate()}</b>
                <i className={cn("size-[5px] rounded-full", plannedDays.has(d) ? "bg-[var(--blue-500)]" : "bg-transparent")} />
              </button>
            );
          })}
        </div>

        {empty ? (
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <span aria-hidden className="size-[88px] rounded-full border-2 border-dashed border-[var(--border-subtle)]" />
            <span className="text-[17px] font-extrabold text-text-primary">Wat eten we {iso === todayIso ? "vandaag" : isoToDate(iso).toLocaleDateString("nl-NL", { weekday: "long" })}?</span>
            {canAddViaList ? (
              <div className="grid w-full grid-cols-2 gap-2.5">
                <OptionTile icon={RoundIcons.plus} title="Recept" subtitle="Ingrediënten op je lijstje" onClick={() => openAdd("recipes")} />
                <OptionTile icon={RoundIcons.plus} title="Uit diepvries" subtitle="Ontdooitaak de dag ervoor" onClick={() => openAdd("stock")} />
                <OptionTile icon={RoundIcons.plus} title="Afhaal" subtitle="Frituur" onClick={addTakeout} disabled={!listId} />
                <OptionTile icon={RoundIcons.plus} title="Losse producten" subtitle="Zelf samenstellen" onClick={() => openAdd("items")} />
              </div>
            ) : (
              <p className="text-[13.5px] text-[var(--text-secondary)]">Plannen kan voor vandaag en de zes dagen erna.</p>
            )}
          </div>
        ) : (
          <>
            {recipeMeals.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h3 className={sectionTitle}>Gerechten</h3>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">{recipeMeals.map(recipeMeal)}</ul>
              </section>
            ) : null}
            {otherMeals.length + model.loose.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h3 className={sectionTitle}>{recipeMeals.length > 0 ? "Erbij" : `Op het bord · ${otherMeals.length + model.loose.length}`}</h3>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {otherMeals.map((m) =>
                    extraRow(m.key, capitalize(m.name), m.kind === "stock" ? "Uit de diepvries" : nonShoppingMealLabel(m.name), m.photoUrl ?? photoFor(m.name), m.items, null),
                  )}
                  {model.loose.map((item) =>
                    extraRow(item.id, capitalize(item.name), item.checked ? "Al gekocht ✓" : "Los product", item.stockPhotoUrl ?? photoFor(item.name), [item], item),
                  )}
                </ul>
              </section>
            ) : null}
            <section className="flex flex-col gap-2">
              <h3 className={sectionTitle}>Toevoegen</h3>
              {addTiles}
              {!canAddViaList ? <p className="text-[12.5px] text-[var(--text-secondary)]">Recepten en producten toevoegen kan voor vandaag en de zes dagen erna.</p> : null}
            </section>
          </>
        )}
        {snackbar ? <div className="sticky bottom-0 flex justify-center pt-1">{snackbar}</div> : null}
      </div>
    </SlideInModal>
  );
}
