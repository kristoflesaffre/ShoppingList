"use client";

import * as React from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type HomeSectionId,
  HOME_SECTIONS_META,
  DEFAULT_SECTION_ORDER,
  loadHomeSectionConfig,
  saveHomeSectionConfig,
} from "@/lib/home-section-config";

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46677 11.929 3.46677 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** move_item.svg — 32×32 viewBox, same as item_card / list_card / store_order_panel */
function MoveItemIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
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

function RowDivider() {
  return (
    <span className="h-10 w-px shrink-0 bg-[var(--gray-100)]" aria-hidden />
  );
}

function SortableSectionRow({
  id,
  hidden,
  onToggle,
}: {
  id: HomeSectionId;
  hidden: boolean;
  onToggle: (id: HomeSectionId) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = HOME_SECTIONS_META.find((m) => m.id === id);
  if (!meta) return null;

  const hideable = meta.hideable;
  const isChecked = !hidden;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]")}
    >
      <div className="flex w-full items-center gap-4 rounded-[var(--radius-lg,8px)] border border-[var(--gray-100)] bg-white px-4 py-3">
        {/* Checkbox */}
        <Checkbox
          checked={isChecked}
          disabled={!hideable}
          onCheckedChange={() => hideable && onToggle(id)}
          aria-label={isChecked ? `${meta.label} verbergen` : `${meta.label} tonen`}
        />

        <RowDivider />

        {/* Illustration */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.illustration}
          alt=""
          width={40}
          height={40}
          className={cn(
            "size-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] object-cover",
            (!hideable || !isChecked) && "opacity-50",
          )}
          decoding="async"
        />

        {/* Label */}
        <p className={cn(
          "min-w-0 flex-1 text-base leading-6 tracking-normal",
          isChecked ? "font-medium text-[var(--text-primary)]" : "font-normal text-[#8c929d]",
        )}>
          {meta.label}
        </p>

        <RowDivider />

        {/* Drag handle */}
        <button
          type="button"
          className={cn(
            "flex shrink-0 cursor-grab touch-none items-center justify-center text-action-primary transition-colors",
            "[@media(hover:hover)]:hover:text-action-primary-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
            "active:cursor-grabbing",
          )}
          aria-label={`Verplaats sectie ${meta.label}`}
          {...attributes}
          {...listeners}
        >
          <MoveItemIcon />
        </button>
      </div>
    </div>
  );
}

export default function BeheerHomepaginaPage() {
  const [order, setOrder] = React.useState<HomeSectionId[]>(() => {
    const config = loadHomeSectionConfig();
    const known = new Set(config.order);
    const extra = DEFAULT_SECTION_ORDER.filter((id) => !known.has(id));
    return [...config.order, ...extra];
  });

  const [hidden, setHidden] = React.useState<HomeSectionId[]>(
    () => loadHomeSectionConfig().hidden,
  );

  const persist = React.useCallback(
    (nextOrder: HomeSectionId[], nextHidden: HomeSectionId[]) => {
      saveHomeSectionConfig({ order: nextOrder, hidden: nextHidden });
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = order.indexOf(active.id as HomeSectionId);
      const newIndex = order.indexOf(over.id as HomeSectionId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(order, oldIndex, newIndex);
      setOrder(next);
      persist(next, hidden);
    },
    [order, hidden, persist],
  );

  const handleToggle = React.useCallback(
    (id: HomeSectionId) => {
      setHidden((prev) => {
        const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id];
        persist(order, next);
        return next;
      });
    },
    [order, persist],
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Fixed header */}
      <div className="fixed left-0 right-0 top-0 z-50 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_var(--gray-100)]">
        <header className="mx-auto grid h-16 max-w-[956px] grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-4 px-[var(--space-4)]">
          <Link
            href="/"
            aria-label="Terug naar startpagina"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <p className="min-w-0 truncate text-center text-base font-medium leading-6 tracking-normal text-text-primary">
            Beheer homepagina
          </p>
          <span className="size-10 shrink-0" aria-hidden />
        </header>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-[var(--space-4)] pt-8">
          <p className="mb-6 text-base font-light leading-6 tracking-normal text-[var(--text-primary)]">
            Hier kan je de volgorde van de secties wijzigen of secties verbergen.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {order.map((id) => (
                  <SortableSectionRow
                    key={id}
                    id={id}
                    hidden={hidden.includes(id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
