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
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";

type Row = { id: string; name: string };

function SortableRow({ item, first, onDelete }: { item: Row; first: boolean; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2 bg-[var(--white)] py-2",
        !first && !isDragging && "border-t border-[var(--border-subtle)]",
        isDragging && "z-10 rounded-[16px] shadow-[0_14px_28px_-10px_rgba(16,17,48,0.28),0_0_0_1px_var(--blue-100)]",
      )}
    >
      <button
        type="button"
        aria-label={`Verplaats ${item.name}`}
        className={cn(
          "flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center transition-colors active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          isDragging ? "text-[var(--blue-500)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-500)]",
        )}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[18px]">
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>
      </button>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-text-primary">{item.name}</span>
      <RoundIconButton tone="danger" size={28} aria-label={`${item.name} verwijderen`} onClick={onDelete}>
        {RoundIcons.trash}
      </RoundIconButton>
    </li>
  );
}

/**
 * Bewerkmodus van een vast lijstje zonder kado's (to do, «anders»): rijen met een sleepgreep links en een rode
 * ronde vuilbak rechts (zoals de lijstkaarten). `onReorder` krijgt de ids in hun nieuwe volgorde.
 */
export function VastEditRows({ items, onReorder, onDelete }: { items: Row[]; onReorder: (ids: string[]) => void; onDelete: (id: string) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="m-0 list-none p-0">
          {items.map((item, i) => (
            <SortableRow key={item.id} item={item} first={i === 0} onDelete={() => onDelete(item.id)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
