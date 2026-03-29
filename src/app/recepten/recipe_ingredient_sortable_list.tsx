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

function RecipeIngredientsSortableBody({
  ingredients,
  onDelete,
  onEdit,
}: {
  ingredients: RecipeIngredient[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;

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
}: {
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
        ingredients={ingredients}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </DndContext>
  );
}
