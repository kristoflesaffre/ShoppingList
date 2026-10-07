"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ItemCard } from "@/components/ui/item_card";
import type { RecipeIngredient } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";

type ListVariant = "cards" | "rows";

function SortableIngredientCard({
  ingredient,
  onDelete,
  onEdit,
}: {
  ingredient: RecipeIngredient;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]",
      )}
    >
      <ItemCard
        itemName={ingredient.name}
        quantity={ingredient.quantity}
        state="editable"
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/** Canvas «17 · Recept wijzigen»: rij met greep, foto, naam en hoeveelheid; tik = wijzigen. */
function SortableIngredientRow({
  ingredient,
  first,
  photoUrl,
  onEdit,
}: {
  ingredient: RecipeIngredient;
  first: boolean;
  photoUrl: string | null;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ingredient.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center bg-[var(--white)]",
        !first && !isDragging && "border-t border-[var(--border-subtle)]",
        isDragging && "z-10 rounded-[16px] shadow-[0_14px_28px_-10px_rgba(16,17,48,0.28),0_0_0_1px_var(--blue-100)]",
      )}
    >
      <button
        type="button"
        aria-label={`Verplaats ${ingredient.name}`}
        className={cn(
          "flex h-14 w-8 shrink-0 cursor-grab touch-none items-center justify-center pl-1.5 transition-colors active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
          isDragging ? "text-[var(--blue-500)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-500)]",
        )}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[18px]">
          <circle cx="9" cy="6" r="1.3" />
          <circle cx="15" cy="6" r="1.3" />
          <circle cx="9" cy="12" r="1.3" />
          <circle cx="15" cy="12" r="1.3" />
          <circle cx="9" cy="18" r="1.3" />
          <circle cx="15" cy="18" r="1.3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${ingredient.name}, ${ingredient.quantity} — wijzigen`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-1 pr-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediëntfoto
            <img src={photoUrl} alt="" width={32} height={32} className="size-8 object-contain" decoding="async" />
          ) : (
            <span className="text-sm font-bold text-[var(--blue-500)]">{ingredient.name.trim().charAt(0).toUpperCase()}</span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--text-primary)]">{ingredient.name}</span>
        <span className="shrink-0 text-sm tabular-nums text-[var(--text-secondary)]">{ingredient.quantity}</span>
      </button>
    </div>
  );
}

function RecipeIngredientsSortableBody({
  ingredients,
  onDelete,
  onEdit,
  variant,
}: {
  variant: ListVariant;
  ingredients: RecipeIngredient[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;
  const getPhotoUrl = useIngredientPhotoUrl(160);

  if (variant === "rows") {
    return (
      <SortableContext items={ingredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div>
          {ingredients.map((ing, i) => (
            <SortableIngredientRow
              key={ing.id}
              ingredient={ing}
              first={i === 0}
              photoUrl={getPhotoUrl(ing.name, ing.quantity)}
              onEdit={() => onEdit(ing.id)}
            />
          ))}
        </div>
      </SortableContext>
    );
  }

  return (
    <SortableContext
      items={ingredients.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col gap-3">
        {ingredients.map((ing) => {
          const wrapperClass = isDndActive
            ? ""
            : cn(
                "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                "max-h-[200px] opacity-100",
              );
          return (
            <div key={ing.id} className={wrapperClass}>
              <SortableIngredientCard
                ingredient={ing}
                onDelete={() => onDelete(ing.id)}
                onEdit={() => onEdit(ing.id)}
              />
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
}

export function RecipeIngredientSortableList({
  ingredients,
  onDragEndReorder,
  onDelete,
  onEdit,
  variant = "cards",
}: {
  /** «rows» = rijen in één kaart (recept-editor); «cards» = losse itemkaarten. */
  variant?: ListVariant;
  ingredients: RecipeIngredient[];
  onDragEndReorder: (reordered: RecipeIngredient[]) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ingredients.findIndex((i) => i.id === active.id);
      const newIndex = ingredients.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      onDragEndReorder(arrayMove(ingredients, oldIndex, newIndex));
    },
    [ingredients, onDragEndReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <RecipeIngredientsSortableBody
        variant={variant}
        ingredients={ingredients}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </DndContext>
  );
}
