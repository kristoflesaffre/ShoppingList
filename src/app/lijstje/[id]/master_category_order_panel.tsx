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
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

/** Zelfde pictogram als ItemCard / ListCard — public/icons/move_item.svg, 32×32. */
function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-8 shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.062 8.19952C18.062 7.90252 18.303 7.66152 18.6 7.66152H25.5C25.797 7.66152 26.038 7.90252 26.038 8.19952C26.038 8.49652 25.797 8.73752 25.5 8.73752H18.6C18.303 8.73752 18.062 8.49652 18.062 8.19952ZM25.5 13.7615H18.6C18.303 13.7615 18.062 14.0025 18.062 14.2995C18.062 14.5965 18.303 14.8375 18.6 14.8375H25.5C25.797 14.8375 26.038 14.5965 26.038 14.2995C26.038 14.0025 25.797 13.7615 25.5 13.7615ZM25.5 19.7615H18.6C18.303 19.7615 18.062 20.0025 18.062 20.2995C18.062 20.5965 18.303 20.8375 18.6 20.8375H25.5C25.797 20.8375 26.038 20.5965 26.038 20.2995C26.038 20.0025 25.797 19.7615 25.5 19.7615ZM12.075 16.5145C11.862 16.3075 11.522 16.3115 11.315 16.5255C11.108 16.7385 11.113 17.0785 11.326 17.2855L13.874 19.7615H12.6C9.53304 19.7615 7.03804 17.2665 7.03804 14.1995C7.03804 11.0805 9.48104 8.63752 12.6 8.63752H15.2C15.497 8.63752 15.738 8.39652 15.738 8.09952C15.738 7.80252 15.497 7.56152 15.2 7.56152H12.6C8.87804 7.56152 5.96204 10.4775 5.96204 14.1995C5.96204 17.8595 8.94004 20.8375 12.6 20.8375H13.928L11.414 23.4255C11.207 23.6385 11.212 23.9795 11.425 24.1865C11.529 24.2885 11.664 24.3385 11.8 24.3385C11.94 24.3385 12.08 24.2835 12.186 24.1755L15.586 20.6755C15.793 20.4625 15.788 20.1215 15.575 19.9145L12.075 16.5145Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma ItemCard: verticale scheidlijn tussen handle en tekst. */
function RowDivider() {
  return (
    <span
      className="relative flex h-[44px] w-0 min-w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-0 h-[44px] w-px -translate-x-1/2 bg-[var(--gray-100)]" />
    </span>
  );
}

/**
 * Figma 508:1729 / lijst-item bewerkmodus: rd-8, border neutrals/100, wit, gap-12, pl-16 pr-12 py-12,
 * sleepgreep + divider + titel (zelfde basis als ItemCard editable).
 */
function SortableCategoryRow({ title }: { title: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: title });

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
      <div
        className={cn(
          "flex w-full min-w-0 min-h-[68px] items-center gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] py-3 pl-4 pr-3",
        )}
      >
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className={cn(
              "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-pill p-1 text-[var(--blue-500)] transition-colors",
              "hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "active:cursor-grabbing",
            )}
            aria-label={`Verplaats categorie ${title}`}
            {...attributes}
            {...listeners}
          >
            <ReorderIcon />
          </button>
          <RowDivider />
        </div>
        <p className="min-w-0 flex-1 truncate font-medium text-base leading-24 tracking-normal text-[var(--text-primary)]">
          {title}
        </p>
      </div>
    </div>
  );
}

export function MasterCategoryOrderPanel({
  categories,
  listId,
}: {
  categories: string[];
  listId: string;
}) {
  const [order, setOrder] = React.useState(categories);
  React.useEffect(() => {
    setOrder(categories);
  }, [categories]);

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
      if (!listId) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = order.findIndex((t) => t === active.id);
      const newIndex = order.findIndex((t) => t === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(order, oldIndex, newIndex);
      setOrder(next);
      void db.transact(
        db.tx.lists[listId].update({
          masterCategoryOrderJson: JSON.stringify(next),
        }),
      );
    },
    [order, listId],
  );

  if (order.length === 0) {
    return (
      <p className="text-sm font-normal leading-20 text-[var(--text-tertiary)]">
        Geen categorieën om te ordenen.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3" aria-label="Categorieën">
          {order.map((title) => (
            <li key={title}>
              <SortableCategoryRow title={title} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
